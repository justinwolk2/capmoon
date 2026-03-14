import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const getDb = () => neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const sql = getDb();
  const type = req.nextUrl.searchParams.get("type");
  try {
    switch (type) {
      case "users": { const rows = await sql`SELECT data FROM users ORDER BY id`; return NextResponse.json(rows.map((r: any) => r.data)); }
      case "deals": { const rows = await sql`SELECT data FROM submitted_deals ORDER BY created_at DESC`; return NextResponse.json(rows.map((r: any) => r.data)); }
      case "team": { const rows = await sql`SELECT data FROM team_members ORDER BY id`; return NextResponse.json(rows.map((r: any) => r.data)); }
      case "deletes": { const rows = await sql`SELECT data FROM delete_requests ORDER BY created_at DESC`; return NextResponse.json(rows.map((r: any) => r.data)); }
      case "lenders": { const rows = await sql`SELECT data FROM lenders ORDER BY id`; return NextResponse.json(rows.map((r: any) => r.data)); }
      case "lender-changes": { const rows = await sql`SELECT data FROM lender_change_requests ORDER BY created_at DESC`; return NextResponse.json(rows.map((r: any) => r.data)); }
      default: return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("DB GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { type, data } = body;

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ success: false, reason: "empty data refused" });
  }

  try {
    switch (type) {
      case "users": { await sql`DELETE FROM users`; for (const item of data) { await sql`INSERT INTO users (data) VALUES (${JSON.stringify(item)})`; } return NextResponse.json({ success: true }); }
      case "deals": { await sql`DELETE FROM submitted_deals`; for (const item of data) { await sql`INSERT INTO submitted_deals (data) VALUES (${JSON.stringify(item)})`; } return NextResponse.json({ success: true }); }
      case "team": { await sql`DELETE FROM team_members`; for (const item of data) { await sql`INSERT INTO team_members (data) VALUES (${JSON.stringify(item)})`; } return NextResponse.json({ success: true }); }
      case "deletes": { await sql`DELETE FROM delete_requests`; for (const item of data) { await sql`INSERT INTO delete_requests (data) VALUES (${JSON.stringify(item)})`; } return NextResponse.json({ success: true }); }
      case "lenders": { await sql`DELETE FROM lenders`; for (const item of data) { await sql`INSERT INTO lenders (data) VALUES (${JSON.stringify(item)})`; } return NextResponse.json({ success: true }); }
      case "lender-changes": { await sql`DELETE FROM lender_change_requests`; for (const item of data) { await sql`INSERT INTO lender_change_requests (data) VALUES (${JSON.stringify(item)})`; } return NextResponse.json({ success: true }); }
      default: return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("DB POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
