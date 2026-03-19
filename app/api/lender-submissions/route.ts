import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_URL || "https://capmoon.vercel.app"}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (e) { console.error("Email send failed:", e); }
}

function dealEmailHtml(dealTitle: string, advisorName: string, token: string): string {
  const link = `${process.env.NEXT_PUBLIC_URL || "https://capmoon.vercel.app"}/lender/${token}`;
  return `
    <div style="font-family:Montserrat,sans-serif;max-width:600px;margin:0 auto;background:#f0f2f5;padding:40px 20px;">
      <div style="background:#0a1f44;border-radius:12px;padding:32px;margin-bottom:24px;text-align:center;">
        <div style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">CapMoon · Deal Opportunity</div>
        <div style="font-size:24px;font-weight:800;color:white;margin-bottom:8px;">${dealTitle}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.6);">Presented by ${advisorName}</div>
      </div>
      <div style="background:white;border-radius:12px;padding:32px;margin-bottom:16px;">
        <p style="font-size:14px;color:#333;line-height:1.7;margin-bottom:24px;">
          You have received a new deal opportunity from <strong>CapMoon</strong>. 
          Please click below to review the deal and submit your response.
        </p>
        <a href="${link}" style="display:block;text-align:center;background:#0a1f44;color:white;padding:16px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:16px;">
          Review Deal Opportunity →
        </a>
        <p style="font-size:12px;color:#999;text-align:center;">Or copy this link: ${link}</p>
      </div>
      <div style="text-align:center;font-size:11px;color:#aaa;">
        CapMoon, LLC · Lender Intelligence Platform · Confidential<br>
        This email was sent by ${advisorName} via CapMoon.
      </div>
    </div>
  `;
}

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
      await sql`INSERT INTO lender_submissions (deal_id, lender_id, lender_name, lender_email, deal_title, advisor_name, token, status, created_at)
        VALUES (${dealId}, ${lenderId}, ${lenderName}, ${lenderEmail || ""}, ${dealTitle || ""}, ${advisorName || ""}, ${t}, 'sent', NOW())
        ON CONFLICT (token) DO UPDATE SET status = EXCLUDED.status`;
      // Send real email via Resend (or placeholder if not configured)
      if (lenderEmail) {
        await sendEmail(
          lenderEmail,
          `Deal Opportunity: ${dealTitle}`,
          dealEmailHtml(dealTitle, advisorName, t)
        );
      }
      return NextResponse.json({ success: true, token: t });
    }
    if (action === "manual-status") {
      await sql`UPDATE lender_submissions SET status = ${body.status} WHERE id = ${body.id}`;
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
