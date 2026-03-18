import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  const token = req.nextUrl.searchParams.get("token");
  try {
    if (token) {
      const r = await sql`SELECT * FROM lender_submissions WHERE token = ${token} LIMIT 1`;
      if (r.length === 0) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
      await sql`UPDATE lender_submissions SET viewed_at = NOW(), status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END WHERE token = ${token}`;
      return NextResponse.json(r[0]);
    }
    if (dealId) {
      const r = await sql`SELECT * FROM lender_submissions WHERE deal_id = ${parseInt(dealId)} ORDER BY created_at DESC`;
      return NextResponse.json(r);
    }
    const r = await sql`SELECT * FROM lender_submissions ORDER BY created_at DESC`;
    return NextResponse.json(r);
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, token, message, dealId, lenderId, lenderName, lenderEmail, dealTitle, advisorName } = body;
  try {
    if (action === "respond") {
      await sql`UPDATE lender_submissions SET status = ${body.status}, response_message = ${message || ""}, responded_at = NOW() WHERE token = ${token}`;
      return NextResponse.json({ success: true });
    }
    if (action === "send") {
      const t = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await sql`INSERT INTO lender_submissions (deal_id, lender_id, lender_name, lender_email, deal_title, advisor_name, token, status, created_at) VALUES (${dealId}, ${lenderId}, ${lenderName}, ${lenderEmail || ""}, ${dealTitle || ""}, ${advisorName || ""}, ${t}, 'sent', NOW())`;
      const baseUrl = process.env.NEXT_PUBLIC_URL || "https://capmoon.vercel.app";
      console.log(`[EMAIL PLACEHOLDER] To: ${lenderEmail} | Subject: Deal Opportunity - ${dealTitle} | Link: ${baseUrl}/lender/${t}`);
      return NextResponse.json({ success: true, token: t });
    }
    if (action === "manual-status") {
      await sql`UPDATE lender_submissions SET status = ${body.status} WHERE deal_id = ${dealId} AND lender_id = ${lenderId}`;
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
