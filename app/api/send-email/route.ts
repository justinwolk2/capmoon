import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEV_MODE = true; // Set to false when ready to go live
const DEV_EMAIL = "accounting@capmoon.com";

export async function POST(req: NextRequest) {
  const { to, subject, html, from, replyTo } = await req.json();

  const actualTo = DEV_MODE ? DEV_EMAIL : to;
  const actualSubject = DEV_MODE
    ? `[DEV → ${Array.isArray(to) ? to.join(", ") : to}] ${subject}`
    : subject;

  if (!RESEND_API_KEY) {
    console.log("[EMAIL PLACEHOLDER - No RESEND_API_KEY]");
    console.log("To:", actualTo, "| Subject:", actualSubject);
    return NextResponse.json({ success: true, mode: "placeholder" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "CapMoon Deals <deals@capmoon.com>",
        to: Array.isArray(actualTo) ? actualTo : [actualTo],
        reply_to: replyTo || undefined,
        subject: actualSubject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
    return NextResponse.json({ success: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
