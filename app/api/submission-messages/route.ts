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
  } catch (e) { console.error("Email notification failed:", e); }
}

function messageEmailHtml({
  senderName, senderRole, message, dealTitle, dealNumber, portalLink, token
}: {
  senderName: string; senderRole: string; message: string;
  dealTitle: string; dealNumber?: string; portalLink: string; token: string;
}) {
  const isLender = senderRole === "lender";
  const replyEmail = `deal+${token}@reply.capmoon.com`;
  return `
    <div style="font-family:Montserrat,sans-serif;max-width:600px;margin:0 auto;background:#f0f2f5;padding:32px 16px;">
      <div style="background:#0a1f44;border-radius:12px;padding:24px 28px;margin-bottom:16px;">
        <div style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px;">CapMoon · Deal Message</div>
        <div style="font-size:18px;font-weight:800;color:white;margin-bottom:4px;">${dealTitle}</div>
        ${dealNumber ? `<div style="display:inline-block;padding:2px 10px;background:rgba(201,168,76,0.2);border-radius:20px;font-size:11px;color:#c9a84c;font-weight:700;">Deal #${dealNumber}</div>` : ""}
      </div>
      <div style="background:white;border-radius:12px;padding:24px;margin-bottom:12px;">
        <div style="font-size:12px;color:#999;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.1em;">
          New message from <strong style="color:#0a1f44;">${senderName}</strong>
        </div>
        <div style="background:#f8f9fa;border-left:3px solid #c9a84c;padding:14px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#333;line-height:1.6;margin-bottom:20px;">
          ${message}
        </div>
        <a href="${portalLink}" style="display:block;text-align:center;background:#0a1f44;color:white;padding:14px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:12px;">
          ${isLender ? "View Deal & Reply →" : "View Lender Response →"}
        </a>
        <p style="font-size:11px;color:#aaa;text-align:center;margin:0;">
          Or simply <strong>reply to this email</strong> — your reply goes straight to the deal thread.
        </p>
      </div>
      <div style="text-align:center;font-size:11px;color:#aaa;">CapMoon, LLC · Confidential</div>
    </div>
  `;
}

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
    // Save message to DB
    const msg = await sql`
      INSERT INTO submission_messages (submission_token, deal_id, sender_name, sender_role, message)
      VALUES (${token}, ${dealId || null}, ${senderName}, ${senderRole}, ${message})
      RETURNING *
    `;

    // Look up the lender submission to get emails + deal info
    if (token) {
      const [sub] = await sql`SELECT * FROM lender_submissions WHERE token = ${token} LIMIT 1`;
      if (sub) {
        const portalLink = `${BASE_URL}/lender/${token}`;
        const replyTo = `deal+${token}@reply.capmoon.com`;
        const dealTitle = sub.deal_title || "Deal";
        const dealNumber = sub.deal_number || "";

        if (senderRole === "lender") {
          // Lender wrote → notify the advisor
          // Look up advisor email from submitted_deals + users
          if (dealId) {
            const deals = await sql`SELECT data FROM submitted_deals WHERE data->>'id' = ${String(dealId)} LIMIT 1`;
            if (deals.length > 0) {
              const deal = deals[0].data as any;
              // Get assigned advisor emails
              const advisorIds = deal.assignedAdvisorIds || [];
              if (advisorIds.length > 0) {
                const teamRows = await sql`SELECT data FROM team_members`;
                const team = teamRows.map((r: any) => r.data);
                const advisors = team.filter((m: any) => advisorIds.includes(m.id));
                for (const advisor of advisors) {
                  if (advisor.email) {
                    await sendEmail(
                      advisor.email,
                      `💬 New message from ${senderName} — ${dealTitle}${dealNumber ? ` (#${dealNumber})` : ""}`,
                      messageEmailHtml({ senderName, senderRole, message, dealTitle, dealNumber, portalLink: `${BASE_URL}/lender/${token}`, token }),
                      replyTo
                    );
                  }
                }
              }
              // Also notify deal owner (admin) if email on deal
              if (deal.seekerEmail && deal.seekerEmail.includes("capmoon")) {
                await sendEmail(
                  deal.seekerEmail,
                  `💬 New message from ${senderName} — ${dealTitle}`,
                  messageEmailHtml({ senderName, senderRole, message, dealTitle, dealNumber, portalLink: `${BASE_URL}/lender/${token}`, token }),
                  replyTo
                );
              }
            }
          }
          // Fallback: also notify advisorName from submission if we have their email
          const advisorEmailRows = await sql`SELECT data FROM users WHERE data->>'name' = ${sub.advisor_name} LIMIT 1`;
          if (advisorEmailRows.length > 0) {
            const advisorUser = advisorEmailRows[0].data as any;
            if (advisorUser.username) {
              await sendEmail(
                advisorUser.username,
                `💬 New message from ${senderName} — ${dealTitle}${dealNumber ? ` (#${dealNumber})` : ""}`,
                messageEmailHtml({ senderName, senderRole, message, dealTitle, dealNumber, portalLink, token }),
                replyTo
              );
            }
          }
        } else {
          // Advisor/admin wrote → notify the lender
          if (sub.lender_email) {
            await sendEmail(
              sub.lender_email,
              `💬 New message from ${senderName} re: ${dealTitle}${dealNumber ? ` (#${dealNumber})` : ""}`,
              messageEmailHtml({ senderName, senderRole, message, dealTitle, dealNumber, portalLink, token }),
              replyTo
            );
          }
        }
      }
    }

    return NextResponse.json(msg[0]);
  } catch(e: any) {
    console.error("submission-messages POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
