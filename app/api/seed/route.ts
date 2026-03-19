import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);

  const users = [
    { id: 1, username: "justin.wolk@capmoon.com", password: "Chairam1!", role: "admin", name: "Justin Wolk", blockedLenderIds: [] },
    { id: 2, username: "lpalumbo@capmoon.com", password: "Louis2024!", role: "advisor", name: "Louis Palumbo", blockedLenderIds: [], teamMemberId: 1 },
    { id: 3, username: "shussain@capmoon.com", password: "Shuvo2024!", role: "advisor", name: "Shuvo Hussain", blockedLenderIds: [], teamMemberId: 2 },
    { id: 4, username: "testlender@example.com", password: "Lender2024!", role: "lender", name: "Test Lender", blockedLenderIds: [], linkedLenderId: 1 },
  ];

  const teamMembers = [
    { id: 1, name: "Louis Palumbo", email: "lpalumbo@capmoon.com", phone: "305-401-0076", photo: "/louis.jpg", geographicMarket: "Southeast, Florida", specialtyAreas: ["Senior", "Mezzanine", "Bridge"], title: "Vice President of Capital Advisory" },
    { id: 2, name: "Shuvo Hussain", email: "shussain@capmoon.com", phone: "347-993-5545", photo: "/Shuvo.jpeg", geographicMarket: "Northeast, New York", specialtyAreas: ["JV Equity", "Preferred Equity", "Mezzanine"], title: "Vice President of Capital Advisory" },
  ];

  const deals = [
    { id: 1001, submittedAt: "3/10/2026, 9:15:00 AM", seekerName: "Marcus Bellfield", seekerEmail: "mbellfield@email.com", seekerPhone: "305-555-0101", capitalType: "Senior", assetMode: "single", collateralMode: "", status: "assigned", assignedAdvisorIds: [1], notes: "Borrower has strong track record in South Florida multifamily. Looking for 5-year term IO.", assets: [{ id: 1, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower", assetType: "Apartments", loanAmount: "$18,500,000", seniorLoanAmount: "", subordinateAmount: "", propertyValue: "$26,000,000", purchasePrice: "$25,500,000", currentLoanAmount: "", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "$1,200,000", manualLtv: "", dscr: "1.28", selectedStates: ["FL"], recourseType: "CASE BY CASE", numUnits: "220", numBuildings: "4", numAcres: "", retailUnits: [], address: { street: "4801 Biscayne Blvd", unit: "", city: "Miami", state: "FL", zip: "33137" } }] },
    { id: 1002, submittedAt: "3/11/2026, 2:30:00 PM", seekerName: "Diana Okafor", seekerEmail: "dokafor@email.com", seekerPhone: "212-555-0202", capitalType: "Senior", assetMode: "single", collateralMode: "", status: "pending", assignedAdvisorIds: [1], notes: "Class A office in Midtown. Strong in-place tenancy with 3 years remaining on anchor lease.", assets: [{ id: 1, ownershipStatus: "Refinance", dealType: "Bridge", refinanceType: "Cash Out-Value Add", assetType: "Office", loanAmount: "$32,000,000", seniorLoanAmount: "", subordinateAmount: "", propertyValue: "$48,000,000", purchasePrice: "", currentLoanAmount: "$24,000,000", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "$2,400,000", manualLtv: "", dscr: "1.35", selectedStates: ["NY"], recourseType: "NON RECOURSE", numUnits: "", numBuildings: "", numAcres: "", retailUnits: [], address: { street: "1221 Avenue of the Americas", unit: "15th Floor", city: "New York", state: "NY", zip: "10020" } }] },
    { id: 1003, submittedAt: "3/12/2026, 11:00:00 AM", seekerName: "Trevor Sandoval", seekerEmail: "tsandoval@email.com", seekerPhone: "713-555-0303", capitalType: "Preferred Equity", assetMode: "single", collateralMode: "", status: "assigned", assignedAdvisorIds: [2], notes: "Ground-up development in Houston. Shovel ready, all permits in place.", assets: [{ id: 1, ownershipStatus: "Acquisition", dealType: "New Development", refinanceType: "Cash Out to Borrower", assetType: "Apartments", loanAmount: "$12,000,000", seniorLoanAmount: "$55,000,000", subordinateAmount: "$12,000,000", propertyValue: "$82,000,000", purchasePrice: "$68,000,000", currentLoanAmount: "", landCost: "$14,000,000", softCosts: "$8,500,000", originationClosingCosts: "$1,200,000", hardCosts: "$38,000,000", carryingCosts: "$2,800,000", borrowerEquity: "$9,500,000", ltvMode: "AUTO", currentNetIncome: "", manualLtv: "", dscr: "", selectedStates: ["TX"], recourseType: "NON RECOURSE", numUnits: "312", numBuildings: "2", numAcres: "", retailUnits: [], address: { street: "3200 Main Street", unit: "", city: "Houston", state: "TX", zip: "77002" } }] },
    { id: 1004, submittedAt: "3/13/2026, 4:45:00 PM", seekerName: "Rachel Kim", seekerEmail: "rkim@email.com", seekerPhone: "404-555-0404", capitalType: "Mezzanine", assetMode: "single", collateralMode: "", status: "pending", assignedAdvisorIds: [2], notes: "Full-service hotel in downtown Atlanta. STR and corporate travel demand drivers.", assets: [{ id: 1, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower", assetType: "Hotel/Hospitality", loanAmount: "$9,500,000", seniorLoanAmount: "$38,000,000", subordinateAmount: "$9,500,000", propertyValue: "$62,000,000", purchasePrice: "$58,000,000", currentLoanAmount: "", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "$3,100,000", manualLtv: "", dscr: "1.42", selectedStates: ["GA"], recourseType: "CASE BY CASE", numUnits: "185", numBuildings: "1", numAcres: "", retailUnits: [], address: { street: "265 Peachtree Center Ave", unit: "", city: "Atlanta", state: "GA", zip: "30303" } }] },
  ];

  const lenderSubmissions = [
    { deal_id: 1001, lender_id: 1, lender_name: "Acorn Street Capital", lender_email: "mark.froot@acornstreetcap.com", deal_title: "Apartments — $18,500,000", advisor_name: "Louis Palumbo", token: "sample_token_001", status: "info_requested", response_message: "We are interested but need the rent roll and T12 financials. Can you send those over?", created_at: new Date("2026-03-11").toISOString(), viewed_at: new Date("2026-03-11T14:30:00").toISOString(), responded_at: new Date("2026-03-12T09:00:00").toISOString() },
    { deal_id: 1001, lender_id: 2, lender_name: "Apollo Global Management", lender_email: "rhunter@apollolp.com", deal_title: "Apartments — $18,500,000", advisor_name: "Louis Palumbo", token: "sample_token_002", status: "viewed", response_message: "", created_at: new Date("2026-03-11").toISOString(), viewed_at: new Date("2026-03-12T10:15:00").toISOString(), responded_at: null },
    { deal_id: 1001, lender_id: 50, lender_name: "RRA Capital", lender_email: "mgoodwin@rracapital.com", deal_title: "Apartments — $18,500,000", advisor_name: "Louis Palumbo", token: "sample_token_003", status: "declined", response_message: "Deal size is below our minimum threshold for Florida multifamily.", created_at: new Date("2026-03-11").toISOString(), viewed_at: new Date("2026-03-11T16:00:00").toISOString(), responded_at: new Date("2026-03-11T16:45:00").toISOString() },
    { deal_id: 1002, lender_id: 2, lender_name: "Apollo Global Management", lender_email: "rhunter@apollolp.com", deal_title: "Office — $32,000,000", advisor_name: "Louis Palumbo", token: "sample_token_004", status: "sent", response_message: "", created_at: new Date("2026-03-12").toISOString(), viewed_at: null, responded_at: null },
    { deal_id: 1003, lender_id: 90, lender_name: "Apollo Global Management Senior", lender_email: "rhunter@apollolp.com", deal_title: "Apartments New Dev — $12,000,000 Pref", advisor_name: "Shuvo Hussain", token: "sample_token_005", status: "info_requested", response_message: "What is the current status of the general contractor selection? We would also like to see the proforma.", created_at: new Date("2026-03-13").toISOString(), viewed_at: new Date("2026-03-13T11:00:00").toISOString(), responded_at: new Date("2026-03-14T08:30:00").toISOString() },
  ];

  try {
    const existing = await sql`SELECT COUNT(*) as count FROM users`;
    if (parseInt(existing[0].count) > 0) {
      return NextResponse.json({ success: false, message: "Already seeded. Visit /api/seed?force=1 to re-seed." });
    }
    for (const item of users) await sql`INSERT INTO users (data) VALUES (${JSON.stringify(item)})`;
    for (const item of teamMembers) await sql`INSERT INTO team_members (data) VALUES (${JSON.stringify(item)})`;
    for (const item of deals) await sql`INSERT INTO submitted_deals (data) VALUES (${JSON.stringify(item)})`;

    // Seed lender submissions
    await sql`CREATE TABLE IF NOT EXISTS lender_submissions (
      id SERIAL PRIMARY KEY, deal_id INTEGER, lender_id INTEGER, lender_name TEXT,
      lender_email TEXT, deal_title TEXT, advisor_name TEXT, token TEXT UNIQUE,
      status TEXT DEFAULT 'sent', response_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), viewed_at TIMESTAMPTZ, responded_at TIMESTAMPTZ
    )`;
    for (const item of lenderSubmissions) {
      await sql`INSERT INTO lender_submissions (deal_id, lender_id, lender_name, lender_email, deal_title, advisor_name, token, status, response_message, created_at, viewed_at, responded_at)
        VALUES (${item.deal_id}, ${item.lender_id}, ${item.lender_name}, ${item.lender_email}, ${item.deal_title}, ${item.advisor_name}, ${item.token}, ${item.status}, ${item.response_message}, ${item.created_at}, ${item.viewed_at || null}, ${item.responded_at || null})
        ON CONFLICT (token) DO NOTHING`;
    }

    return NextResponse.json({ success: true, message: `Seeded: ${users.length} users, ${teamMembers.length} team, ${deals.length} deals, ${lenderSubmissions.length} lender submissions.` });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
