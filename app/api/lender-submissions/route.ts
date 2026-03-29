import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://capmoon.vercel.app";

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  try {
    await fetch(`${BASE_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, replyTo }),
    });
  } catch (e) { console.error("Email failed:", e); }
}

function dealEmailHtml(dealTitle: string, advisorName: string, token: string, dealNumber?: string, pdfUrl?: string): string {
  const link = `${BASE_URL}/lender/${token}`;
  const replyEmail = `deal+${token}@reply.capmoon.com`;
  return `
    <div style="font-family:Montserrat,sans-serif;max-width:620px;margin:0 auto;background:#f0f2f5;padding:32px 16px;">
      <div style="background:#0a1f44;border-radius:12px;padding:28px 32px;margin-bottom:20px;">
        <div style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">CapMoon · Deal Opportunity</div>
        <div style="font-size:22px;font-weight:800;color:white;margin-bottom:6px;">${dealTitle}</div>
        ${dealNumber ? `<div style="display:inline-block;padding:3px 10px;background:rgba(201,168,76,0.2);border-radius:20px;font-size:11px;color:#c9a84c;font-weight:700;margin-bottom:8px;">Deal #${dealNumber}</div>` : ""}
        <div style="font-size:12px;color:rgba(255,255,255,0.55);">Presented by ${advisorName}</div>
      </div>
      <div style="background:white;border-radius:12px;padding:28px;margin-bottom:16px;">
        <p style="font-size:14px;color:#333;line-height:1.7;margin-bottom:20px;">
          You have received a new financing opportunity from <strong>CapMoon</strong>. 
          Please review the deal and respond using the button below.
        </p>
        ${pdfUrl ? `<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #e0e5f0;">
          <div style="font-size:12px;font-weight:700;color:#0a1f44;margin-bottom:8px;">📄 Deal Memo Attached</div>
          <a href="${pdfUrl}" style="font-size:13px;color:#c9a84c;text-decoration:none;">Download Deal Memo PDF →</a>
        </div>` : ""}
        <a href="${link}" style="display:block;text-align:center;background:#0a1f44;color:white;padding:16px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:16px;">
          Review &amp; Respond to Deal →
        </a>
        <p style="font-size:12px;color:#999;text-align:center;margin-bottom:8px;">Or copy this link: ${link}</p>
        <div style="border-top:1px solid #f0f0f0;margin-top:16px;padding-top:12px;">
          <p style="font-size:11px;color:#aaa;text-align:center;">
            Don't have a CapMoon account? 
            <a href="${BASE_URL}/signup" style="color:#c9a84c;">Sign up free</a> to track all your deals in one place.
            Or simply <strong>reply to this email</strong> and your message will go directly to the deal thread.
          </p>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:#aaa;">CapMoon, LLC · Lender Intelligence Platform · Confidential</div>
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
  const { action, token, message, dealId, lenderId, lenderName, lenderEmail, dealTitle, advisorName, dealNumber, pdfUrl } = body;
  try {
    if (action === "respond") {
      await sql`UPDATE lender_submissions SET status = ${body.status}, response_message = ${message || ""}, responded_at = NOW() WHERE token = ${token}`;
      // Save to message thread
      if (message) {
        await sql`INSERT INTO submission_messages (submission_token, deal_id, sender_name, sender_role, message)
          VALUES (${token}, ${body.dealId || null}, ${lenderName || "Lender"}, 'lender', ${message})`.catch(() => {});
      }
      return NextResponse.json({ success: true });
    }
    if (action === "send") {
      const t = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await sql`INSERT INTO lender_submissions (deal_id, lender_id, lender_name, lender_email, deal_title, advisor_name, token, status, created_at)
        VALUES (${dealId}, ${lenderId}, ${lenderName}, ${lenderEmail || ""}, ${dealTitle || ""}, ${advisorName || ""}, ${t}, 'sent', NOW())
        ON CONFLICT (token) DO NOTHING`;
      if (lenderEmail) {
        const replyTo = `deal+${t}@reply.capmoon.com`;
        await sendEmail(
          lenderEmail,
          `Deal Opportunity: ${dealTitle}${dealNumber ? ` (#${dealNumber})` : ""}`,
          dealEmailHtml(dealTitle, advisorName, t, dealNumber, pdfUrl),
          replyTo
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
