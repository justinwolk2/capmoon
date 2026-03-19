import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Advisor code mapping
const ADVISOR_CODES: Record<string, { code: string; name: string }> = {
  "justin.wolk@capmoon.com": { code: "991", name: "Justin" },
  "shussain@capmoon.com": { code: "993", name: "Shuvo" },
  "lpalumbo@capmoon.com": { code: "994", name: "Louis" },
};

export async function POST(req: NextRequest) {
  const { advisorEmail, dealerName, assetType } = await req.json();
  try {
    const advisor = ADVISOR_CODES[advisorEmail] || { code: "991", name: "Admin" };
    const code = advisor.code;

    // Increment counter
    const result = await sql`
      UPDATE deal_number_sequences
      SET current_number = current_number + 1
      WHERE advisor_code = ${code}
      RETURNING current_number
    `;

    if (result.length === 0) {
      // Insert if doesn't exist
      await sql`INSERT INTO deal_number_sequences (advisor_code, current_number) VALUES (${code}, 1)`;
      const n = 1;
      const dealNumber = `${code}${String(n).padStart(3, "0")}`;
      const folderName = `${dealNumber}_${(dealerName || "Deal").replace(/[^a-zA-Z0-9]/g, "_")}`;
      return NextResponse.json({ dealNumber, folderName, code, sequence: n });
    }

    const n = result[0].current_number;
    const dealNumber = `${code}${String(n).padStart(3, "0")}`;
    const folderName = `${dealNumber}_${(dealerName || "Deal").replace(/[^a-zA-Z0-9]/g, "_")}`;

    return NextResponse.json({ dealNumber, folderName, code, sequence: n });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sequences = await sql`SELECT * FROM deal_number_sequences ORDER BY advisor_code`;
    return NextResponse.json(sequences);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
