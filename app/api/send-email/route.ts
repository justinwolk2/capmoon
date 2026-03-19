import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(req: NextRequest) {
  const { to, subject, html, from } = await req.json();

  // If no Resend key, log placeholder and return success
  if (!RESEND_API_KEY || RESEND_API_KEY === "re_placeholder") {
    console.log(`[EMAIL PLACEHOLDER - Configure RESEND_API_KEY in Vercel]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body preview: ${html?.slice(0, 200)}...`);
    return NextResponse.json({ success: true, mode: "placeholder" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "CapMoon <deals@capmoon.com>",
        to: Array.isArray(to) ? to : [to],
        subject,
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
