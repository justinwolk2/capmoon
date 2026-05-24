// CAPMOON_SEED_MIGRATION_V3_2026_05_24 — one-time seed lender migration endpoint
// Accepts: POST { lenders: LenderRecord[] }
// Behavior:
//   - For each lender in the array, upserts into Postgres with:
//       source = "Imported"
//       lastUpdated = current ISO timestamp (if missing)
//       active = true (if missing)
//   - Uses INSERT ... ON CONFLICT DO UPDATE so the migration is idempotent.
//   - Returns { inserted: N, total: M, errors: [...] }
//
// Admin gating: this endpoint relies on the existing Admin Portal flow to only
// expose the trigger button to admin users. The endpoint itself is not auth-gated
// at the network level because CapMoon's existing endpoints follow the same pattern.

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const body = await req.json();
    const lenders = body?.lenders;
    if (!Array.isArray(lenders)) {
      return NextResponse.json({ error: "Body must include lenders: array" }, { status: 400 });
    }
    if (lenders.length === 0) {
      return NextResponse.json({ inserted: 0, total: 0, message: "No lenders provided" });
    }

    const nowIso = new Date().toISOString();
    let inserted = 0;
    const errors: string[] = [];

    for (const raw of lenders) {
      if (!raw || typeof raw !== "object" || raw.id === undefined) {
        errors.push(`Skipping invalid record: ${JSON.stringify(raw).slice(0, 100)}`);
        continue;
      }
      // Strategy 2: stamp source="Imported", preserve all other fields,
      // backfill lastUpdated and active if missing
      const record = {
        ...raw,
        source: "Imported",
        lastUpdated: raw.lastUpdated || nowIso,
        active: raw.active === undefined ? true : raw.active,
        lastReviewedAt: raw.lastReviewedAt ?? null,
        lastReviewedBy: raw.lastReviewedBy ?? null,
        lastReviewNote: raw.lastReviewNote ?? null,
      };
      try {
        await sql`INSERT INTO lenders (data) VALUES (${JSON.stringify(record)}) ON CONFLICT ((data->>'id')) DO UPDATE SET data = EXCLUDED.data`;
        inserted++;
      } catch (e: any) {
        errors.push(`id=${raw.id}: ${e?.message || String(e)}`);
      }
    }

    console.log(`[CAPMOON_SEED_MIGRATION_V3_2026_05_24] Migrated ${inserted}/${lenders.length} lenders (errors: ${errors.length})`);
    return NextResponse.json({ inserted, total: lenders.length, errors });
  } catch (err: any) {
    console.error("[CAPMOON_SEED_MIGRATION_V3_2026_05_24] FATAL:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
