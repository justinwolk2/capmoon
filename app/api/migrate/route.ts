import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const fixes = [
    sql`ALTER TABLE lender_documents ALTER COLUMN deal_id TYPE bigint`,
    sql`ALTER TABLE lender_submissions ALTER COLUMN deal_id TYPE bigint`,
    sql`ALTER TABLE submission_messages ALTER COLUMN deal_id TYPE bigint`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS deal_number text DEFAULT ''`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS uploaded_by text DEFAULT ''`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS uploaded_by_role text DEFAULT 'admin'`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS lender_name text DEFAULT ''`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'Other'`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS document_name text DEFAULT ''`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS document_url text DEFAULT ''`,
    sql`ALTER TABLE lender_documents ADD COLUMN IF NOT EXISTS uploaded_at timestamptz DEFAULT NOW()`,
  ];
  for (const fix of fixes) {
    try { await fix; } catch(e: any) {}
  }
  return NextResponse.json({ success: true });
}
