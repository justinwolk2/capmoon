import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const results: any = {};
  const fixes = [
    sql`ALTER TABLE lender_documents ALTER COLUMN deal_id TYPE bigint`,
    sql`ALTER TABLE lender_submissions ALTER COLUMN deal_id TYPE bigint`,
    sql`ALTER TABLE submission_messages ALTER COLUMN deal_id TYPE bigint`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS deal_number text DEFAULT ''`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS uploaded_by_role text DEFAULT 'admin'`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS lender_name text DEFAULT ''`,
  ];
  for (const fix of fixes) {
    try { await fix; } catch(e: any) { results[e.message] = "skipped"; }
  }
  return NextResponse.json({ success: true, results });
}
