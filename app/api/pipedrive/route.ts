import { NextRequest, NextResponse } from "next/server";

const PD_TOKEN = process.env.PIPEDRIVE_API_TOKEN!;
const PD_BASE = "https://api.pipedrive.com/v1";
const PIPELINE_ID = 2;

// CapMoon status → Pipedrive stage ID
const STAGE_MAP: Record<string, number> = {
  "pending":              6,  // Proposed Deal
  "assigned":             7,  // In discussions with CapMoon
  "sent-to-lenders":      8,  // Signed/Out to Market
  "term-sheet-accepted":  9,  // Term Sheet signed and accepted
  "closed":               10, // Closing
};

// CapMoon advisor email → Pipedrive user ID
const USER_MAP: Record<string, number> = {
  "justin.wolk@capmoon.com":  23784915,
  "lpalumbo@capmoon.com":     24865896,
  "shussain@capmoon.com":     24865885,
};

async function pd(path: string, method = "GET", body?: any) {
  const url = `${PD_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${PD_TOKEN}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { action, deal, users } = await req.json();

    // ── Create deal in Pipedrive ──────────────────────────────────────────────
    if (action === "create") {
      const asset = deal.assets?.[0];
      const title = `${deal.dealNumber ? deal.dealNumber + " — " : ""}${asset?.assetType || "CRE"} — ${asset?.address?.city || ""}${asset?.address?.state ? ", " + asset.address.state : ""} — ${asset?.loanAmount || "TBD"}`;

      // Find the Pipedrive user for the assigned advisor
      let ownerId: number | undefined;
      if (deal.assignedAdvisorIds?.length > 0 && users) {
        const advisor = users.find((u: any) => deal.assignedAdvisorIds.includes(u.teamMemberId) || deal.assignedAdvisorIds.includes(u.id));
        if (advisor) ownerId = USER_MAP[advisor.username];
      }
      // Default to Justin if no advisor found
      if (!ownerId) ownerId = USER_MAP["justin.wolk@capmoon.com"];

      const stageId = STAGE_MAP[deal.status] || 6;

      const pdDeal = {
        title,
        stage_id: stageId,
        pipeline_id: PIPELINE_ID,
        user_id: ownerId,
        value: asset?.loanAmount ? parseInt(asset.loanAmount.replace(/[^0-9]/g, "")) || 0 : 0,
        currency: "USD",
        "e8a9e2e5a5e08d1e8d2e6a3b7f4c9d0e1f2a3b4": deal.dealNumber || "", // custom field for deal number
      };

      const result = await pd("/deals", "POST", pdDeal);

      if (result.success && result.data?.id) {
        // Add a note with deal details
        const noteBody = [
          `Deal #: ${deal.dealNumber || "—"}`,
          `Borrower: ${deal.seekerName || "—"}`,
          `Capital Type: ${deal.capitalType || "—"}`,
          `Asset Type: ${asset?.assetType || "—"}`,
          `Loan Amount: ${asset?.loanAmount || "—"}`,
          `Property Value: ${asset?.propertyValue || "—"}`,
          `Address: ${asset?.address?.street || ""} ${asset?.address?.city || ""} ${asset?.address?.state || ""}`.trim(),
          `CapMoon Deal ID: ${deal.id}`,
        ].join("\n");

        await pd("/notes", "POST", {
          content: noteBody,
          deal_id: result.data.id,
          pinned_to_deal_flag: true,
        });

        return NextResponse.json({ success: true, pipedriveId: result.data.id });
      }

      return NextResponse.json({ success: false, error: result.error || "Failed to create deal" }, { status: 400 });
    }

    // ── Update deal stage in Pipedrive ────────────────────────────────────────
    if (action === "update-stage") {
      const { pipedriveId, status } = deal;
      if (!pipedriveId) return NextResponse.json({ success: false, error: "No Pipedrive ID" });

      const stageId = STAGE_MAP[status];
      if (!stageId) return NextResponse.json({ success: false, error: "Unknown status" });

      const result = await pd(`/deals/${pipedriveId}`, "PUT", { stage_id: stageId });
      return NextResponse.json({ success: result.success });
    }

    // ── Get all deals from Pipedrive (for backwards sync) ────────────────────
    if (action === "list") {
      const result = await pd(`/deals?pipeline_id=${PIPELINE_ID}&limit=100`);
      return NextResponse.json({ success: true, deals: result.data || [] });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

  } catch (e: any) {
    console.error("Pipedrive error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "users") {
      const result = await pd("/users");
      return NextResponse.json({ success: true, users: result.data || [] });
    }

    if (action === "stages") {
      const result = await pd(`/stages?pipeline_id=${PIPELINE_ID}`);
      return NextResponse.json({ success: true, stages: result.data || [] });
    }

    // List all Pipedrive deals for backwards sync
    const result = await pd(`/deals?pipeline_id=${PIPELINE_ID}&limit=100&status=all_not_deleted`);
    return NextResponse.json({ success: true, deals: result.data || [] });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
