import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { description, capitalType } = await req.json();

  const systemPrompt = `You are a commercial real estate loan intake specialist. Parse the user's deal description and extract structured loan parameters. Be generous in inferring values — if someone says "Miami" infer FL, if they say "apartments" use "Apartments", etc.

Return ONLY a valid JSON object with these exact fields (use reasonable defaults if not mentioned):
{
  "ownershipStatus": "Acquisition" or "Refinance" (default "Acquisition"),
  "dealType": one of "Construction"/"Value add"/"New Development"/"Bridge"/"Takeout"/"Investment" (default "Value add"),
  "assetType": one of "Apartments"/"Condos"/"Office"/"Mixed-use"/"Hotel/Hospitality"/"Land"/"Self-storage"/"Retail-Multi Tenant"/"Retail Single Tenant"/"Senior Housing"/"Student Housing"/"SFR Portfolio"/"Light Industrial"/"Medical Office"/"Other" (infer from context),
  "loanAmount": dollar amount as string like "$15,000,000" (infer from context if possible),
  "propertyValue": dollar amount as string (estimate if not given),
  "selectedStates": array of 2-letter US state codes — infer from city names (Miami=FL, New York=NY, Dallas=TX, Chicago=IL, Atlanta=GA, Boston=MA, Seattle=WA, Denver=CO, Phoenix=AZ, Las Vegas=NV, Los Angeles=CA, Houston=TX, Nashville=TN, Charlotte=NC, etc),
  "recourseType": "FULL" or "NON RECOURSE" or "CASE BY CASE" (default "CASE BY CASE"),
  "dscr": number as string like "1.25" (default "1.20" if not mentioned),
  "numUnits": number as string if mentioned,
  "numBuildings": number as string if mentioned
}
Only return the JSON. No explanation. No markdown. No backticks.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Parse this deal description: "${description}". The capital type being sought is: ${capitalType}` }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI parse error:", err);
    return NextResponse.json({}, { status: 500 });
  }
}
