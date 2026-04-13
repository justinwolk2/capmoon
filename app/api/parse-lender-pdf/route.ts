import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const EXTRACT_PROMPT = `You are analyzing a commercial real estate lender tear sheet or program overview. Extract ALL available information and return ONLY a valid JSON object with no markdown, no backticks, no explanation. Use exactly these fields:

{
  "programName": "full lender/program name",
  "contactPerson": "primary contact name",
  "email": "primary email",
  "phone": "primary phone number",
  "website": "website url or empty string",
  "minLoan": "minimum loan amount with dollar sign e.g. $1,000,000 or empty string",
  "maxLoan": "maximum loan amount with dollar sign or empty string",
  "maxLtv": "max LTV as number only e.g. 75 meaning 75%, or empty string",
  "minDscr": "minimum DSCR as number e.g. 1.25 or N/A",
  "recourse": "one of: FULL, NON RECOURSE, CASE BY CASE",
  "notes": "any important notes, requirements, or details",
  "typeOfLoans": ["array from: Acquisition, Refinance, New Development, Redevelopment, Construction"],
  "loanTerms": ["array of terms e.g.: 1 year, 3 year, 5 year, 7 year, 10 year"],
  "propertyTypes": ["array from: Apartments, Condos, Student Housing, Senior Housing, Assisted Living, Co-living, SFR Portfolio, Mobile Home Park, Office, Medical Office, Manufacturing, Light Industrial, Retail-Multi Tenant, Hotel/Hospitality, Land, Self-storage, Religious, Hospital/Health Care, Other"],
  "capitalTypes": ["array from: Senior, Mezzanine, Preferred Equity, JV Equity, Bridge, Construction, CMBS, Agency, SBA, USDA"],
  "targetStates": ["array of 2-letter state codes, or all 50 if nationwide"],
  "sponsorStates": ["array of 2-letter state codes where sponsor must be located, or empty array"]
}

If a field cannot be determined, use empty string or empty array. Do not guess. Return only the JSON object.`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle pasted text (JSON body)
    if (contentType.includes("application/json")) {
      const { text } = await req.json();
      if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: `${EXTRACT_PROMPT}\n\nHere is the lender text to analyze:\n\n${text}` }]
      });

      const raw = response.content.map((c: any) => c.text || "").join("");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      return NextResponse.json({ success: true, data: parsed });
    }

    // Handle PDF upload (form data)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "PDF files only" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: EXTRACT_PROMPT }
        ]
      }]
    });

    const raw = response.content.map((c: any) => c.text || "").join("");
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json({ success: true, data: parsed });

  } catch(e: any) {
    console.error("PDF parse error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
