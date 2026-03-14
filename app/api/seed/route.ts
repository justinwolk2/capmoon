import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);

  const users = [
    { id: 1, username: "justin.wolk@capmoon.com", password: "Chairam1!", role: "admin", name: "Justin Wolk", blockedLenderIds: [] },
    { id: 2, username: "lpalumbo@capmoon.com", password: "Louis2024!", role: "advisor", name: "Louis Palumbo", blockedLenderIds: [], teamMemberId: 1 },
    { id: 3, username: "shussain@capmoon.com", password: "Shuvo2024!", role: "advisor", name: "Shuvo Hussain", blockedLenderIds: [], teamMemberId: 2 },
  ];

  const teamMembers = [
    { id: 1, name: "Louis Palumbo", email: "lpalumbo@capmoon.com", phone: "305-401-0076", photo: "/louis.jpg", geographicMarket: "Southeast, Florida", specialtyAreas: ["Senior", "Mezzanine", "Bridge"], title: "Vice President of Capital Advisory" },
    { id: 2, name: "Shuvo Hussain", email: "shussain@capmoon.com", phone: "347-993-5545", photo: "/Shuvo.jpeg", geographicMarket: "Northeast, New York", specialtyAreas: ["JV Equity", "Preferred Equity", "Mezzanine"], title: "Vice President of Capital Advisory" },
  ];

  const deals = [
    { id: 1001, submittedAt: "3/10/2026, 9:15:00 AM", seekerName: "Marcus Bellfield", capitalType: "Senior", assetMode: "single", collateralMode: "", status: "pending", assignedAdvisorIds: [1], assets: [{ id: 1, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower", assetType: "Apartments", loanAmount: "$18,500,000", seniorLoanAmount: "", subordinateAmount: "", propertyValue: "$26,000,000", purchasePrice: "$25,500,000", currentLoanAmount: "", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "$1,200,000", manualLtv: "", dscr: "1.28", selectedStates: ["FL"], recourseType: "CASE BY CASE", numUnits: "220", numBuildings: "4", numAcres: "", retailUnits: [], address: { street: "4801 Biscayne Blvd", unit: "", city: "Miami", state: "FL", zip: "33137" } }] },
    { id: 1002, submittedAt: "3/11/2026, 2:30:00 PM", seekerName: "Diana Okafor", capitalType: "Senior", assetMode: "single", collateralMode: "", status: "pending", assignedAdvisorIds: [1], assets: [{ id: 1, ownershipStatus: "Refinance", dealType: "Bridge", refinanceType: "Cash Out-Value Add", assetType: "Office", loanAmount: "$32,000,000", seniorLoanAmount: "", subordinateAmount: "", propertyValue: "$48,000,000", purchasePrice: "", currentLoanAmount: "$24,000,000", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "$2,400,000", manualLtv: "", dscr: "1.35", selectedStates: ["NY"], recourseType: "NON RECOURSE", numUnits: "", numBuildings: "", numAcres: "", retailUnits: [], address: { street: "1221 Avenue of the Americas", unit: "15th Floor", city: "New York", state: "NY", zip: "10020" } }] },
    { id: 1003, submittedAt: "3/12/2026, 11:00:00 AM", seekerName: "Trevor Sandoval", capitalType: "Preferred Equity", assetMode: "single", collateralMode: "", status: "pending", assignedAdvisorIds: [2], assets: [{ id: 1, ownershipStatus: "Acquisition", dealType: "New Development", refinanceType: "Cash Out to Borrower", assetType: "Apartments", loanAmount: "$12,000,000", seniorLoanAmount: "$55,000,000", subordinateAmount: "$12,000,000", propertyValue: "$82,000,000", purchasePrice: "$68,000,000", currentLoanAmount: "", landCost: "$14,000,000", softCosts: "$8,500,000", originationClosingCosts: "$1,200,000", hardCosts: "$38,000,000", carryingCosts: "$2,800,000", borrowerEquity: "$9,500,000", ltvMode: "AUTO", currentNetIncome: "", manualLtv: "", dscr: "", selectedStates: ["TX"], recourseType: "NON RECOURSE", numUnits: "312", numBuildings: "2", numAcres: "", retailUnits: [], address: { street: "3200 Main Street", unit: "", city: "Houston", state: "TX", zip: "77002" } }] },
    { id: 1004, submittedAt: "3/13/2026, 4:45:00 PM", seekerName: "Rachel Kim", capitalType: "Mezzanine", assetMode: "single", collateralMode: "", status: "pending", assignedAdvisorIds: [2], assets: [{ id: 1, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower", assetType: "Hotel/Hospitality", loanAmount: "$9,500,000", seniorLoanAmount: "$38,000,000", subordinateAmount: "$9,500,000", propertyValue: "$62,000,000", purchasePrice: "$58,000,000", currentLoanAmount: "", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "$3,100,000", manualLtv: "", dscr: "1.42", selectedStates: ["GA"], recourseType: "CASE BY CASE", numUnits: "185", numBuildings: "1", numAcres: "", retailUnits: [], address: { street: "265 Peachtree Center Ave", unit: "", city: "Atlanta", state: "GA", zip: "30303" } }] },
  ];

  try {
    const existing = await sql`SELECT COUNT(*) as count FROM users`;
    if (parseInt(existing[0].count) > 0) {
      return NextResponse.json({ success: false, message: "Already seeded." });
    }
    for (const item of users) {
      await sql`INSERT INTO users (data) VALUES (${JSON.stringify(item)})`;
    }
    for (const item of teamMembers) {
      await sql`INSERT INTO team_members (data) VALUES (${JSON.stringify(item)})`;
    }
    for (const item of deals) {
      await sql`INSERT INTO submitted_deals (data) VALUES (${JSON.stringify(item)})`;
    }
    return NextResponse.json({ success: true, message: `Seeded: ${users.length} users, ${teamMembers.length} team members, ${deals.length} deals.` });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
