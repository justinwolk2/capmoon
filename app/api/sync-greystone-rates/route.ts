import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";

const sql = neon(process.env.DATABASE_URL!);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://capmoon.vercel.app";

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS program_guidelines (
    id SERIAL PRIMARY KEY,
    program_key TEXT UNIQUE NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`.catch(() => {});
}

export async function GET() {
  try {
    await ensureTable();
    // Check last sync
    const last = await sql`SELECT updated_at FROM program_guidelines WHERE program_key = 'greystone_sync' LIMIT 1`.catch(() => []);
    if (last.length > 0) {
      const daysSince = (Date.now() - new Date(last[0].updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 10) return NextResponse.json({ skipped: true, message: `Last synced ${daysSince.toFixed(1)} days ago` });
    }

    // Scrape Greystone page for PDF links
    const pageRes = await fetch("https://www.greystone.com/rate-sheet/");
    const html = await pageRes.text();
    const pdfMatches = html.match(/https:\/\/www\.greystone\.com\/wp-content\/uploads\/[^"']+\.pdf/g) || [];
    const conventionalPdf = pdfMatches.find(u => u.includes("Conventional")) || "";
    const affordablePdf = pdfMatches.find(u => u.includes("Affordable")) || "";
    const smallPdf = pdfMatches.find(u => u.includes("Small")) || "";

    const results: any = {};
    for (const [key, url] of [["conventional", conventionalPdf], ["affordable", affordablePdf], ["small_loans", smallPdf]]) {
      if (!url) continue;
      try {
        const pdfRes = await fetch(url);
        const bytes = await pdfRes.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: `Extract the rate sheet data from this Greystone ${key} PDF and return ONLY a JSON object with this structure (no markdown):
{
  "lastUpdated": "date string from PDF",
  "indexes": { "t5": number, "t7": number, "t10": number, "sofr30": number },
  "fannieMae": [{ "term": "5-Year", "tier1_80ltv": { "spreadMin": number, "spreadMax": number, "rateMin": number, "rateMax": number }, "tier2_65ltv": { "spreadMin": number, "spreadMax": number, "rateMin": number, "rateMax": number }, "tier3_55ltv": { "spreadMin": number, "spreadMax": number, "rateMin": number, "rateMax": number } }],
  "freddieMac": [{ "term": "5-Year", "tier1_80ltv": { "spreadMin": number, "spreadMax": number, "rateMin": number, "rateMax": number }, "tier2_65ltv": { "spreadMin": number, "spreadMax": number, "rateMin": number, "rateMax": number }, "tier3_55ltv": { "spreadMin": number, "spreadMax": number, "rateMin": number, "rateMax": number } }]
}` }
            ]
          }]
        });
        const text = response.content.map((c: any) => c.text || "").join("");
        results[key] = JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch(e) { console.error(`Failed to parse ${key}:`, e); }
    }

    // Save to DB
    await sql`INSERT INTO program_guidelines (program_key, data, updated_at) VALUES ('greystone_rates', ${JSON.stringify(results)}, NOW()) ON CONFLICT (program_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
    await sql`INSERT INTO program_guidelines (program_key, data, updated_at) VALUES ('greystone_sync', ${JSON.stringify({ synced: true })}, NOW()) ON CONFLICT (program_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;

    return NextResponse.json({ success: true, results });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
