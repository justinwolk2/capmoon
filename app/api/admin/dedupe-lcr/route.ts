// CAPMOON_LCR_DEDUPE_DETAIL_V1_2026_05_24 — one-time cleanup endpoint
// Reads all rows from lender_change_requests, dedupes by id (keeps first),
// wipes the table and reinserts the deduplicated set.

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const rows = await sql`SELECT data FROM lender_change_requests`;
    const items = rows.map((r: any) => r.data);
    const seen = new Set<string>();
    const deduped: any[] = [];
    let droppedDupes = 0;
    for (const item of items) {
      const key = String(item?.id ?? "");
      if (!key) continue;
      if (seen.has(key)) { droppedDupes++; continue; }
      seen.add(key);
      deduped.push(item);
    }
    await sql`DELETE FROM lender_change_requests`;
    for (const item of deduped) {
      await sql`INSERT INTO lender_change_requests (data) VALUES (${JSON.stringify(item)})`;
    }
    console.log(`[CAPMOON_LCR_DEDUPE] before=${items.length} after=${deduped.length} dropped=${droppedDupes}`);
    return NextResponse.json({ before: items.length, after: deduped.length, droppedDupes });
  } catch (err: any) {
    console.error("[CAPMOON_LCR_DEDUPE] error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
