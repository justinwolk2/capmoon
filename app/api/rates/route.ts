import { NextResponse } from "next/server";
const FRED_KEY = process.env.FRED_API_KEY!;
let cache: { data: any; ts: number } | null = null;
const CACHE = 24 * 60 * 60 * 1000;

async function fetchRate(series: string): Promise<number> {
  try {
    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${FRED_KEY}&limit=1&sort_order=desc&file_type=json`);
    const json = await res.json();
    const val = json.observations?.[0]?.value;
    return val && val !== "." ? parseFloat(val) : 0;
  } catch { return 0; }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE) return NextResponse.json(cache.data);
  const [t5, t7, t10, t30, sofr, prime] = await Promise.all([
    fetchRate("DGS5"), fetchRate("DGS7"), fetchRate("DGS10"),
    fetchRate("DGS30"), fetchRate("SOFR30DAYAVG"), fetchRate("DPRIME"),
  ]);
  const data = { t5, t7, t10, t30, sofr, prime, updatedAt: new Date().toISOString() };
  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
