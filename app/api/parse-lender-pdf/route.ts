import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const EXTRACT_PROMPT = `You are analyzing a commercial real estate lender tear sheet or program overview. Extract ALL distinct lending programs found in this document. A single lender may have multiple programs (e.g. Bridge, Permanent, Construction, Small Balance, Agency, etc.).

Return ONLY a valid JSON array of program objects with no markdown, no backticks, no explanation. Each object represents ONE distinct lending program.

Use exactly this structure for each program object:
{
  "programName": "descriptive program name e.g. 'Greystone - Bridge' or 'Axos Bank - Multifamily Construction'",
  "lenderName": "parent lender/company name e.g. 'Greystone' or 'Axos Bank'",
  "contactPerson": "contact name for this program, or master contact if not program-specific",
  "email": "email for this program, or master email if not program-specific",
  "phone": "phone for this program, or master phone if not program-specific",
  "website": "website url or empty string",
  "minLoan": "minimum loan amount with dollar sign e.g. $1,000,000 or empty string",
  "maxLoan": "maximum loan amount with dollar sign or empty string",
  "maxLtv": "max LTV as number only e.g. 75 meaning 75%, or empty string",
  "maxLtc": "max LTC as number only e.g. 80 meaning 80%, or empty string",
  "maxArltv": "max ARLTV after repair/construction LTV as number only, or empty string",
  "minDscr": "minimum DSCR as number e.g. 1.25 or N/A",
  "recourse": "one of: FULL, NON RECOURSE, CASE BY CASE",
  "rateType": "Fixed, Floating, or Both",
  "indexBenchmark": "e.g. SOFR, 10yr Treasury, Prime, or empty string",
  "spreadRange": "e.g. 250-450 bps or empty string",
  "notes": "important notes, requirements, or details specific to this program",
  "typeOfLoans": ["array from: Acquisition, Refinance, New Development, Redevelopment, Construction"],
  "loanTerms": ["array of terms e.g.: 1 year, 3 year, 5 year, 7 year, 10 year"],
  "propertyTypes": ["array from: Apartments, Condos, Student Housing, Senior Housing, Assisted Living, Co-living, SFR Portfolio, Mobile Home Park, Office, Medical Office, Manufacturing, Light Industrial, Retail-Multi Tenant, Hotel/Hospitality, Land, Self-storage, Religious, Hospital/Health Care, Other"],
  "capitalTypes": ["array from: Senior, Mezzanine, Preferred Equity, JV Equity, Bridge, Construction, CMBS, Agency, SBA, USDA"],
  "targetStates": ["array of 2-letter state codes, or all 50 if nationwide"],
  "sponsorStates": ["array of 2-letter state codes where sponsor must be located, or empty array"]
}

RULES:
- One program = one object in the array
- If only one program exists, still return a single-element array
- Use program-specific contacts when listed separately, otherwise use master lender contact for all
- Never combine multiple programs into one object
- Empty string or empty array for unknown fields, never guess
- Return ONLY the JSON array, nothing else`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const { text } = await req.json();
      if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: `${EXTRACT_PROMPT}\n\nLender text to analyze:\n\n${text}` }]
      });
      const raw = response.content.map((c: any) => c.text || "").join("");
      const programs = JSON.parse(raw.replace(/```json|```/g, "").trim());
      return NextResponse.json({ success: true, programs: Array.isArray(programs) ? programs : [programs] });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "PDF files only" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: EXTRACT_PROMPT }
        ]
      }]
    });

    const raw = response.content.map((c: any) => c.text || "").join("");
    const programs = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json({ success: true, programs: Array.isArray(programs) ? programs : [programs] });

  } catch(e: any) {
    console.error("PDF parse error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
