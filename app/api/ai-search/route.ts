import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { query, mode, lenders, deals, teamMembers } = await req.json();

  if (!query?.trim()) return NextResponse.json({ filters: null, message: "" });

  try {
    if (mode === "lenders") {
      const systemPrompt = `You are a CRE lending expert assistant for CapMoon. Given a natural language search query about lenders, extract structured filter criteria.

Return ONLY valid JSON with these optional fields:
{
  "capitalTypes": ["Senior", "Mezzanine", "Preferred Equity", "JV Equity", "Bridge", "Construction"],
  "minLoanMin": 1000000,
  "maxLoanMax": 50000000,
  "minLtv": 65,
  "states": ["FL", "NY", "TX"],
  "propertyTypes": ["Apartments", "Office", "Retail-Multi Tenant"],
  "lenderTypes": ["Bridge", "Conventional", "Private Lender"],
  "keywords": ["bridge", "fast close"],
  "summary": "One sentence describing what you found"
}

Only include fields that are clearly implied by the query. Return null for filters if query is too vague.
Capital types available: Senior, Mezzanine, Preferred Equity, JV Equity, Line of Credit, Note on Note, Loan Sales, C&I, Stretch Senior/Hybrid
States use 2-letter codes.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: `Search query: "${query}"` }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const clean = text.replace(/```json|```/g, "").trim();
      
      try {
        const parsed = JSON.parse(clean);
        return NextResponse.json({ filters: parsed, message: parsed.summary || `Searching for: ${query}` });
      } catch {
        return NextResponse.json({ filters: { keywords: [query] }, message: `Searching for: ${query}` });
      }
    }

    if (mode === "deals") {
      const systemPrompt = `You are a CRE capital advisor assistant. Given a natural language search query about submitted deals, extract filter criteria.

Return ONLY valid JSON:
{
  "seekerName": "Marcus",
  "capitalType": "Senior",
  "assetType": "Apartments",
  "status": "pending",
  "advisorName": "Louis",
  "state": "FL",
  "minLoan": 5000000,
  "maxLoan": 50000000,
  "keywords": ["miami", "multifamily"],
  "summary": "One sentence describing the search"
}

Only include fields clearly implied. Status options: pending, assigned, closed.
Available advisors: ${teamMembers?.map((m: any) => m.name).join(", ") || "Louis Palumbo, Shuvo Hussain"}`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: `Search query: "${query}"` }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const clean = text.replace(/```json|```/g, "").trim();
      
      try {
        const parsed = JSON.parse(clean);
        return NextResponse.json({ filters: parsed, message: parsed.summary || `Searching for: ${query}` });
      } catch {
        return NextResponse.json({ filters: { keywords: [query] }, message: `Searching for: ${query}` });
      }
    }

    return NextResponse.json({ filters: null, message: "Unknown mode" });
  } catch (e: any) {
    console.error("AI search error:", e);
    // Fall back gracefully
    return NextResponse.json({ filters: { keywords: [query] }, message: `Searching for: ${query}`, fallback: true });
  }
}
