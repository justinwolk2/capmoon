import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { dealId, dealNumber, borrowerName, borrowerEmail, requestedBy, requestedByRole, documentsNeeded } = body;

  try {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    await sql`INSERT INTO document_requests
      (deal_id, deal_number, borrower_name, borrower_email, requested_by, requested_by_role, documents_needed, token, status, created_at)
      VALUES (${dealId}, ${dealNumber || ""}, ${borrowerName}, ${borrowerEmail || ""}, ${requestedBy}, ${requestedByRole || "advisor"}, ${documentsNeeded}, ${token}, 'pending', NOW())`;

    // Send email if borrowerEmail provided
    if (borrowerEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_URL || "https://capmoon.vercel.app";
      const uploadLink = `${baseUrl}/upload/${token}`;
      await fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: borrowerEmail,
          subject: `Document Request — Deal ${dealNumber || dealId}`,
          html: `
            <div style="font-family:Montserrat,sans-serif;max-width:600px;margin:0 auto;background:#f0f2f5;padding:40px 20px;">
              <div style="background:#0a1f44;border-radius:12px;padding:28px 32px;margin-bottom:24px;">
                <div style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">CapMoon · Document Request</div>
                <div style="font-size:20px;font-weight:800;color:white;margin-bottom:6px;">Documents Needed for Deal ${dealNumber || dealId}</div>
                <div style="font-size:12px;color:rgba(255,255,255,0.55);">Requested by ${requestedBy}</div>
              </div>
              <div style="background:white;border-radius:12px;padding:28px;margin-bottom:16px;">
                <p style="font-size:14px;color:#333;line-height:1.7;margin-bottom:16px;">
                  Dear ${borrowerName}, the following documents are needed for your deal:
                </p>
                <ul style="font-size:14px;color:#0a1f44;margin-bottom:20px;padding-left:20px;">
                  ${documentsNeeded.map((d: string) => `<li style="margin-bottom:6px;"><strong>${d}</strong></li>`).join("")}
                </ul>
                <a href="${uploadLink}" style="display:block;text-align:center;background:#0a1f44;color:white;padding:16px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">
                  Upload Documents →
                </a>
                <p style="font-size:12px;color:#999;text-align:center;margin-top:12px;">Or visit: ${uploadLink}</p>
              </div>
              <div style="text-align:center;font-size:11px;color:#aaa;">CapMoon, LLC · Confidential</div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true, token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  const token = req.nextUrl.searchParams.get("token");
  try {
    if (token) {
      const r = await sql`SELECT * FROM document_requests WHERE token = ${token} LIMIT 1`;
      return NextResponse.json(r[0] || null);
    }
    if (dealId) {
      const r = await sql`SELECT * FROM document_requests WHERE deal_id = ${parseInt(dealId)} ORDER BY created_at DESC`;
      return NextResponse.json(r);
    }
    return NextResponse.json([]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
