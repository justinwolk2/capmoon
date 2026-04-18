import { NextRequest, NextResponse } from "next/server";

// Top MSAs where agency loans get better pricing (Tier 1)
const TIER1_MSAS = ["New York","Los Angeles","Chicago","Dallas","Houston","Washington","Miami","Philadelphia","Atlanta","Phoenix","Boston","San Francisco","Seattle","San Diego","Minneapolis","San Jose","Denver","Baltimore","Portland","Sacramento","Orlando","Tampa","St. Louis","Pittsburgh","Cincinnati","Cleveland","Kansas City","Columbus","Indianapolis","Charlotte","Austin","Nashville","Las Vegas","Salt Lake City","Hartford","Raleigh","Virginia Beach","Jacksonville","Richmond","New Orleans","Louisville","Memphis","Birmingham","Buffalo","Providence","Rochester","Oklahoma City","Bridgeport","Albany","Tucson"];

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const city = req.nextUrl.searchParams.get("city") || "";
  
  try {
    if (lat && lng) {
      const res = await fetch(`https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Metropolitan%20Statistical%20Areas&format=json`);
      const data = await res.json();
      const msa = data.result?.geographies?.["Metropolitan Statistical Areas"]?.[0];
      if (msa) {
        const msaName = msa.NAME || "";
        const isTier1 = TIER1_MSAS.some(m => msaName.toLowerCase().includes(m.toLowerCase()));
        return NextResponse.json({ msaName, msaCode: msa.GEOID, tier: isTier1 ? 1 : 2 });
      }
    }
    // Fallback: check city name
    const isTier1 = TIER1_MSAS.some(m => city.toLowerCase().includes(m.toLowerCase()));
    return NextResponse.json({ msaName: city, msaCode: null, tier: isTier1 ? 1 : 2 });
  } catch(e: any) {
    return NextResponse.json({ msaName: city, msaCode: null, tier: 2 });
  }
}
