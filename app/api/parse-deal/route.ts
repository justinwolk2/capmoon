import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { description, capitalType } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const systemPrompt = `You are a commercial real estate loan intake specialist. Parse the user's deal description and extract structured loan parameters. Be generous in inferring values.

Return ONLY a valid JSON object with these exact fields:
{
  "ownershipStatus": "Acquisition" or "Refinance",
  "dealType": one of "Construction","Value add","New Development","Bridge","Takeout","Investment",
  "assetType": one of "Apartments","Condos","Office","Mixed-use","Hotel/Hospitality","Land","Self-storage","Retail-Multi Tenant","Retail Single Tenant","Senior Housing","Student Housing","SFR Portfolio","Light Industrial","Medical Office","Other",
  "loanAmount": dollar amount string like "$15,000,000",
  "propertyValue": dollar amount string,
  "selectedStates": array of 2-letter state codes inferred from city names,
  "recourseType": "FULL" or "NON RECOURSE" or "CASE BY CASE",
  "dscr": string like "1.25",
  "numUnits": string number if mentioned,
  "numBuildings": string number if mentioned
}
Only return the JSON object. No explanation. No markdown. No backticks.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Parse this deal: "${description}". Capital type: ${capitalType}` }],
      }),
    });

    const data = await response.json();
    console.log("Anthropic response status:", response.status);
    console.log("Anthropic response:", JSON.stringify(data).slice(0, 500));

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "API error" }, { status: 500 });
    }

    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Parse deal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
