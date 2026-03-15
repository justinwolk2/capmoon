import { NextRequest, NextResponse } from "next/server";

const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";

function fmt$(n: number): string {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n/1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

async function getCensusDemographics(zip: string): Promise<any> {
  try {
    const geoParam = zip
      ? `for=zip%20code%20tabulation%20area:${zip}`
      : `for=us:1`;
    const url = `${CENSUS_BASE}?get=B01003_001E,B19013_001E,B25064_001E,B01002_001E&${geoParam}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || data.length < 2) return null;
    const row = data[1];
    return {
      population: parseInt(row[0]) > 0 ? parseInt(row[0]).toLocaleString() : null,
      medianIncome: parseInt(row[1]) > 0 ? fmt$(parseInt(row[1])) : null,
      medianRent: parseInt(row[2]) > 0 ? `$${parseInt(row[2])}/mo` : null,
      medianAge: parseFloat(row[3]) > 0 ? `${parseFloat(row[3]).toFixed(1)} yrs` : null,
    };
  } catch (e) {
    console.error("Census error:", e);
    return null;
  }
}

function getPropertyTypeData(assetType: string, demographics: any): Record<string, string> {
  const data: Record<string, string> = {};
  if (["Apartments", "Student Housing", "Condos"].includes(assetType)) {
    if (demographics?.medianRent) {
      data["Market Median Rent"] = demographics.medianRent;
      const base = parseInt(demographics.medianRent.replace(/[^0-9]/g, ""));
      if (base > 0) {
        data["Est. 1BR Market Rent"] = `$${Math.round(base * 0.85)}/mo`;
        data["Est. 2BR Market Rent"] = `$${Math.round(base * 1.15)}/mo`;
        data["Est. 3BR Market Rent"] = `$${Math.round(base * 1.45)}/mo`;
      }
    }
    if (demographics?.medianIncome) data["Area Median Income (AMI)"] = demographics.medianIncome;
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
  } else if (["Office", "Medical Office"].includes(assetType)) {
    data["Typical Office Vacancy"] = "12–18% national avg";
    data["Typical Class A Rate"] = "$28–$55/SF FSG";
    data["Typical Class B Rate"] = "$18–$35/SF FSG";
    data["Cap Rate Range"] = "6.5%–8.5%";
    if (demographics?.medianIncome) data["Area Median Income"] = demographics.medianIncome;
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
  } else if (["Light Industrial", "Manufacturing", "Warehouse/Distribution"].includes(assetType)) {
    data["Industrial Vacancy (National)"] = "4–6% (historically tight)";
    data["Typical NNN Rate"] = "$8–$18/SF NNN";
    data["Cap Rate Range"] = "5.0%–6.5%";
    data["Avg Lease Term"] = "3–7 years NNN";
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
  } else if (assetType?.includes("Retail")) {
    data["Typical In-Line Rent"] = "$18–$45/SF NNN";
    data["Anchor Tenant Rate"] = "$8–$20/SF NNN";
    data["Typical Vacancy"] = "4–8%";
    data["Cap Rate Range"] = "5.5%–7.5%";
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
    if (demographics?.medianIncome) data["Area Median Income"] = demographics.medianIncome;
  } else if (assetType?.includes("Hotel") || assetType === "Gaming" || assetType?.includes("Casino")) {
    data["Typical Occupancy Target"] = "65–75% stabilized";
    data["Cap Rate Range"] = "7.0%–9.5%";
    data["Data Source"] = "STR Global / AGA benchmarks";
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
  } else if (assetType === "Self-storage") {
    data["Typical Street Rate (10×10)"] = "$100–$220/mo";
    data["Cap Rate Range"] = "5.0%–6.5%";
    data["Occupancy Target"] = "85%+ stabilized";
    data["Avg Lease Term"] = "Month-to-month";
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
  } else if (["Land", "New Development"].includes(assetType)) {
    data["Typical Hard Costs (Multi)"] = "$180–$320/SF";
    data["Typical Hard Costs (Office)"] = "$200–$400/SF";
    data["Soft Cost Estimate"] = "10–15% of hard costs";
    data["Construction Cost Trend"] = "+3–5% YoY (RSMeans index)";
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
    if (demographics?.medianIncome) data["Area Median Income"] = demographics.medianIncome;
  } else if (assetType === "Mixed Use") {
    if (demographics?.medianRent) data["Residential Market Rent"] = demographics.medianRent;
    data["Retail Component Rate"] = "$20–$40/SF NNN (street level)";
    data["Cap Rate Range"] = "5.0%–7.0% blended";
    if (demographics?.medianIncome) data["Area Median Income"] = demographics.medianIncome;
    if (demographics?.population) data["Trade Area Population"] = demographics.population;
  } else {
    if (demographics?.medianRent) data["Area Median Rent"] = demographics.medianRent;
    if (demographics?.medianIncome) data["Median Household Income"] = demographics.medianIncome;
    if (demographics?.population) data["Area Population"] = demographics.population;
  }
  return data;
}

function generateSummary(assetType: string, city: string, state: string, demographics: any): string {
  const loc = [city, state].filter(Boolean).join(", ") || "the subject market";
  let s = `The subject property is located in ${loc}.`;
  if (demographics?.population) s += ` The trade area has a population of ${demographics.population}`;
  if (demographics?.medianIncome) s += ` with a median household income of ${demographics.medianIncome}`;
  s += ".";
  if (["Apartments", "Student Housing", "Condos"].includes(assetType)) {
    if (demographics?.medianRent) s += ` The median gross rent in this market is ${demographics.medianRent}. Multifamily fundamentals are driven by employment growth, in-migration, and housing supply constraints.`;
    else s += " Multifamily fundamentals are driven by employment growth, in-migration, and housing supply constraints.";
  } else if (assetType?.includes("Office")) {
    s += " The office market is experiencing evolving dynamics driven by hybrid work trends. Well-located, amenitized assets continue to outperform older vintage product.";
  } else if (assetType?.includes("Industrial") || assetType?.includes("Warehouse")) {
    s += " Industrial demand remains strong nationally, driven by e-commerce, supply chain restructuring, and nearshoring trends. Vacancy remains historically low in most major markets.";
  } else if (assetType?.includes("Retail")) {
    s += ` Retail performance in ${loc} is correlated with local income levels and traffic patterns. Necessity-based and experiential retail continue to demonstrate resilience.`;
  } else if (assetType?.includes("Hotel")) {
    s += ` The hospitality sector in ${loc} benefits from tourism, corporate travel, and regional demand generators. RevPAR should be reviewed against STR benchmarks for the submarket.`;
  } else if (assetType === "Self-storage") {
    s += " Self-storage demand is driven by population density, housing transitions, and small business activity. Markets with limited new supply offer favorable rent growth prospects.";
  } else if (assetType === "Mixed Use") {
    s += " Mixed-use assets benefit from multiple income streams including retail, residential, and potentially office components. Blended cap rates reflect the diversified risk profile.";
  }
  s += "\n\n[Add additional market commentary, submarket analysis, and comparable transaction data here.]";
  return s;
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip") || "";
  const city = req.nextUrl.searchParams.get("city") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const assetType = req.nextUrl.searchParams.get("assetType") || "";
  try {
    const demographics = await getCensusDemographics(zip);
    const propertyData = getPropertyTypeData(assetType, demographics);
    const summary = generateSummary(assetType, city, state, demographics);
    return NextResponse.json({ demographics, propertyData, summary, assetType, location: { zip, city, state } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
