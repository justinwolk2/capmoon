import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    await sql`ALTER TABLE lender_documents ALTER COLUMN deal_id TYPE bigint`;
    await sql`ALTER TABLE lender_submissions ALTER COLUMN deal_id TYPE bigint`;
    await sql`ALTER TABLE submission_messages ALTER COLUMN deal_id TYPE bigint`;
    return NextResponse.json({ success: true });
  } catch(e: any) {
    return NextResponse.json({ done: true, note: e.message });
  }
}
