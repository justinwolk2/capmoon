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

function buildDealLabel(sub: any, deal: any): { title: string; subtitle: string } {
  // Try to build a meaningful title from deal data
  const asset = deal?.assets?.[0];
  const addr = asset?.address;

  // Address line: "123 Main St, Miami, FL" or "Miami, FL" or fallback
  let addressLine = "";
  if (addr?.street && addr?.city && addr?.state) {
    addressLine = `${addr.street}, ${addr.city}, ${addr.state}`;
  } else if (addr?.city && addr?.state) {
    addressLine = `${addr.city}, ${addr.state}`;
  }

  // Deal title: prefer address, fall back to asset type + loan amount
  const assetType = asset?.assetType || "";
  const loanAmount = asset?.loanAmount || "";
  const capitalType = deal?.capitalType || "";

  const title = addressLine
    ? addressLine
    : sub.deal_title || [assetType, loanAmount].filter(Boolean).join(" – ") || "Deal";

  const subtitle = [assetType, loanAmount, capitalType].filter(Boolean).join(" · ");

  return { title, subtitle };
}

function messageEmailHtml({
  senderName, senderRole, message, title, subtitle, dealNumber, portalLink, token
}: {
  senderName: string; senderRole: string; message: string;
  title: string; subtitle: string; dealNumber?: string;
  portalLink: string; token: string;
}) {
  const isLender = senderRole === "lender";
  return `
    <div style="font-family:Montserrat,sans-serif;max-width:600px;margin:0 auto;background:#f0f2f5;padding:32px 16px;">
      <div style="background:#0a1f44;border-radius:12px;padding:24px 28px;margin-bottom:16px;">
        <div style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">CapMoon · Deal Message</div>
        <div style="font-size:20px;font-weight:800;color:white;margin-bottom:4px;">${title}</div>
        ${subtitle ? `<div style="font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:8px;">${subtitle}</div>` : ""}
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

    // Send email notification
    if (token) {
      const [sub] = await sql`SELECT * FROM lender_submissions WHERE token = ${token} LIMIT 1`;
      if (sub) {
        const portalLink = `${BASE_URL}/lender/${token}`;
        const replyTo = `deal+${token}@reply.capmoon.com`;
        const dealNumber = sub.deal_number || "";

        // Pull full deal data for address/details
        let deal: any = null;
        if (dealId) {
          const dealRows = await sql`SELECT data FROM submitted_deals WHERE (data->>'id')::text = ${String(dealId)} LIMIT 1`;
          if (dealRows.length > 0) deal = dealRows[0].data;
        }
        // Also try by deal_id column on lender_submissions
        if (!deal && sub.deal_id) {
          const dealRows = await sql`SELECT data FROM submitted_deals WHERE (data->>'id')::text = ${String(sub.deal_id)} LIMIT 1`;
          if (dealRows.length > 0) deal = dealRows[0].data;
        }

        const { title, subtitle } = buildDealLabel(sub, deal);

        const emailHtml = messageEmailHtml({
          senderName, senderRole, message, title, subtitle, dealNumber, portalLink, token
        });

        if (senderRole === "lender") {
          // Lender wrote → notify advisor
          // Look up advisor by name in users table (username = email)
          const advisorRows = await sql`SELECT data FROM users WHERE data->>'name' = ${sub.advisor_name} LIMIT 1`;
          if (advisorRows.length > 0) {
            const advisor = advisorRows[0].data as any;
            if (advisor.username) {
              await sendEmail(
                advisor.username,
                `💬 ${senderName} replied — ${title}${dealNumber ? ` (#${dealNumber})` : ""}`,
                emailHtml,
                replyTo
              );
            }
          }
          // Also notify any assigned advisors via team_members email field
          if (deal?.assignedAdvisorIds?.length > 0) {
            const teamRows = await sql`SELECT data FROM team_members`;
            const team = teamRows.map((r: any) => r.data);
            const assigned = team.filter((m: any) => deal.assignedAdvisorIds.includes(m.id));
            for (const advisor of assigned) {
              if (advisor.email) {
                await sendEmail(
                  advisor.email,
                  `💬 ${senderName} replied — ${title}${dealNumber ? ` (#${dealNumber})` : ""}`,
                  emailHtml,
                  replyTo
                );
              }
            }
          }
        } else {
          // Advisor/admin wrote → notify lender
          if (sub.lender_email) {
            await sendEmail(
              sub.lender_email,
              `💬 New message re: ${title}${dealNumber ? ` (#${dealNumber})` : ""}`,
              emailHtml,
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
