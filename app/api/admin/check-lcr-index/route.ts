// CAPMOON_DIAG_CHECK_LCR_INDEX_V1_2026_05_25
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'lender_change_requests'
    `;
    const rowCount = await sql`SELECT COUNT(*) AS n FROM lender_change_requests`;
    const uniqueIds = await sql`
      SELECT COUNT(DISTINCT data->>'id') AS n FROM lender_change_requests
    `;
    return NextResponse.json({
      indexes,
      totalRows: Number(rowCount[0]?.n ?? 0),
      uniqueIds: Number(uniqueIds[0]?.n ?? 0),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
