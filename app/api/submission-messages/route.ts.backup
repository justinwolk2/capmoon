import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const dealId = req.nextUrl.searchParams.get("dealId");
  try {
    if (token) {
      const msgs = await sql`SELECT * FROM submission_messages WHERE submission_token = ${token} ORDER BY created_at ASC`;
      return NextResponse.json(msgs);
    }
    if (dealId) {
      const msgs = await sql`SELECT * FROM submission_messages WHERE deal_id = ${parseInt(dealId)} ORDER BY created_at ASC`;
      return NextResponse.json(msgs);
    }
    return NextResponse.json([]);
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const { token, dealId, senderName, senderRole, message } = await req.json();
  try {
    const msg = await sql`INSERT INTO submission_messages (submission_token, deal_id, sender_name, sender_role, message)
      VALUES (${token}, ${dealId || null}, ${senderName}, ${senderRole}, ${message})
      RETURNING *`;
    return NextResponse.json(msg[0]);
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
