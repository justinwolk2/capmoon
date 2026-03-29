"use client";
import React, { useMemo, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Building2, FileSpreadsheet, FileText, Filter, Gauge, Landmark, Plus, Search, ShieldCheck, Upload, Users, Trash2, ChevronRight, ChevronLeft, CheckCircle, Edit2, Sparkles, Loader2, Lock, LogOut, Settings, Eye, EyeOff, Bell } from "lucide-react";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type LenderContact = { id: number; name: string; phone: string; email: string; region: string; };
type LenderRecord = {
  id: number; source: string; spreadsheetRow: string; program: string; lender: string;
  type: string; minLoan: string; maxLoan: string; maxLtv: string; minDscr: string;
  states: string[]; assets: string[]; status: string; email: string; phone: string; recourse: string;
  contactPerson?: string; website?: string; sponsorStates?: string[]; loanTerms?: string;
  typeOfLoans?: string[]; programTypes?: string[]; typeOfLenders?: string[]; contacts?: LenderContact[]; notes?: string; capitalTypePrograms?: CapitalTypeProgram[]; originalId?: number;
};
type RetailUnit = { id: number; tenant: string; rent: string; sqft: string; };
type AssetAddress = { street: string; unit: string; city: string; state: string; zip: string; };
type AssetData = {
  id: number; ownershipStatus: string; dealType: string; refinanceType: string; assetType: string;
  loanAmount: string; seniorLoanAmount: string; subordinateAmount: string;
  propertyValue: string; purchasePrice: string; currentLoanAmount: string;
  landCost: string; softCosts: string; originationClosingCosts: string;
  hardCosts: string; carryingCosts: string; borrowerEquity: string;
  ltvMode: string; currentNetIncome: string; manualLtv: string; dscr: string; currentRate: string;
  purchaseYear?: string; fullyEntitled?: "yes" | "no"; currentPropertyValue?: string; additionalEquity?: string; arvNetIncome?: string;
  selectedStates: string[]; recourseType: string;
  numUnits: string; numBuildings: string; numAcres: string; retailUnits: RetailUnit[];
  address: AssetAddress;
};
type CapitalTypeProgram = {
  capitalType: string; minLoan: string; maxLoan: string; maxLtv: string;
  loanTerms: string[]; propertyTypes: string[];
};
type NewLenderForm = {
  programName: string; contactPerson: string; email: string; phone: string; website: string;
  typeOfLenders: string[]; typeOfLoans: string[]; programTypes: string[]; propertyTypes: string[]; loanTerms: string[]; notes: string;
  minLoan: string; maxLoan: string; maxLtv: string; targetStates: string[];
  sponsorStates: string[]; recourse: string; capitalTypes: string[]; capitalTypePrograms: CapitalTypeProgram[]; contacts: LenderContact[]; status: string;
};
type TeamMember = {
  id: number; name: string; email: string; phone: string; photo: string;
  geographicMarket: string; specialtyAreas: string[]; title: string;
};
type AppUser = {
  id: number; username: string; password: string; role: "admin" | "advisor" | "staff" | "capital-seeker" | "lender"; linkedLenderId?: number; emailPrefs?: EmailPrefs; advisorCode?: string; dealSequenceStart?: number; blocked?: boolean;
  name: string; blockedLenderIds: number[]; teamMemberId?: number; phone?: string; email?: string;
};
type SubmittedDeal = {
  id: number; submittedAt: string; seekerName: string;
  seekerEmail?: string; seekerPhone?: string; notes?: string; dealNumber?: string;
  assets: AssetData[]; capitalType: string; assetMode: string; collateralMode: string;
  status: "pending" | "assigned" | "closed"; assignedAdvisorIds: number[];
  invitedUserIds?: number[];
  photos?: { id: number; url: string; caption: string }[];
};
type DeleteRequest = {
  id: number; lenderId: number; lenderName: string; requestedBy: string; requestedAt: string; status: "pending" | "approved" | "denied";
};
type LenderChangeRequest = {
  id: number;
  changeType: "add" | "edit";
  lenderId?: number; // for edits — the existing lender's id
  lenderName: string;
  proposedData: LenderRecord; // full proposed lender record
  requestedBy: string;
  requestedById: number;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
};
type EmailPrefs = {
  dealSubmitted: boolean; lenderResponded: boolean; documentRequested: boolean;
  statusChanged: boolean; dealAssigned: boolean;
};

type StaffEditHistory = {
  id: number; lenderId: number; lenderName: string; editedBy: string; editedAt: string;
  previousData: any; currentData: any; reverted: boolean;
};

type LenderSubmission = {
  id: number; dealId: number; lenderId: number; lenderName: string; lenderEmail: string;
  dealTitle: string; advisorName: string; token: string;
  status: "sent" | "viewed" | "declined" | "info_requested";
  responseMessage?: string; createdAt: string; viewedAt?: string; respondedAt?: string;
};

type AuthSession = { user: AppUser; } | null;
type MatcherStep = "ai-prompt" | "start" | "asset-count" | "asset-form" | "review" | "results" | "hybrid-count" | "hybrid-form";
type HybridSubLayer = { id: number; type: string; amount: string; };
type HybridProperty = {
  id: number;
  ownershipStatus: "Acquisition" | "Refinance";
  assetType: string;
  dealType: string;
  purchasePrice: string;
  currentValue: string;
  // Project cost fields (for acquisition value add / construction / new dev)
  hardCosts: string;
  softCosts: string;
  closingCosts: string;
  carryingCosts: string;
  entitlementCosts: string;
  seniorLoan: string;
  subLayers: HybridSubLayer[];
  borrowerEquity: string;
  currentLoan: string;
  // Full property details
  address: AssetAddress;
  numUnits: string;
  numBuildings: string;
  numAcres: string;
  currentNetIncome: string;
  dscr: string; // reused as cap rate % for acquisitions
  arvValue: string; // manually entered or auto-calc'd
  selectedStates: string[];
  recourseType: string;
  notes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const initialTeamMembers: TeamMember[] = [
  { id: 1, name: "Louis Palumbo", email: "lpalumbo@capmoon.com", phone: "305-401-0076", photo: "/louis.jpg", geographicMarket: "Southeast, Florida", specialtyAreas: ["Senior", "Mezzanine", "Bridge"], title: "Vice President of Capital Advisory" },
  { id: 2, name: "Shuvo Hussain", email: "shussain@capmoon.com", phone: "347-993-5545", photo: "/Shuvo.jpeg", geographicMarket: "Northeast, New York", specialtyAreas: ["JV Equity", "Preferred Equity", "Mezzanine"], title: "Vice President of Capital Advisory" },
];

const initialUsers: AppUser[] = [
  { id: 1, username: "justin.wolk@capmoon.com", password: "Chairam1!", role: "admin", name: "Justin Wolk", blockedLenderIds: [] },
  { id: 2, username: "lpalumbo@capmoon.com", password: "Louis2024!", role: "advisor", name: "Louis Palumbo", blockedLenderIds: [], teamMemberId: 1 },
  { id: 3, username: "shussain@capmoon.com", password: "Shuvo2024!", role: "advisor", name: "Shuvo Hussain", blockedLenderIds: [], teamMemberId: 2 },
  { id: 4, username: "testlender@example.com", password: "Lender2024!", role: "lender", name: "Test Lender", blockedLenderIds: [], linkedLenderId: 1 },
];

const seedLenders: LenderRecord[] = [
  { id: 1, source: "Spreadsheet", spreadsheetRow: "R2", program: "Acorn Street Capital", lender: "Acorn Street Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["MA", "NH", "NY", "CA", "FL", "RI"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "mark.froot@acornstreetcap.com", phone: "617 758 8955, 978-394-3056", recourse: "CASE BY CASE", contactPerson: "Mark Froot", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["MA", "NY", "CA"], notes: "Cannabis, Industrial, Bridge, Esoteric Receivable (Personal Injury Claims, Life Settlements), Equipment Financing, Fast Close, Fast Casual, Skilled Nursing, Senior Living, Energy" },
  { id: 2, source: "Spreadsheet", spreadsheetRow: "R3", program: "Apollo Global Management - Subordinate", lender: "Apollo Global Management", type: "Mezzanine", minLoan: "$20,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "rhunter@apollolp.com", phone: "Office: (212) 822-0691 Mobile: (646) 574-9262", recourse: "FULL", contactPerson: "Rachel Hunter", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "5.5%-12%+" },
  { id: 3, source: "Spreadsheet", spreadsheetRow: "R4", program: "Argentic - Mezz, Pref", lender: "Argentic", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$200,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "lberger@argenticmgmt.com", phone: "646-560-1732", recourse: "NON RECOURSE", contactPerson: "Loren Berger", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 4, source: "Spreadsheet", spreadsheetRow: "R5", program: "Barings - pref equity", lender: "Barings", type: "Mezzanine", minLoan: "$12,000,000", maxLoan: "$1.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Co-living"], status: "Active", email: "matthew.hoysa@barings.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Matthew Hoysa", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 5, source: "Spreadsheet", spreadsheetRow: "R6", program: "Bloomfield Capital", lender: "Bloomfield Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "btruscott@bloomfieldcapital.com, acandler@bloomfieldcapital.com", phone: "(248) 220-1964, 310-620-6000", recourse: "CASE BY CASE", contactPerson: "Brent Truscott, Adam Candler", loanTerms: "1 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 6, source: "Spreadsheet", spreadsheetRow: "R7", program: "Bluestone Capital Group - Mezz & Pref Equity", lender: "Bluestone Capital Group", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land"], status: "Active", email: "cstephens@bluestonegrp.com", phone: "(212) 991-6601", recourse: "CASE BY CASE", contactPerson: "Chris Stephens", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "1-3 points in origination fees" },
  { id: 7, source: "Spreadsheet", spreadsheetRow: "R8", program: "Bridge Investment Group", lender: "Bridge Investment Group", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "a.wininger@bridgeig.com", phone: "646-690-9360", recourse: "FULL", contactPerson: "Adam Wininger", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Specialty is multifamily and office Usually L+300 to L+500" },
  { id: 8, source: "Spreadsheet", spreadsheetRow: "R9", program: "Circle Squared Alternative Investments", lender: "Circle Squared Alternative Investments", type: "Preferred Equity", minLoan: "$3,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["NJ", "NY", "FL", "TX"], assets: ["Apartments", "Condos", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "jeff.sica@circlesquaredalts.com;", phone: "9735326846", recourse: "CASE BY CASE", contactPerson: "Jeff Sica", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 9, source: "Spreadsheet", spreadsheetRow: "R10", program: "Colony Capital (CLNC) - mezz/pref", lender: "Colony Northstar", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "kburke@clny.com", phone: "212.547.2777", recourse: "CASE BY CASE", contactPerson: "Kailey Burke", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 10, source: "Spreadsheet", spreadsheetRow: "R11", program: "SBA Complete", lender: "SBA Complete", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "lolson@firstbanksba.com", phone: "559-301-2622", recourse: "FULL", contactPerson: "Lucas Olsen", loanTerms: "10 year, 15 year, 20 year, 25 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "SBA origination owned by FirstBank. Can place with other banks if FirstBank doesn't commit." },
  { id: 11, source: "Spreadsheet", spreadsheetRow: "R12", program: "COREBANK", lender: "COREBANK", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "75%", minDscr: "N/A", states: ["OK"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "ddarby@corebankok.com", phone: "405-213-7974", recourse: "CASE BY CASE", contactPerson: "David Darby", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["OK"], notes: "" },
  { id: 12, source: "Spreadsheet", spreadsheetRow: "R13", program: "Crossharbor", lender: "Crossharbor", type: "Preferred Equity", minLoan: "$10,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Co-living"], status: "Active", email: "eboyd@CrossHarborCapital.com", phone: "949-438-2061", recourse: "CASE BY CASE", contactPerson: "Eric Boyd", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Mezz type equity for multi-family, get out at permanent finacning for a multiple and pref. return rate" },
  { id: 13, source: "Spreadsheet", spreadsheetRow: "R14", program: "CV Capital Funding", lender: "CV Capital Funding", type: "Senior", minLoan: "$750,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "nferrarone@cvcapitalfunding.com", phone: "212.593.5100", recourse: "CASE BY CASE", contactPerson: "Nick Ferrarone", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Rate - 8.5-10.5%, High LTV - last dollar up to 80%, no bridge to bridge deals (no refinancing out an existing bridge lender, they want to be first).  Outside of tri-state, $1mm minimum with max 75% LTV." },
  { id: 14, source: "Spreadsheet", spreadsheetRow: "R15", program: "Davidson Kempner - mezz/pref", lender: "Davidson Kempner", type: "Mezzanine", minLoan: "$40,000,000", maxLoan: "$250,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "alliu@dkpartners.com", phone: "646-282-5869", recourse: "CASE BY CASE", contactPerson: "Alan Liu", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Distress, restructuring, capital dislocation, complex situations" },
  { id: 15, source: "Spreadsheet", spreadsheetRow: "R16", program: "Dune Real Estate Partners - JV Equity", lender: "Dune Real Estate Partners", type: "Preferred Equity", minLoan: "$25,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "eric.calder@drep.com", phone: "212.301.8371", recourse: "CASE BY CASE", contactPerson: "Eric Calder", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Very selective on hospitality development, want \"irreplaceable\" asset." },
  { id: 16, source: "Spreadsheet", spreadsheetRow: "R17", program: "Eli Partners", lender: "Eli Partners", type: "Preferred Equity", minLoan: "$4,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Mobile Home Park", "Co-living"], status: "Active", email: "james.rohrbach@gmail.com", phone: "415-312-2979", recourse: "CASE BY CASE", contactPerson: "James Rohrbach", loanTerms: "", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Capital provider on \"innovative\" multifamily projects in mid-sized secondary cities. Columbus, Lousville, Charleston, Raleigh. Higher underlying cap rates than hottest markets. Co-living (Brad Hargreaves is close friend). Love affordability angle. James Rohrbach was tech entrepreneur, James Ryan is real estate background." },
  { id: 17, source: "Spreadsheet", spreadsheetRow: "R18", program: "Eli Partners - ground up", lender: "Eli Partners", type: "Preferred Equity", minLoan: "$4,000,000", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Mobile Home Park", "Co-living"], status: "Active", email: "james.rohrbach@gmail.com", phone: "415-312-2979", recourse: "CASE BY CASE", contactPerson: "James Rohrbach", loanTerms: "", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Capital provider on \"innovative\" multifamily projects in mid-sized secondary cities. Columbus, Lousville, Charleston, Raleigh. Higher underlying cap rates than hottest markets. Co-living (Brad Hargreaves is close friend). Love affordability angle. James Rohrbach was tech entrepreneur, James Ryan is real estate background." },
  { id: 18, source: "Spreadsheet", spreadsheetRow: "R19", program: "Envoy", lender: "Envoy", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "scounts@envoynnn.com", phone: "850-832-9956", recourse: "CASE BY CASE", contactPerson: "Stephen Counts", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Will also do sale-leaseback financing and ground-lease bifurcations" },
  { id: 19, source: "Spreadsheet", spreadsheetRow: "R20", program: "EquiMax - Southern California", lender: "EquiMax", type: "Senior", minLoan: "$2,000,000", maxLoan: "$5,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "sean@emaxloan.com", phone: "310-873-9550", recourse: "CASE BY CASE", contactPerson: "Sean Namvar", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 20, source: "Spreadsheet", spreadsheetRow: "R21", program: "EverWest - construction mezz/pref", lender: "EverWest Real Estate Partners", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Other"], status: "Active", email: "zisen.chong@everwest.com", phone: "(303) 763 2268", recourse: "CASE BY CASE", contactPerson: "Zi Chong", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 21, source: "Spreadsheet", spreadsheetRow: "R22", program: "EverWest - mezz", lender: "EverWest Real Estate Partners", type: "Mezzanine", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "zisen.chong@everwest.com", phone: "(303) 763 2268", recourse: "CASE BY CASE", contactPerson: "Zi Chong", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 22, source: "Spreadsheet", spreadsheetRow: "R23", program: "FCP", lender: "FCP - Structured Investments", type: "Mezzanine", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["MA", "NH", "VT", "RI", "NJ", "NY", "CT", "PA", "DE", "MD", "DC", "VA", "NC", "SC", "GA", "FL", "TN", "TX"], assets: ["Apartments", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "kmurphy@fcpdc.com", phone: "(240) 395-2019", recourse: "CASE BY CASE", contactPerson: "Kevin Murphy", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 23, source: "Spreadsheet", spreadsheetRow: "R24", program: "FCP - development", lender: "FCP", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "90%", minDscr: "N/A", states: ["MA", "NH", "CT", "NY", "NJ", "DE", "VT", "MD", "VA", "NC", "SC", "GA", "FL", "TN", "TX"], assets: ["Apartments", "Student Housing", "Office", "Light Industrial"], status: "Active", email: "kmurphy@fcpdc.com", phone: "(240) 395-2019", recourse: "CASE BY CASE", contactPerson: "Kevin Murphy", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Can do accrual on payments for the right deal" },
  { id: 24, source: "Spreadsheet", spreadsheetRow: "R25", program: "FCP - value-add/core plus", lender: "FCP", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "90%", minDscr: "N/A", states: ["MA", "NH", "CT", "NY", "NJ", "DE", "VT", "MD", "VA", "NC", "SC", "GA", "FL", "TN", "TX"], assets: ["Apartments", "Student Housing", "Office", "Light Industrial"], status: "Active", email: "kmurphy@fcpdc.com", phone: "(240) 395-2019", recourse: "CASE BY CASE", contactPerson: "Kevin Murphy", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Can do accrual on payments for the right deal" },
  { id: 25, source: "Spreadsheet", spreadsheetRow: "R26", program: "Gelt Financial - subordinate", lender: "Gelt Financial", type: "Mezzanine", minLoan: "$100,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jackmiller@geltfinancial.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Jack Miller", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 26, source: "Spreadsheet", spreadsheetRow: "R27", program: "Geolo Capital - mezz", lender: "Geolo Capital", type: "Mezzanine", minLoan: "$8,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Co-living"], status: "Active", email: "db@geolo.com", phone: "415-694-5810", recourse: "CASE BY CASE", contactPerson: "Duff Bedrosian", loanTerms: "10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Top 20 markets" },
  { id: 27, source: "Spreadsheet", spreadsheetRow: "R28", program: "Glass Cube - Pref Equity", lender: "Glasscube Capital", type: "Preferred Equity", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Co-living"], status: "Active", email: "roman@glasscubeinvestments.com", phone: "415-794-1834", recourse: "CASE BY CASE", contactPerson: "Roman Arzhintar", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "\"Debquity\" for multifamily & co-living projects in core markets. Doesn't like Chicago." },
  { id: 28, source: "Spreadsheet", spreadsheetRow: "R29", program: "Google - Bay Area Affordable Housing Fund", lender: "Google", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living"], status: "Active", email: "Tim@StackSource.com, tonisteele@google.com, housing-investments@google.com", phone: "(650) 499.9123", recourse: "CASE BY CASE", contactPerson: "Toni Steele", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Affordable housing development around Silicon Valley" },
  { id: 29, source: "Spreadsheet", spreadsheetRow: "R30", program: "H Equities - bridge", lender: "H Equities", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "85%", minDscr: "N/A", states: ["NY", "NJ", "CT", "GA"], assets: ["Apartments", "Condos", "Student Housing", "Assisted Living", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "elliot@hequities.com", phone: "718-766-8818", recourse: "CASE BY CASE", contactPerson: "Elliot Horowitz", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "9-10% plus, 70% leverage" },
  { id: 30, source: "Spreadsheet", spreadsheetRow: "R31", program: "JDM Capital - pref/mezz", lender: "JDM Capital", type: "Mezzanine", minLoan: "$2,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Hotel/Hospitality"], status: "Active", email: "admin@jdmcapitalcorp.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 31, source: "Spreadsheet", spreadsheetRow: "R32", program: "Juniper Capital Partners - JV Equity", lender: "Juniper Capital Partners", type: "Senior", minLoan: "$5,000,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "NV", "AZ", "ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "FL"], assets: ["Apartments", "Office", "Cannabis", "Hotel/Hospitality"], status: "Active", email: "jon@junipercptl.com, dennis@jreia.com, chris@jreia.com", phone: "973-214-4555", recourse: "NON RECOURSE", contactPerson: "Jon Strain, Dennis Onabajo", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["NY", "CA", "FL", "AZ"], notes: "JV Equity is for co-GP position. Offices in LA, Phoenix, Miami, and NY. Stay out of teriary but good with secondary. Focus on hospitality. More interested in Mezz debt deals" },
  { id: 32, source: "Spreadsheet", spreadsheetRow: "R33", program: "Kawa Capital Mangement - Mezz", lender: "Kawa Capital Management", type: "Mezzanine", minLoan: "$3,500,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care"], status: "Active", email: "Pooria@kawa.com", phone: "954-665-4133", recourse: "CASE BY CASE", contactPerson: "Pooria Dariush", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 33, source: "Spreadsheet", spreadsheetRow: "R34", program: "Lane Capital Partners - Bridge Program", lender: "Lane Capital Partners", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Land"], status: "Active", email: "jbaum@lanecp.com", phone: "212-444-9029", recourse: "CASE BY CASE", contactPerson: "Jeremy Baum", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Top 20 MSA's, college towns Suburbs w/ strong demographics, select vacation mkts; focused on distressed situations" },
  { id: 34, source: "Spreadsheet", spreadsheetRow: "R35", program: "LAYLA Bridge Product", lender: "Layla Capital", type: "Senior", minLoan: "$750,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["PA", "NY", "MD", "NJ", "ME", "MA", "NH", "CT", "IL", "FL", "GA", "RI", "DE", "VA", "NC", "OH", "SC", "DC"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "peter@laylacapital.com", phone: "212-600-2276", recourse: "CASE BY CASE", contactPerson: "Peter Paladino", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Closes quick, as little as 2 weeks, focus on NE, SE, Midwest" },
  { id: 35, source: "Spreadsheet", spreadsheetRow: "R36", program: "Lightstone - Mezz/Pref", lender: "Lightstone", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "erozovsky@lightstonegroup.com, jfhima@lightstonegroup.com", phone: "212-324-0231", recourse: "CASE BY CASE", contactPerson: "Eugene Rozovsky", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 36, source: "Spreadsheet", spreadsheetRow: "R37", program: "Loews Corporation - Mortgage Program", lender: "Continental Casualty Company", type: "Senior", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "mcotler@loews.com", phone: "212-521-2963", recourse: "CASE BY CASE", contactPerson: "Michael Cotler", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Run by Beth before sending over to Mike" },
  { id: 37, source: "Spreadsheet", spreadsheetRow: "R38", program: "Marquee Funding Group - CA & CO Lending", lender: "Marquee Funding Group", type: "Senior", minLoan: "$50,000", maxLoan: "$30,000,000", maxLtv: "70%", minDscr: "N/A", states: ["CA", "CO"], assets: ["Apartments", "Condos", "SFR Portfolio", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage"], status: "Active", email: "sstein@marqueefg.com", phone: "(818) 222-5222", recourse: "CASE BY CASE", contactPerson: "Sammy Stein", loanTerms: "1 year, 10 year, 2 year, 20 year, 3 year, 30 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 38, source: "Spreadsheet", spreadsheetRow: "R39", program: "Met Life Real Estate - Mezz", lender: "MetLife Real Estate", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Medical Office", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "patrick.lim@metlife.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Patrick Lim", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 39, source: "Spreadsheet", spreadsheetRow: "R40", program: "MidHudson - Pref Equity over HUD", lender: "MidHudson", type: "Mezzanine", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Assisted Living"], status: "Active", email: "dford@midhudsonre.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Dan Ford", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Refinance"], sponsorStates: [], notes: "\"Exclusively for HUD, and the pref product on the d4 is only for the reserve requirements under that loan program.  Its a niche product, but there's a lot of enthusiasm for it with HUD originators and borrowers.\"" },
  { id: 40, source: "Spreadsheet", spreadsheetRow: "R41", program: "NexBank - value add multifamily", lender: "NexBank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "80%", minDscr: "N/A", states: ["TX", "CA"], assets: ["Apartments"], status: "Active", email: "jeff.kocher@nexbank.com", phone: "972-934-4722", recourse: "CASE BY CASE", contactPerson: "Jeff Kocher", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "• Going-in Fully Funded Amortizing DSCR of ~1.00x based on In-Place NOI • Pro-forma Amortizing DSCR of at least 1.20x • Earn-outs available if stabilized NOI supports a higher loan amount and meets DSCR hurdles" },
  { id: 41, source: "Spreadsheet", spreadsheetRow: "R42", program: "NRE Capital Partners - Bridge", lender: "NRE Capital Partners", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "seth@nrecp.com", phone: "516-439-4988", recourse: "CASE BY CASE", contactPerson: "Seth Weis", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 42, source: "Spreadsheet", spreadsheetRow: "R43", program: "NXT Capital", lender: "NXT Capital", type: "Senior", minLoan: "$15,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "edwin.kwon@nxtcapital.com", phone: "562-733-2409", recourse: "CASE BY CASE", contactPerson: "Eddie Kwon", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 43, source: "Spreadsheet", spreadsheetRow: "R44", program: "Onyx Equities", lender: "Onyx Equities", type: "Preferred Equity", minLoan: "$5,000,000", maxLoan: "$30,000,000", maxLtv: "", minDscr: "N/A", states: ["NJ", "NY", "CT", "PA"], assets: ["Apartments", "Condos", "Student Housing", "SFR Portfolio", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jschultz@onyxequities.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Jon Schultz", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Talk to Tim before reaching out to Jon" },
  { id: 44, source: "Spreadsheet", spreadsheetRow: "R45", program: "Osprey Capital - subordinate", lender: "Osprey Capital", type: "Mezzanine", minLoan: "$1,000,000", maxLoan: "$7,000,000", maxLtv: "85%", minDscr: "N/A", states: ["FL", "GA", "SC", "NC", "AL", "TN", "VA", "WV", "MS", "KY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "gk@ospreycre.com, blee@ospreycre.com", phone: "813-833-4697", recourse: "CASE BY CASE", contactPerson: "Gus Katsadouros", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 45, source: "Spreadsheet", spreadsheetRow: "R46", program: "Outlier Capital", lender: "Outlier Capital", type: "Preferred Equity", minLoan: "$2,000,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["MD", "DC", "VA"], assets: ["Co-living"], status: "Active", email: "shai@outliercap.com", phone: "201­.982­.0283", recourse: "CASE BY CASE", contactPerson: "Shai Romirowsky", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Selective on construction, needs a reputable sponsor. Expensive stretch senior debt. More mezz/pref." },
  { id: 46, source: "Spreadsheet", spreadsheetRow: "R47", program: "Pacific Holdings", lender: "Pacific Holdings", type: "Senior", minLoan: "$30,000,000", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "jrhim@pacificholdings.co", phone: "", recourse: "CASE BY CASE", contactPerson: "John Rhim", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Selective on construction, needs a reputable sponsor. Expensive stretch senior debt. More mezz/pref." },
  { id: 47, source: "Spreadsheet", spreadsheetRow: "R48", program: "QuickLiquidity - Mezz", lender: "QuickLiquidity", type: "Mezzanine", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "team@quickliquidity.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Refinance"], sponsorStates: [], notes: "" },
  { id: 48, source: "Spreadsheet", spreadsheetRow: "R49", program: "RealEx Capital", lender: "RealEx Capital", type: "Preferred Equity", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["NY", "NJ", "CT", "PA"], assets: ["Apartments", "Office"], status: "Active", email: "EG@realexcapital.com", phone: "212.317.2310", recourse: "CASE BY CASE", contactPerson: "Elie Gross", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "Family office based in New York" },
  { id: 49, source: "Spreadsheet", spreadsheetRow: "R50", program: "RealtyMogul", lender: "RealtyMogul", type: "Mezzanine", minLoan: "$0", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "elizabeth.braman@realtymogul.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Elizabeth Braman", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 50, source: "Spreadsheet", spreadsheetRow: "R51", program: "RRA Capital", lender: "RRA Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mgoodwin@rracapital.com,TVilhauer@rracapital.com", phone: "602-715-2208", recourse: "CASE BY CASE", contactPerson: "Marcus Goodwin,  Ty Vilhauer", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "L+325 - L+575" },
  { id: 51, source: "Spreadsheet", spreadsheetRow: "R52", program: "S3 Capital", lender: "S3 Capital", type: "Senior", minLoan: "$800,000", maxLoan: "$200,000,000", maxLtv: "72%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Assisted Living", "Office", "Retail-Multi Tenant", "Hotel/Hospitality", "Land"], status: "Active", email: "steven@s3cap.com, andrew@s3cap.com", phone: "908-309-6873, 212-300-8813", recourse: "CASE BY CASE", contactPerson: "Steven Jemal, Andrew Yakubovich", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Land, Construction, and Bridge in NYC and close by; NY, NJ, Top MSA's" },
  { id: 52, source: "Spreadsheet", spreadsheetRow: "R53", program: "Shelter Growth Capital Partners", lender: "SG Capital Partners", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "tedwards@sgcp.com, dsakhrani@sgcp.com", phone: "203-355-6132", recourse: "CASE BY CASE", contactPerson: "Tim Edwards", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 53, source: "Spreadsheet", spreadsheetRow: "R54", program: "Shelter Growth Capital Partners- Mezz", lender: "SG Capital Partners", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$35,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "tedwards@sgcp.com, dsakhrani@sgcp.com", phone: "203-355-6132", recourse: "CASE BY CASE", contactPerson: "Tim Edwards", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 54, source: "Spreadsheet", spreadsheetRow: "R55", program: "Square Mile - Equity", lender: "Square Mile Capital Management", type: "Preferred Equity", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "erattner@squaremilecapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Elliot Ratner", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 55, source: "Spreadsheet", spreadsheetRow: "R56", program: "Starwood Property Trust - balance sheet", lender: "Starwood Property Trust", type: "Senior", minLoan: "$75,000,000", maxLoan: "$500,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jdybas@starwood.com", phone: "917-833-2581", recourse: "NON RECOURSE", contactPerson: "Jeff Dybas", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 56, source: "Spreadsheet", spreadsheetRow: "R57", program: "Starwood Property Trust - multifamily value add", lender: "Starwood Property Trust", type: "Senior", minLoan: "$30,000,000", maxLoan: "$500,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jdybas@starwood.com", phone: "917-833-2581", recourse: "NON RECOURSE", contactPerson: "Jeff Dybas", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 57, source: "Spreadsheet", spreadsheetRow: "R58", program: "Sundance Bay Debt Strategies", lender: "Sundance Bay Debt Strategies", type: "Senior", minLoan: "$2,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "apeterson@sundancebay.com", phone: "801-403-5030", recourse: "CASE BY CASE", contactPerson: "Andrew Peterson", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Like construction" },
  { id: 58, source: "Spreadsheet", spreadsheetRow: "R59", program: "Terra - Subordinate", lender: "Terra Capital Partners", type: "Mezzanine", minLoan: "$15,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mfishbein@tcp-us.com", phone: "212-754-6092", recourse: "CASE BY CASE", contactPerson: "Mike Fishbein", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 59, source: "Spreadsheet", spreadsheetRow: "R60", program: "Twining Properties - multifamily pref equity", lender: "Twining Properties", type: "Mezzanine", minLoan: "$15,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["ME", "MA", "CT", "NH", "NY", "PA", "NJ", "MD", "DC", "VT", "DE", "RI"], assets: ["Apartments", "Senior Housing", "Student Housing", "Co-living", "Office", "Retail-Multi Tenant"], status: "Active", email: "philip.wharton@twiningproperties.com", phone: "212.704.2015", recourse: "CASE BY CASE", contactPerson: "Phil Wharton", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Equity at 9% pref, Northeast Corridor" },
  { id: 60, source: "Spreadsheet", spreadsheetRow: "R61", program: "UC Funds - UC GO", lender: "UC Funds", type: "Senior", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "", phone: "", recourse: "NON RECOURSE", contactPerson: "", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "DSCR down to 0.5x, up to 85% LTV" },
  { id: 61, source: "Spreadsheet", spreadsheetRow: "R62", program: "United Community Bank", lender: "United Community Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["GA", "FL", "TN", "SC", "NC"], assets: ["Apartments", "Student Housing", "Assisted Living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "quick liquiti", phone: "706-878-0858", recourse: "FULL", contactPerson: "Sagar Patel", loanTerms: "5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["GA", "FL", "TN", "SC", "NC"], notes: "The Borrower needs to be in the Banks Footprint, no ground up self storage" },
  { id: 62, source: "Spreadsheet", spreadsheetRow: "R63", program: "Upstate Bank - Upstate NY Product", lender: "Upstate National Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$3,500,000", maxLtv: "80%", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Medical Office", "Self-storage", "Hospital/Health Care"], status: "Active", email: "fcipriano@upstatebank.com", phone: "585-672-6692", recourse: "FULL", contactPerson: "Frank Cipriano", loanTerms: "10 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 63, source: "Spreadsheet", spreadsheetRow: "R64", program: "1st National Bank (Cincinnati)", lender: "1st National Bank (Cincinnati)", type: "Senior", minLoan: "$0", maxLoan: "$2,000,000", maxLtv: "", minDscr: "N/A", states: ["OH"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "rstillings@bankwith1st.com", phone: "513-932-3221", recourse: "FULL", contactPerson: "Ron Stillings", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Sponsor must be local" },
  { id: 64, source: "Spreadsheet", spreadsheetRow: "R65", program: "Aareal Capital", lender: "Aareal Capital", type: "Senior", minLoan: "$40,000,000", maxLoan: "$400,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "pgheysen@aareal-capital.com", phone: "212-508-4090", recourse: "FULL", contactPerson: "Pam Gheyson", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 65, source: "Spreadsheet", spreadsheetRow: "R66", program: "ABP Capital - Bridge Program", lender: "ABP Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Hotel/Hospitality", "Land", "Self-storage"], status: "Active", email: "alange@abpcapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Alexander Lange", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Major MSAs" },
  { id: 66, source: "Spreadsheet", spreadsheetRow: "R67", program: "ACORE Capital - development", lender: "ACORE Capital", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "tfineman@acorecapital.com", phone: "212-235-1288", recourse: "FULL", contactPerson: "Tony Fineman", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 67, source: "Spreadsheet", spreadsheetRow: "R68", program: "ACRES Capital", lender: "ACRES Capital", type: "Senior", minLoan: "$8,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "phills@acrescap.com", phone: "(516) 400-8018", recourse: "NON RECOURSE", contactPerson: "Pete Hills", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Look for 1.1x as is DSCR, 1.2x+ at exit, allow interest reserves for lower DSCR.  No assisted living or skilled nursing On Co-living: potential reversion to multifamily is important. Don't take 50/50 chances.  No bridge to bridge. Best on fringes of major cities." },
  { id: 68, source: "Spreadsheet", spreadsheetRow: "R69", program: "Adroc Capital - HUD/FHA", lender: "Adroc Capital LLC", type: "Senior", minLoan: "$1,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Assisted Living"], status: "Active", email: "abrum@adroccap.com", phone: "516-260-4200", recourse: "NON RECOURSE", contactPerson: "Avi Brum", loanTerms: "35 year, 40 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Does Multi Fam (Perm, New Construction, & Sub-Rehab) & Healthcare (Perm, New Construction, & Sub-Rehab) FHA Program" },
  { id: 69, source: "Spreadsheet", spreadsheetRow: "R70", program: "Adventure Credit Union", lender: "Adventure Credit Union", type: "Senior", minLoan: "$0", maxLoan: "$300,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "nickl@adventurecu.org", phone: "616-514-1816", recourse: "FULL", contactPerson: "Nick Lemke", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Max out at $4mm in total loans per lender" },
  { id: 70, source: "Spreadsheet", spreadsheetRow: "R71", program: "Aegon - via Walker & Dunlop", lender: "Aegon", type: "Senior", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6346", recourse: "FULL", contactPerson: "Dave Semmer", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 71, source: "Spreadsheet", spreadsheetRow: "R72", program: "AIG", lender: "AIG", type: "Senior", minLoan: "$30,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "michael.medvin@aig.com", phone: "", recourse: "FULL", contactPerson: "Michael Medvin", loanTerms: "10 year, 15 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Based in London, they'd pull in originators from the US team" },
  { id: 72, source: "Spreadsheet", spreadsheetRow: "R73", program: "Alcova Capital - 1", lender: "Alcova Capital", type: "Senior", minLoan: "$3,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["NY", "MA", "DC", "FL", "IL", "CA", "NV"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "mgrodin@alcovacap.com", phone: "", recourse: "FULL", contactPerson: "Matt Grodin", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 73, source: "Spreadsheet", spreadsheetRow: "R74", program: "Alcova Capital - 2", lender: "Alcova Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "mgrodin@alcovacap.com", phone: "", recourse: "FULL", contactPerson: "Matt Grodin", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 74, source: "Spreadsheet", spreadsheetRow: "R75", program: "Allegiant", lender: "Allegiant", type: "Senior", minLoan: "$15,000,000", maxLoan: "$150,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "bmilde@allegiantrec.com", phone: "646-362-6504", recourse: "CASE BY CASE", contactPerson: "Ben Milde", loanTerms: "1 year, 10 year, 15 year, 2 year, 20 year, 25 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Added from Commercial Mortgage Alert ad, no direct contact yet" },
  { id: 75, source: "Spreadsheet", spreadsheetRow: "R76", program: "AllianceBernstein - transitional", lender: "AllianceBernstein", type: "Senior", minLoan: "$25,000,000", maxLoan: "$400,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "taylor.callaway@alliancebernstein.com", phone: "(212) 969 6886", recourse: "NON RECOURSE", contactPerson: "Taylor Calloway", loanTerms: "2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Unlevered debt fund. \"NFL\" cities or secondary city with great story." },
  { id: 76, source: "Spreadsheet", spreadsheetRow: "R77", program: "AllianceBernstein - transitional light", lender: "AllianceBernstein", type: "Senior", minLoan: "$20,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "taylor.callaway@alliancebernstein.com", phone: "(212) 969 6886", recourse: "NON RECOURSE", contactPerson: "Taylor Calloway", loanTerms: "2 year, 3 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Has existing cash flow or just completed construction, not a heavy lift." },
  { id: 77, source: "Spreadsheet", spreadsheetRow: "R78", program: "Altas Hospitality", lender: "Atlas Hospitality", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "65%", minDscr: "N/A", states: ["NV", "CA", "AZ", "UT", "OR", "WA", "WY", "ID", "NM", "MT", "CO"], assets: ["Hotel/Hospitality"], status: "Active", email: "alan@atlashospitality.com, billy@atlashospitality.com", phone: "949-622-3409", recourse: "FULL", contactPerson: "Alan Reay", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Up to 65-70% LTV, Can do new flag/renovations. Will Protect Broker and add in fee" },
  { id: 78, source: "Spreadsheet", spreadsheetRow: "R79", program: "Amalgamated Bank", lender: "Amalgamated", type: "Senior", minLoan: "$5,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "luisbasaldua@amalgamatedbank.com", phone: "212-895-4497", recourse: "CASE BY CASE", contactPerson: "Luis Basaldua", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 79, source: "Spreadsheet", spreadsheetRow: "R80", program: "American Equity Investment Life", lender: "American Equity Investment Life", type: "Senior", minLoan: "$3,000,000", maxLoan: "$30,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "FULL", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 12 year, 17 year, 20 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "AEIL is eager to do business. Most of their loans are 10-12/25-30, 17/17. of 20/20 (priced over 10-year treasury). They can offer 3 years I/O anytime during loan term for a deal if they really want it. Apartments, multi-tenant retail, self-storage, MH parks, office w/granular rent-rolls. 6% Minimum cap rate in underwriting." },
  { id: 80, source: "Spreadsheet", spreadsheetRow: "R81", program: "American Family Life", lender: "American Family Life", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "FULL", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "American Family Life usually use an imputed 6.50% cap rate when underwriting and need a 1.50:1 coverage. They have good fleXibility in their prepayment penalties and can adjust them to win a deal." },
  { id: 81, source: "Spreadsheet", spreadsheetRow: "R82", program: "American First Credit Union", lender: "American First Credit Union", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "OR", "WA", "ID", "MT", "WY", "UT", "CO", "AZ", "NV", "TX"], assets: ["Apartments", "SFR Portfolio", "Mobile Home Park", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "ttimmons@amerfirst.org", phone: "858-201-0443", recourse: "CASE BY CASE", contactPerson: "Teanna Timmons", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "No Prepay" },
  { id: 82, source: "Spreadsheet", spreadsheetRow: "R83", program: "American National - via Walker & Dunlop", lender: "American National", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6349", recourse: "FULL", contactPerson: "Dave Semmer", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 83, source: "Spreadsheet", spreadsheetRow: "R84", program: "American Pride Bank", lender: "American Pride Bank", type: "Senior", minLoan: "$0", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "darylcohen@americanpridebank.com", phone: "478-719-9390", recourse: "FULL", contactPerson: "Daryl Cohen", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "community bank in South metro ATL; will do conventional hotels and hotel construction; $3M is sweet spot" },
  { id: 84, source: "Spreadsheet", spreadsheetRow: "R85", program: "Amerifund", lender: "Amerifund Commercial Corp", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "80%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "m.rubino@amerifundcorp.com", phone: "847-374-9500", recourse: "NON RECOURSE", contactPerson: "Michael Rubino", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 85, source: "Spreadsheet", spreadsheetRow: "R86", program: "Amerifund - single tenant construction to perm", lender: "Amerifund Commercial Corp", type: "Senior", minLoan: "$3,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "1.05", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "m.rubino@amerifundcorp.com", phone: "847-374-9500", recourse: "NON RECOURSE", contactPerson: "Michael Rubino", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 86, source: "Spreadsheet", spreadsheetRow: "R87", program: "Ameriprise Financial/RiverSource Life Insurance", lender: "Ameriprise Financial/RiverSource Life Insurance", type: "Senior", minLoan: "$3,000,000", maxLoan: "$55,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "FULL", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "RiverSource can be very competitive on larger, conservative deals." },
  { id: 87, source: "Spreadsheet", spreadsheetRow: "R88", program: "Ameris Bank", lender: "Ameris Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$4,000,000", maxLtv: "", minDscr: "N/A", states: ["FL", "GA", "SC", "NC", "VA", "TN", "MS"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "brian.martin@amerisbank.com", phone: "404-580-7125", recourse: "FULL", contactPerson: "Brian Martin", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "SBA 7a. Can pay us up to 1%." },
  { id: 88, source: "Spreadsheet", spreadsheetRow: "R89", program: "Ameritas - via Walker & Dunlop", lender: "Ameritas", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6351", recourse: "FULL", contactPerson: "Dave Semmer", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 89, source: "Spreadsheet", spreadsheetRow: "R90", program: "Androscoggin Bank", lender: "Androscoggin Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["ME"], assets: ["Light Industrial"], status: "Active", email: "mvanuden@androscogginbank.com", phone: "207-518-6319", recourse: "FULL", contactPerson: "Maureen Van Uden", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 90, source: "Spreadsheet", spreadsheetRow: "R91", program: "Apollo Global Management - Senior", lender: "Apollo Global Management", type: "Senior", minLoan: "$35,000,000", maxLoan: "$200,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "rhunter@apollolp.com", phone: "Office: (212) 822-0691 Mobile: (646) 574-9262", recourse: "FULL", contactPerson: "Rachel Hunter", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Fixed: S+200+, up to 70% LTV Floating: L+250+, up to 75% LTV" },
  { id: 91, source: "Spreadsheet", spreadsheetRow: "R92", program: "Apple Bank", lender: "Apple Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$100,000,000", maxLtv: "50%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "lswedowsky@apple-bank.com", phone: "212-224-6512", recourse: "FULL", contactPerson: "Lee Swedowsky", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 92, source: "Spreadsheet", spreadsheetRow: "R93", program: "Arbor - 1", lender: "Arbor Commercial Mortgage", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jyoungworth@arbor.com", phone: "", recourse: "FULL", contactPerson: "", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 93, source: "Spreadsheet", spreadsheetRow: "R94", program: "Arbor - 2", lender: "Arbor Commercial Mortgage", type: "Senior", minLoan: "$5,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jyoungworth@arbor.com", phone: "", recourse: "FULL", contactPerson: "Jack Youngworth", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Doesnt lend on Condo. Only Stabilized." },
  { id: 94, source: "Spreadsheet", spreadsheetRow: "R95", program: "Arbor CMBS", lender: "Arbor Commercial Mortgage", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "sschwass@arbor.com", phone: "646-695-0687", recourse: "NON RECOURSE", contactPerson: "Sam Schwass", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 95, source: "Spreadsheet", spreadsheetRow: "R96", program: "Archway Fund", lender: "Archway Fund", type: "Senior", minLoan: "$2,000,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "marissa@archwayfund.com", phone: "424-270-0168", recourse: "NON RECOURSE", contactPerson: "Marissa Wilbur", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "10-day close, no appraisal required, can do 100% of rehab budget, non-recourse, 70-75% LTV, Interest only, fixed, up to 24-month term" },
  { id: 96, source: "Spreadsheet", spreadsheetRow: "R97", program: "Ares", lender: "Ares", type: "Senior", minLoan: "$10,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Co-living", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "jryu@aresmgmt.com", phone: "212-710-2116", recourse: "CASE BY CASE", contactPerson: "Joe Ryu", loanTerms: "3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 97, source: "Spreadsheet", spreadsheetRow: "R98", program: "Argentic - Bridge", lender: "Argentic", type: "Senior", minLoan: "$10,000,000", maxLoan: "$200,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "lberger@argenticmgmt.com", phone: "646-560-1732", recourse: "NON RECOURSE", contactPerson: "Loren Berger", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 98, source: "Spreadsheet", spreadsheetRow: "R99", program: "Argentic - CMBS", lender: "Argentic", type: "Senior", minLoan: "$5,000,000", maxLoan: "$200,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "lberger@argenticmgmt.com", phone: "646-560-1732", recourse: "NON RECOURSE", contactPerson: "Loren Berger", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 99, source: "Spreadsheet", spreadsheetRow: "R100", program: "Arden Group", lender: "Arden Group", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 100, source: "Spreadsheet", spreadsheetRow: "R101", program: "Arixa Capital", lender: "Arixa Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "TX", "OR", "WA"], assets: ["Apartments", "SFR Portfolio"], status: "Active", email: "vhotchandani@arixacapital.com", phone: "619-436-9899", recourse: "NON RECOURSE", contactPerson: "Vishal Hotchandani", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Typical Coupon-8.25%, 1-3 year loan term. Okay on cannabis." },
  { id: 101, source: "Spreadsheet", spreadsheetRow: "R102", program: "Arnaud Vanderbeken", lender: "Arnaud Vanderbeken", type: "Senior", minLoan: "$50,000", maxLoan: "$1,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NJ"], assets: ["Apartments", "Cannabis", "Retail-Multi Tenant"], status: "Active", email: "arnaud.vanderbeken@gmail.com", phone: "646-413-3834", recourse: "CASE BY CASE", contactPerson: "Arnaud Vanderbeken", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["NJ"], notes: "" },
  { id: 102, source: "Spreadsheet", spreadsheetRow: "R103", program: "Associated Bank", lender: "Associated Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["IL", "MI", "OH", "TX", "WI", "IN", "MN", "MO"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "scott.mclean@associatedbank.com", phone: "248-203-2805", recourse: "FULL", contactPerson: "Scott McLean", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "They have teams in each state: https://www.associatedbank.com/commercial/financing/commercial-real-estate-services/relationship-managers?utm_source=rejournals&utm_campaign=b2b18&utm_medium=email&utm_content=b2bad1x1-midwest#Detroit%20Team" },
  { id: 103, source: "Spreadsheet", spreadsheetRow: "R104", program: "AUL - via Walker & Dunlop", lender: "AUL", type: "Senior", minLoan: "$2,500,000", maxLoan: "$30,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6348", recourse: "FULL", contactPerson: "Dave Semmer", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 104, source: "Spreadsheet", spreadsheetRow: "R105", program: "Avana Capital", lender: "AVANA Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Assisted Living", "Light Industrial", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "SANAT PATEL", phone: "8778505130", recourse: "FULL", contactPerson: "sanat@avanacapital.com", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Only Flagged hotels" },
  { id: 105, source: "Spreadsheet", spreadsheetRow: "R106", program: "Avenue Bank - footprint properties", lender: "Avenue Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$7,000,000", maxLtv: "", minDscr: "N/A", states: ["WI", "IL", "IN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "scott.weller@avebank.com", phone: "630-379-9798", recourse: "FULL", contactPerson: "Scott Weller", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "Property must be cashflowing (can do lightly trans). < $2mm quick decision no credit commit needed. 75% LTV investor, 80% OO, Construction on OO properties and MF on case-by-case basis.  Does SBA 7a loans (pay 1-2%fee)" },
  { id: 106, source: "Spreadsheet", spreadsheetRow: "R107", program: "Avenue Bank - footprint sponsors", lender: "Avenue Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$7,000,000", maxLtv: "", minDscr: "N/A", states: ["IL", "MN", "MI", "IA", "KY", "WI", "IN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "scott.weller@avebank.com", phone: "630-379-9798", recourse: "FULL", contactPerson: "Scott Weller", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: ["WI", "IL", "IN"], notes: "Property must be cashflowing (can do lightly trans). < $2mm quick decision no credit commit needed. 75% LTV investor, 80% OO, Construction on OO properties and MF on case-by-case basis.  Does SBA 7a loans (pay 1-2%fee)" },
  { id: 107, source: "Spreadsheet", spreadsheetRow: "R108", program: "Avid Commercial", lender: "Avid Commercial", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "bjohnson@avidcommercial.com", phone: "801-365-1740 x 303", recourse: "FULL", contactPerson: "Brian Johnson", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 108, source: "Spreadsheet", spreadsheetRow: "R109", program: "Axos Bank - commercial", lender: "Axos Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "fornelas@axosbank.com", phone: "310-874-8184", recourse: "FULL", contactPerson: "Fred Ornelas", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "MSA 1,000,000+, avg single-family price of $300k in area  low fico, foreclosure/bankruptcy are ok, but not hard money   can do break-even DSCR   \"conventional turn-down\"" },
  { id: 109, source: "Spreadsheet", spreadsheetRow: "R110", program: "Axos Bank - hotels", lender: "Axos Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$50,000,000", maxLtv: "50%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "fornelas@axosbank.com", phone: "310-874-8184", recourse: "FULL", contactPerson: "Fred Ornelas", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Hotels must be strong market, low leverage (under 50% LTV)" },
  { id: 110, source: "Spreadsheet", spreadsheetRow: "R111", program: "Axos Bank - multifamily", lender: "Axos Bank", type: "Senior", minLoan: "$300,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "SFR Portfolio", "Co-living"], status: "Active", email: "fornelas@axosbank.com", phone: "310-874-8184", recourse: "FULL", contactPerson: "Fred Ornelas", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "5-200 units, must be 75% occupancy, minimum value per unit of $70,000 \"Axos Bank specializes in helping borrowers with credit related challenges (e.g. mortgage late payments, loan modifications, foreclosures, short sales, BKs, low fico scores, tax liens) and other hurdles that cause borrowers to be excluded from securing traditional institutional grade pricing (e.g. lack of seasoning, no historical operating history, seismic issues, atypical unit mix).  If your deal has some “hair” on it, we may be able to help.\"" },
  { id: 111, source: "Spreadsheet", spreadsheetRow: "R112", program: "Axos Bank - multifamily construction", lender: "Axos Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "fornelas@axosbank.com", phone: "310-874-8184", recourse: "FULL", contactPerson: "Fred Ornelas", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "5-200 units, must be 75% occupancy, minimum value per unit of $70,000 \"Axos Bank specializes in helping borrowers with credit related challenges (e.g. mortgage late payments, loan modifications, foreclosures, short sales, BKs, low fico scores, tax liens) and other hurdles that cause borrowers to be excluded from securing traditional institutional grade pricing (e.g. lack of seasoning, no historical operating history, seismic issues, atypical unit mix).  If your deal has some “hair” on it, we may be able to help.\"" },
  { id: 112, source: "Spreadsheet", spreadsheetRow: "R113", program: "Balboa Thrift and Loan", lender: "Balboa Thrift and Loan", type: "Senior", minLoan: "$250,000", maxLoan: "$3,500,000", maxLtv: "75%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "joseph@balboacre.com", phone: "619-397-7774", recourse: "FULL", contactPerson: "Joseph Morstad", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "No land, gas stations, churches, or golf courses" },
  { id: 113, source: "Spreadsheet", spreadsheetRow: "R114", program: "Banco Popular", lender: "Banco Popular", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Co-living"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 114, source: "Spreadsheet", spreadsheetRow: "R115", program: "Bank Leumi - construction", lender: "Bank Leumi", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "christopher.gregg@leumiusa.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Christopher Gregg", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "NYC metro. Up to 60% takeout LTV or 65% LTC" },
  { id: 115, source: "Spreadsheet", spreadsheetRow: "R116", program: "Bank Leumi - stabilized", lender: "Bank Leumi", type: "Senior", minLoan: "$5,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "christopher.gregg@leumiusa.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Christopher Gregg", loanTerms: "5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "7.5% debt yield for multifamily stabilized 8.5% debt yield for commercial" },
  { id: 116, source: "Spreadsheet", spreadsheetRow: "R117", program: "Bank Midwest", lender: "Bank Midwest", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "80%", minDscr: "N/A", states: ["MO", "KS"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "alisha.lay@bankmw.com", phone: "816-298-2302", recourse: "CASE BY CASE", contactPerson: "Alisha Lay", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 117, source: "Spreadsheet", spreadsheetRow: "R118", program: "Bank of China-Manhattan Branch", lender: "Bank of China", type: "Senior", minLoan: "$30,000,000", maxLoan: "$10.0B", maxLtv: "65%", minDscr: "N/A", states: ["NY", "CA", "IL", "DC", "FL"], assets: ["Apartments", "Office", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "ltao@bocusa.com", phone: "212-293-2604", recourse: "FULL", contactPerson: "Elaine Tao", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Bank of China typically (but not always) prefers loans in gateway markets-DC,LA,Chi,SF,NY. Typically non recourse.  For construction loans they would prefer completion, carry, principal guaranty" },
  { id: 118, source: "Spreadsheet", spreadsheetRow: "R119", program: "Bank of Clarendon", lender: "Bank of Clarendon", type: "Senior", minLoan: "$0", maxLoan: "$6,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "chrislee@bankofclarendon.com", phone: "803-433-4451", recourse: "FULL", contactPerson: "Chris Lee", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 119, source: "Spreadsheet", spreadsheetRow: "R120", program: "Bank of Hope", lender: "Bank of Hope", type: "Senior", minLoan: "$5,000,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "john.kim@bankofhope.com", phone: "213-235-304", recourse: "FULL", contactPerson: "John Kim", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Prime +0.5, Perm, Bridge, Construction" },
  { id: 120, source: "Spreadsheet", spreadsheetRow: "R121", program: "Bank of Ozarks - NNN", lender: "Bank of Ozarks", type: "Senior", minLoan: "$700,000", maxLoan: "$10,000,000", maxLtv: "69%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Retail-Multi Tenant"], status: "Active", email: "jack.russell@ozk.com", phone: "(727) 442-2551x1310", recourse: "FULL", contactPerson: "Jack Russell", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 121, source: "Spreadsheet", spreadsheetRow: "R122", program: "Bank of the Ozarks - development", lender: "Bank of the Ozarks", type: "Senior", minLoan: "$40,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "greg.newman@ozk.com", phone: "404-870-6053", recourse: "FULL", contactPerson: "Greg Newman", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "40-60% LTC construction lender nationwide" },
  { id: 122, source: "Spreadsheet", spreadsheetRow: "R123", program: "Bank of the West - Over $3M", lender: "Bank of the West", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "80%", minDscr: "N/A", states: ["CA", "OR", "WA", "ID", "NV", "AZ", "NM", "CO", "WY", "KS", "OK", "ND", "SD", "NE", "IA", "MN", "MO", "WI", "UT", "TX"], assets: ["Apartments", "Senior Housing", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "charles.boone@bankofthewest.com", phone: "402-918-5441", recourse: "FULL", contactPerson: "Charlie Boone", loanTerms: "10 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["CA", "OR", "WA", "ID", "NV", "AZ", "NM", "CO", "WY", "KS", "OK", "ND", "SD", "NE", "IA", "MN", "MO", "WI", "UT", "TX"], notes: "20-year fixed on owner occupied commercial. 15-year fixed, self-amortizing on multifamily." },
  { id: 123, source: "Spreadsheet", spreadsheetRow: "R124", program: "Bank of the West - Under $3M", lender: "Bank of the West", type: "Senior", minLoan: "$500,000", maxLoan: "$3,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "OR", "WA", "ID", "NV", "AZ", "NM", "CO", "WY", "KS", "OK", "ND", "SD", "NE", "IA", "MN", "MO", "WI", "UT", "TX"], assets: ["Apartments", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Religious"], status: "Active", email: "richard.totusek@bankofthewest.com", phone: "", recourse: "FULL", contactPerson: "Rick Totusek", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "strengths are in owner-occupied and multi-family" },
  { id: 124, source: "Spreadsheet", spreadsheetRow: "R125", program: "BankSouth", lender: "BankSouth", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "bhill-allison@banksouth.com", phone: "404-558-7407", recourse: "CASE BY CASE", contactPerson: "Bethany Hill", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 125, source: "Spreadsheet", spreadsheetRow: "R126", program: "BankUnited - FL", lender: "BankUnited", type: "Senior", minLoan: "$10,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "1.25", states: ["FL"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "plubian@bankunited.com", phone: "786.313.1145", recourse: "CASE BY CASE", contactPerson: "Patty Lubian", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 126, source: "Spreadsheet", spreadsheetRow: "R127", program: "BankUnited - NYC metro", lender: "BankUnited", type: "Senior", minLoan: "$10,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "1.25", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "gsemet@bankunited.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Gardner Semet", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 127, source: "Spreadsheet", spreadsheetRow: "R128", program: "Banner Bank", lender: "Banner Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$35,000,000", maxLtv: "", minDscr: "N/A", states: ["OR", "NV", "WA"], assets: ["Student Housing", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "susan.mackey@bannerbank.com", phone: "916-648-3460", recourse: "FULL", contactPerson: "Susan Mackey", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["CA"], notes: "" },
  { id: 128, source: "Spreadsheet", spreadsheetRow: "R129", program: "Banner Bank - CA", lender: "Banner Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$35,000,000", maxLtv: "", minDscr: "N/A", states: ["CA"], assets: ["Student Housing", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "James.Barnett@bannerbank.com", phone: "805.701.6598", recourse: "FULL", contactPerson: "James Barnett", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["CA"], notes: "" },
  { id: 129, source: "Spreadsheet", spreadsheetRow: "R130", program: "Baraboo State Bank", lender: "Baraboo State Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$7,000,000", maxLtv: "", minDscr: "N/A", states: ["WI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "bschwartzer@baraboobank.com", phone: "608-448-4231", recourse: "FULL", contactPerson: "Brett Schwartzer", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 130, source: "Spreadsheet", spreadsheetRow: "R131", program: "Barings - agency", lender: "Barings", type: "Senior", minLoan: "$5,000,000", maxLoan: "$1.0B", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Co-living"], status: "Active", email: "matthew.hoysa@barings.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Matthew Hoysa", loanTerms: "10 year, 12 year, 15 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 131, source: "Spreadsheet", spreadsheetRow: "R132", program: "Barings - construction", lender: "Barings", type: "Senior", minLoan: "$75,000,000", maxLoan: "$1.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Co-living"], status: "Active", email: "matthew.hoysa@barings.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Matthew Hoysa", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 132, source: "Spreadsheet", spreadsheetRow: "R133", program: "Barings - core", lender: "Barings", type: "Senior", minLoan: "$50,000,000", maxLoan: "$1.0B", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing"], status: "Active", email: "matthew.hoysa@barings.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Matthew Hoysa", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 133, source: "Spreadsheet", spreadsheetRow: "R134", program: "BB&T", lender: "BB&T", type: "Senior", minLoan: "$500,000", maxLoan: "$5,000,000", maxLtv: "85%", minDscr: "N/A", states: ["GA"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "garnet.reynolds@bbandt.com", phone: "678-378-7472", recourse: "FULL", contactPerson: "Garnet Reynolds", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["GA"], notes: "Andrew Bouton's college roommate" },
  { id: 134, source: "Spreadsheet", spreadsheetRow: "R135", program: "BB&T - $5M+, GA Sponsors", lender: "BB&T", type: "Senior", minLoan: "$5,000,000", maxLoan: "$75,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NC", "SC", "GA", "KY", "VA", "WV", "MD", "DC", "TN", "FL", "AL", "TX", "OH", "PA", "NJ", "IN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "npickens@bbandt.com", phone: "404-720-9256", recourse: "FULL", contactPerson: "Neal Pickens", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["GA"], notes: "will do CRE construction loans as well" },
  { id: 135, source: "Spreadsheet", spreadsheetRow: "R136", program: "Bedrock Capital Associates - Bridge", lender: "Bedrock Capital Associates", type: "Senior", minLoan: "$5,000,000", maxLoan: "$200,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "lbiller@bedrockca.com", phone: "212-419-4818", recourse: "NON RECOURSE", contactPerson: "Loren Biller", loanTerms: "3 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Bridge loan consists of first mortgage A-note and mezz or B-note" },
  { id: 136, source: "Spreadsheet", spreadsheetRow: "R137", program: "Bedrock Capital Associates - CMBS", lender: "Bedrock Capital Associates", type: "Senior", minLoan: "$5,000,000", maxLoan: "$200,000,000", maxLtv: "75%", minDscr: "1.25", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "lbiller@bedrockca.com", phone: "212-419-4818", recourse: "NON RECOURSE", contactPerson: "Loren Biller", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 137, source: "Spreadsheet", spreadsheetRow: "R138", program: "Berkshires Bank", lender: "Berkshires Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["MA"], assets: ["Apartments"], status: "Active", email: "hbailly@berkshirebank.com", phone: "412-236-3180", recourse: "FULL", contactPerson: "Jay Bailly", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 138, source: "Spreadsheet", spreadsheetRow: "R139", program: "Blackrock - Mezz", lender: "Blackrock", type: "Mezzanine", minLoan: "$30,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "candice.loupee@blackrock.com", phone: "", recourse: "FULL", contactPerson: "Candice Loupee", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 139, source: "Spreadsheet", spreadsheetRow: "R140", program: "Blackstone construction", lender: "Blackstone", type: "Senior", minLoan: "$100,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "austin.pena@blackstone.com", phone: "", recourse: "FULL", contactPerson: "", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 140, source: "Spreadsheet", spreadsheetRow: "R141", program: "Blackstone main", lender: "Blackstone", type: "Senior", minLoan: "$75,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "austin.pena@blackstone.com", phone: "", recourse: "FULL", contactPerson: "", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 141, source: "Spreadsheet", spreadsheetRow: "R142", program: "Blackstone mezz", lender: "Blackstone", type: "Mezzanine", minLoan: "$25,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "austin.pena@blackstone.com", phone: "", recourse: "FULL", contactPerson: "Austin Pena", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 142, source: "Spreadsheet", spreadsheetRow: "R143", program: "Bluestone Capital Group - Senior", lender: "Bluestone Capital Group", type: "Senior", minLoan: "$3,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land"], status: "Active", email: "cstephens@bluestonegrp.com", phone: "(212) 991-6600", recourse: "CASE BY CASE", contactPerson: "Chris Stephens", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "1-3 points in origination fees" },
  { id: 143, source: "Spreadsheet", spreadsheetRow: "R144", program: "BOLOUR Associates", lender: "BOLOUR Associates", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "steve@bolourassociates.com", phone: "323-677-0550", recourse: "CASE BY CASE", contactPerson: "Steve Martin", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Focus on major urban infill" },
  { id: 144, source: "Spreadsheet", spreadsheetRow: "R145", program: "Bradford Allen - mezz", lender: "Bradford Allen Capital", type: "Mezzanine", minLoan: "$3,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "bcarly@bradfordallen.com", phone: "312-343-6312", recourse: "FULL", contactPerson: "", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "CLTV up to 85% based on 75% stabilized CLTV" },
  { id: 145, source: "Spreadsheet", spreadsheetRow: "R146", program: "Bradford Allen - senior", lender: "Bradford Allen Capital", type: "Senior", minLoan: "$20,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "bcarly@bradfordallen.com", phone: "312-343-6312", recourse: "FULL", contactPerson: "Brian Carly", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will originate senior at ~L+550, then slice up to get high teen returns" },
  { id: 146, source: "Spreadsheet", spreadsheetRow: "R147", program: "Brentwood Bank", lender: "Brentwood Bank", type: "Senior", minLoan: "$0", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "bpascarella@brentwoodbank.com", phone: "412-409-9000 ext. 239", recourse: "FULL", contactPerson: "Brad Pascarella", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Western PA focus (Pittsburg, Eerie) Can do non-recouse on some transactions. Happy to give indications." },
  { id: 147, source: "Spreadsheet", spreadsheetRow: "R148", program: "Brevet Capital - Construction Mezz", lender: "Brevet Capital", type: "Senior", minLoan: "$20,000,000", maxLoan: "$400,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Hotel/Hospitality"], status: "Active", email: "rperez@brevetcapital.com", phone: "210-710-6764", recourse: "NON RECOURSE", contactPerson: "Raul Perez", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Top 50 MSAs, Consider bridging Historic TX credits, New mkt TX credits, opportunity zones, or other govt programs" },
  { id: 148, source: "Spreadsheet", spreadsheetRow: "R149", program: "Briar Capital", lender: "Briar Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "60%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial"], status: "Active", email: "jappleton@briarcapital.com", phone: "770-378-0847", recourse: "CASE BY CASE", contactPerson: "Jeff Appleton", loanTerms: "3 year", typeOfLoans: ["Refinance"], sponsorStates: [], notes: "Only interested in \"1st and 2nd tier cities\"" },
  { id: 149, source: "Spreadsheet", spreadsheetRow: "R150", program: "Bridge Invest", lender: "Bridge Invest", type: "Senior", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["TX", "AR", "LA", "MI", "AL", "GA", "FL", "TN", "SC", "NC"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care"], status: "Active", email: "spenser@bridgeinvest.com", phone: "305-239-9199", recourse: "CASE BY CASE", contactPerson: "Jon Gitman", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Focus on primary and secondary markets in the Southeast and TX Land lending focused on urban infill" },
  { id: 150, source: "Spreadsheet", spreadsheetRow: "R151", program: "BridgeCore - Mezz", lender: "BridgeCore", type: "Mezzanine", minLoan: "$1,000,000", maxLoan: "$7,000,000", maxLtv: "80%", minDscr: "N/A", states: ["CA", "AZ", "TX", "FL", "NY", "CT", "DC"], assets: ["Apartments", "Condos", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "elliot@bridgecorecapital.com", phone: "310-426-8751", recourse: "CASE BY CASE", contactPerson: "Elliot Shirwo", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 151, source: "Spreadsheet", spreadsheetRow: "R152", program: "BridgeCore - Senior", lender: "BridgeCore", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "AZ", "TX", "FL", "NY", "CT", "DC"], assets: ["Apartments", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "elliot@bridgecorecapital.com", phone: "310-426-8751", recourse: "NON RECOURSE", contactPerson: "Elliot Shirwo", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Half current pay, half accrued until payoff" },
  { id: 152, source: "Spreadsheet", spreadsheetRow: "R153", program: "Broadmark - Rockies", lender: "Broadmark", type: "Senior", minLoan: "$1,000,000", maxLoan: "$43,000,000", maxLtv: "65%", minDscr: "N/A", states: ["CO", "UT", "TX", "WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "brett@broadmarkre.com", phone: "720-515-1948", recourse: "CASE BY CASE", contactPerson: "Brett Kaye", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Max 65% As stabilized" },
  { id: 153, source: "Spreadsheet", spreadsheetRow: "R154", program: "Broadmark - Southeast", lender: "Broadmark", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "65%", minDscr: "N/A", states: ["GA", "TN", "NC", "SC", "FL"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "SFR Portfolio", "Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "jacob@broadmarkre.com", phone: "678-971-9421", recourse: "FULL", contactPerson: "Jacob Wigle", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Land Acquisition and Development, Spec/Custom Home Construction" },
  { id: 154, source: "Spreadsheet", spreadsheetRow: "R155", program: "Builders Capital", lender: "Builders Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["WA", "CO", "OR", "ID", "TX", "FL"], assets: ["SFR Portfolio"], status: "Active", email: "sachin.latawa@builders-capital.com", phone: "206 734 3893", recourse: "CASE BY CASE", contactPerson: "Larry Perry", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Expensive - 2-5% origination fee" },
  { id: 155, source: "Spreadsheet", spreadsheetRow: "R156", program: "Byline Bank - Chicago assets", lender: "Byline Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$40,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "bschneiderman@bylinebank.com", phone: "312-660-5730", recourse: "FULL", contactPerson: "Barry Scheiderman", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 156, source: "Spreadsheet", spreadsheetRow: "R157", program: "Byline Bank - Chicago sponsors", lender: "Byline Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$40,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "bschneiderman@bylinebank.com", phone: "312-660-5730", recourse: "NON RECOURSE", contactPerson: "Barry Scheiderman", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IL"], notes: "" },
  { id: 157, source: "Spreadsheet", spreadsheetRow: "R158", program: "C-III Capital - Balance Sheet", lender: "C-III Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "1", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "dfriedman@c3cp.com", phone: "212-705-5039", recourse: "NON RECOURSE", contactPerson: "Dan Friedman", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "1.0x DSCR, 80% LTC" },
  { id: 158, source: "Spreadsheet", spreadsheetRow: "R159", program: "C-III Capital - CMBS", lender: "C-III Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "dfriedman@c3cp.com", phone: "212-705-5039", recourse: "NON RECOURSE", contactPerson: "Dan Friedman", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 159, source: "Spreadsheet", spreadsheetRow: "R160", program: "Cadence Bank", lender: "Cadence Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$35,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL", "AZ", "AK", "CA", "CO", "FL", "GA", "KS", "LA", "MS", "NV", "NM", "NC", "OK", "SC", "TX", "TN", "UT"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "jeremy.howard@cadencebank.com", phone: "404-266-4636", recourse: "CASE BY CASE", contactPerson: "Jeremy Howard", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["AL", "AZ", "AK", "CA", "CO", "FL", "GA", "KS", "LA", "MS", "NV", "NM", "NC", "OK", "SC", "TX", "TN", "UT"], notes: "Asset & Sponsors located in sunbelt region" },
  { id: 160, source: "Spreadsheet", spreadsheetRow: "R161", program: "California Credit Union", lender: "California Credit Union", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["CA"], assets: [], status: "Active", email: "gespino@ccu.com", phone: "858) 769-7108, (619) 778-5409", recourse: "NON RECOURSE", contactPerson: "Gil Espino", loanTerms: "", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "No Prepay" },
  { id: 161, source: "Spreadsheet", spreadsheetRow: "R162", program: "California Private Lenders - CA", lender: "California Private Lenders", type: "Senior", minLoan: "$50,000", maxLoan: "$10,000,000", maxLtv: "65%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mike@cplenders.com", phone: "818-584-2320", recourse: "NON RECOURSE", contactPerson: "Mike Christl", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will do Cannabis. No FICO/tax returns required. 9-11%, 2 yr I/O, 2.5 points" },
  { id: 162, source: "Spreadsheet", spreadsheetRow: "R163", program: "California Private Lenders - NV", lender: "California Private Lenders", type: "Senior", minLoan: "$250,000", maxLoan: "$4,000,000", maxLtv: "65%", minDscr: "N/A", states: ["NV"], assets: ["Apartments", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mike@cplenders.com", phone: "818-584-2320", recourse: "NON RECOURSE", contactPerson: "Mike Christl", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Will do Cannabis. No FICO/tax returns required. 9-11%, 2 yr I/O, 2.5 points" },
  { id: 163, source: "Spreadsheet", spreadsheetRow: "R164", program: "Capital Bank - MD & VA", lender: "Capital Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "60%", minDscr: "N/A", states: ["VA", "MD"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "tpalermo@capitalbankmd.com", phone: "347-350-1384", recourse: "FULL", contactPerson: "Thomas Palermo", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 164, source: "Spreadsheet", spreadsheetRow: "R165", program: "Capital Three Sixty, LLC", lender: "Capital Three Sixty, LLC", type: "Senior", minLoan: "$250,000", maxLoan: "$3,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WV", "WY"], assets: ["Apartments"], status: "Active", email: "jon@capitalthreesixty.com", phone: "860-673-2300", recourse: "FULL", contactPerson: "Jon Finman", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 165, source: "Spreadsheet", spreadsheetRow: "R166", program: "CapitalSource - Bridge", lender: "CapitalSource", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "klew@capitalsource.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Katherine Lew", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 166, source: "Spreadsheet", spreadsheetRow: "R167", program: "CapitalSource - development", lender: "CapitalSource", type: "Senior", minLoan: "$25,000,000", maxLoan: "$150,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "klew@capitalsource.com, twhitesell@capitalsource.com, jbaker@capitalsource.com", phone: "212-321-7220, 310-968-1742, 818-642-2647", recourse: "NON RECOURSE", contactPerson: "Katherine Lew, Tom Whitesell, Jason Baker", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Need Proven Sponsor - Deals done and familiar with market" },
  { id: 167, source: "Spreadsheet", spreadsheetRow: "R168", program: "CapStar Bank", lender: "CapStar Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Retail-Multi Tenant"], status: "Active", email: "cbarham@capstarbank.com", phone: "317.564.8733", recourse: "NON RECOURSE", contactPerson: "Chris Barham", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "NNN Retail, specific tenant list only. If it's not on the list, don't bother." },
  { id: 168, source: "Spreadsheet", spreadsheetRow: "R169", program: "CapStar Bank - TN", lender: "CapStar Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$12,000,000", maxLtv: "", minDscr: "N/A", states: ["TN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "lhunter@capstarbank.com", phone: "615-732-6334", recourse: "NON RECOURSE", contactPerson: "Lee Hunter", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["TN"], notes: "Hotel flags: Hilton & Marriott" },
  { id: 169, source: "Spreadsheet", spreadsheetRow: "R170", program: "Carlyle Capital", lender: "Carlyle Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$50,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "SFR Portfolio", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "janelle.j@carlylecap.com", phone: "949-386-2633", recourse: "CASE BY CASE", contactPerson: "Janelle Johnson", loanTerms: "1 year, 2 year, 3 year, 4 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Rate: 7.99% up to 11.99% (higher for cannabis), Point: Starts at 2%" },
  { id: 170, source: "Spreadsheet", spreadsheetRow: "R171", program: "Castellan Capital", lender: "Castellan Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Co-living", "Office", "Medical Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "dmarca@castellanre.com", phone: "646-545-6729", recourse: "CASE BY CASE", contactPerson: "Danella Marca", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Quick close (min 5 days), no prepay or min interest" },
  { id: 171, source: "Spreadsheet", spreadsheetRow: "R172", program: "CB&S Bank", lender: "CB&S Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["TN", "AL", "MS"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "donny.turnbow@cbsbank.net", phone: "731-400-6103", recourse: "FULL", contactPerson: "Donny Turnbow", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "$1.6 billion bank based in AL, 70-75% LTV, full recourse only, sponsor must be local" },
  { id: 172, source: "Spreadsheet", spreadsheetRow: "R173", program: "CBRE - agency", lender: "CBRE", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jeffrey.pirhalla@cbre.com", phone: "704-264-3636", recourse: "NON RECOURSE", contactPerson: "Jeff Pirhalla", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Will pay what we ask them for." },
  { id: 173, source: "Spreadsheet", spreadsheetRow: "R174", program: "Cedar Hill Holdings", lender: "Cedar Hill Holdings", type: "Mezzanine", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "sloan@cedarhillholdings.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Sloan Saunders", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 174, source: "Spreadsheet", spreadsheetRow: "R175", program: "Centennial Bank - development", lender: "Centennial Bank", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "sseguss@my100bank.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Simon Seguss", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 175, source: "Spreadsheet", spreadsheetRow: "R176", program: "CenterState Bank - Investor", lender: "CenterState Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["FL", "GA", "AL"], assets: ["Apartments", "Senior Housing", "SFR Portfolio", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Religious"], status: "Active", email: "sstjohn@centerstatebank.com", phone: "561-226-1552", recourse: "NON RECOURSE", contactPerson: "Joseph Zizzo", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "FL & GA only. No multifamily and no hotel. Great for retail with local borrowers." },
  { id: 176, source: "Spreadsheet", spreadsheetRow: "R177", program: "CenterState Bank - OO", lender: "CenterState Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "85%", minDscr: "N/A", states: ["FL", "GA", "AL"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "sstjohn@centerstatebank.com", phone: "561-226-1552", recourse: "NON RECOURSE", contactPerson: "Stephen St John", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 177, source: "Spreadsheet", spreadsheetRow: "R178", program: "Central Bank", lender: "Central Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$40,000,000", maxLtv: "75%", minDscr: "N/A", states: ["KY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "sdean@centralbank.com", phone: "859-253-6300", recourse: "FULL", contactPerson: "Susan Dean", loanTerms: "5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["KY"], notes: "" },
  { id: 178, source: "Spreadsheet", spreadsheetRow: "R179", program: "Century Capital Finance", lender: "Century Capital Finance", type: "Senior", minLoan: "$250,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "manager@centurycapitalfinance.com", phone: "201-880-7850", recourse: "NON RECOURSE", contactPerson: "Welselly Santana", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 179, source: "Spreadsheet", spreadsheetRow: "R180", program: "CFSB - Commercial Land Development", lender: "Colorado Federal Savings Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$5,000,000", maxLtv: "50%", minDscr: "N/A", states: ["CA", "CO", "MA", "NC", "NJ", "NY", "OR", "TN", "UT", "WA"], assets: ["Land"], status: "Active", email: "blopez@cofsbank.com", phone: "855-404-3400 x 7142", recourse: "CASE BY CASE", contactPerson: "Bill Lopez", loanTerms: "1 year, 5 year", typeOfLoans: ["Acquisition", "New Development"], sponsorStates: [], notes: "Raw Land" },
  { id: 180, source: "Spreadsheet", spreadsheetRow: "R181", program: "CFSB - Real Estate Construction", lender: "Colorado Federal Savings Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "55%", minDscr: "N/A", states: ["CA", "CO", "MA", "NC", "NJ", "NY", "OR", "TN", "UT", "WA"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "blopez@cofsbank.com", phone: "855-404-3400 x 7142", recourse: "CASE BY CASE", contactPerson: "Bill Lopez", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Multi Fam, Mixed Use" },
  { id: 181, source: "Spreadsheet", spreadsheetRow: "R182", program: "CFSB - Real Estate Perm", lender: "Colorado Federal Savings Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["CA", "CO", "MA", "NC", "NJ", "NY", "OR", "TN", "UT", "WA"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "blopez@cofsbank.com", phone: "855-404-3400 x 7142", recourse: "CASE BY CASE", contactPerson: "Bill Lopez", loanTerms: "", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Stabilized CRE, Program Sheet said to call for terms and rates" },
  { id: 182, source: "Spreadsheet", spreadsheetRow: "R183", program: "CFSB - Residential Tract Development", lender: "Colorado Federal Savings Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$6,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "CO", "MA", "NC", "NJ", "NY", "OR", "TN", "UT", "WA"], assets: ["Apartments", "Senior Housing", "Student Housing", "SFR Portfolio"], status: "Active", email: "blopez@cofsbank.com", phone: "855-404-3400 x 7142", recourse: "CASE BY CASE", contactPerson: "Bill Lopez", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "10+ unit SFR, Condos, PUD" },
  { id: 183, source: "Spreadsheet", spreadsheetRow: "R184", program: "Chase - Boston", lender: "JP Morgan Chase", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "Needed", phone: "See Notes", recourse: "CASE BY CASE", contactPerson: "Needed", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "https://www.jpmorgan.com/commercial-banking/solutions/commercial-real-estate/commercial-term-lending" },
  { id: 184, source: "Spreadsheet", spreadsheetRow: "R185", program: "Chase - CA", lender: "JP Morgan Chase", type: "Senior", minLoan: "$250,000", maxLoan: "$30,000,000", maxLtv: "", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "bryant.t.smith@chase.com, todd.leslie@chase.com", phone: "310-341-1903", recourse: "NON RECOURSE", contactPerson: "Todd Leslie", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Bryant Smith" },
  { id: 185, source: "Spreadsheet", spreadsheetRow: "R186", program: "Chase - Chicago Multifamily", lender: "JP Morgan Chase", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["IL"], assets: ["Apartments", "Senior Housing", "Student Housing"], status: "Active", email: "scott.kalkofen@chase.com", phone: "(312) 732-6377", recourse: "FULL", contactPerson: "Scott Kalkofen", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Chicago area west to Naperville" },
  { id: 186, source: "Spreadsheet", spreadsheetRow: "R187", program: "Chase - DC", lender: "JP Morgan Chase", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "Needed", phone: "See Notes", recourse: "CASE BY CASE", contactPerson: "Needed", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "https://www.jpmorgan.com/commercial-banking/solutions/commercial-real-estate/commercial-term-lending" },
  { id: 187, source: "Spreadsheet", spreadsheetRow: "R188", program: "Chase - Minneapolis", lender: "JP Morgan Chase", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "Needed", phone: "See Notes", recourse: "CASE BY CASE", contactPerson: "Needed", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "https://www.jpmorgan.com/commercial-banking/solutions/commercial-real-estate/commercial-term-lending" },
  { id: 188, source: "Spreadsheet", spreadsheetRow: "R189", program: "Chase - New York multifamily", lender: "JP Morgan Chase", type: "Senior", minLoan: "$500,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NY"], assets: ["Apartments"], status: "Active", email: "joseph.zizzo@chase.com", phone: "(516) 683-4920", recourse: "NON RECOURSE", contactPerson: "Joseph Zizzo", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "NYC multifamily only. No closing costs." },
  { id: 189, source: "Spreadsheet", spreadsheetRow: "R190", program: "Chase - Portland", lender: "JP Morgan Chase", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "Needed", phone: "See Notes", recourse: "CASE BY CASE", contactPerson: "Needed", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "https://www.jpmorgan.com/commercial-banking/solutions/commercial-real-estate/commercial-term-lending" },
  { id: 190, source: "Spreadsheet", spreadsheetRow: "R191", program: "Chase - Seattle", lender: "JP Morgan Chase", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "Needed", phone: "See Notes", recourse: "CASE BY CASE", contactPerson: "Needed", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "https://www.jpmorgan.com/commercial-banking/solutions/commercial-real-estate/commercial-term-lending" },
  { id: 191, source: "Spreadsheet", spreadsheetRow: "R192", program: "Chase Bank - Chicago Area Commercial", lender: "JP Morgan Chase", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "65%", minDscr: "N/A", states: ["IL"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "chris.cernek@chase.com", phone: "312-732-2392", recourse: "CASE BY CASE", contactPerson: "Chris Cernek", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 192, source: "Spreadsheet", spreadsheetRow: "R193", program: "Chase Bank- New York", lender: "JP Morgan Chase", type: "Senior", minLoan: "$500,000", maxLoan: "$10.0B", maxLtv: "75%", minDscr: "N/A", states: ["NY", "NJ"], assets: ["Apartments", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "scott.barber@chase.com", phone: "516-683-4904", recourse: "CASE BY CASE", contactPerson: "Scott Barber", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "specialized" },
  { id: 193, source: "Spreadsheet", spreadsheetRow: "R194", program: "Chase Multifamily - Denver/Boulder", lender: "JP Morgan Chase", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "joshua.m.tidwell@chase.com", phone: "303-244-3403", recourse: "CASE BY CASE", contactPerson: "Josh Tidwell", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 194, source: "Spreadsheet", spreadsheetRow: "R195", program: "Cherrywood", lender: "Cherrywood Commercial Lending", type: "Senior", minLoan: "$200,000", maxLoan: "$5,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "SFR Portfolio", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "eainbinder@cherrywood.com", phone: "516.864.4249", recourse: "NON RECOURSE", contactPerson: "Ed Ainbinder", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 195, source: "Spreadsheet", spreadsheetRow: "R196", program: "Cherrywood - MHP & Self Storage", lender: "Cherrywood", type: "Senior", minLoan: "$300,000", maxLoan: "$5,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "eainbinder@cherrywood.com", phone: "516.864.4249", recourse: "NON RECOURSE", contactPerson: "Ed Ainbinder", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 196, source: "Spreadsheet", spreadsheetRow: "R197", program: "Choice One Bank", lender: "Choice One Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$8,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "agriffin@choiceone.com", phone: "616-205-0322", recourse: "NON RECOURSE", contactPerson: "Aaron Griffin", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Must be near Grand Rapids, MI" },
  { id: 197, source: "Spreadsheet", spreadsheetRow: "R198", program: "CIBC - CMBS", lender: "CIBC", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "dushyant.ravichandran@cibc.com", phone: "310-938-6313", recourse: "NON RECOURSE", contactPerson: "Dushyant Ravi", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "The bank has previously paid brokers on a case by case basis 50 bps as commission when a deal closes and another 50 bps when a deal securitizes (30-60 days typically after closing). The bank does not typically sign referral agreements upfront and prefers to work on a deal by deal basis. MHP: Prefer majority tenant owned, vs park-owned." },
  { id: 198, source: "Spreadsheet", spreadsheetRow: "R199", program: "Cincinnati Federal", lender: "Cincinnati Federal Savings & Loan", type: "Senior", minLoan: "$0", maxLoan: "$2,300,000", maxLtv: "80%", minDscr: "N/A", states: ["OH"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "ecunningham@cincinnatifederal.com", phone: "513-404-7875", recourse: "NON RECOURSE", contactPerson: "Ed Cunningham", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Sponsor must be within 100 miles of Cincinnati" },
  { id: 199, source: "Spreadsheet", spreadsheetRow: "R200", program: "Citi", lender: "Citi", type: "Senior", minLoan: "$3,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "michael.corridan@citi.com, michael.zarkin@citi.com", phone: "(212) 816-0135", recourse: "NON RECOURSE", contactPerson: "Michael Corridan", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 200, source: "Spreadsheet", spreadsheetRow: "R201", program: "Citizens Bank", lender: "Citizens Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["MA", "RI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "omar.b.melon@citizensbank.com", phone: "508-558-5996", recourse: "NON RECOURSE", contactPerson: "Omar Melon", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 201, source: "Spreadsheet", spreadsheetRow: "R202", program: "Citizens Bank CFG", lender: "Citizens Bank Business Banking", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["MA", "CT", "RI", "NY", "NJ", "DE", "PA", "OH", "MI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "robert.hagan@citizensbank.com", phone: "203-561-2223", recourse: "CASE BY CASE", contactPerson: "Bobby Hagan", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 202, source: "Spreadsheet", spreadsheetRow: "R203", program: "City National Bank - Commercial", lender: "City National Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["DC", "IN", "KY", "MD", "NC", "OH", "PA", "SC", "TN", "VA", "WV"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "brian.parrott@bankatcity.com", phone: "304-347-2427", recourse: "CASE BY CASE", contactPerson: "Brian Parrott", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Will consider transactions with out of footprint borrowers if property is in footprint" },
  { id: 203, source: "Spreadsheet", spreadsheetRow: "R204", program: "City National Bank - construction", lender: "City National Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["WV", "VA", "OH", "KY", "IN", "MD", "NC", "PA", "SC", "TN", "DC"], assets: ["Apartments"], status: "Active", email: "brian.parrott@bankatcity.com", phone: "304-347-2427", recourse: "NON RECOURSE", contactPerson: "Brian Parrott", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 204, source: "Spreadsheet", spreadsheetRow: "R205", program: "City National Bank - Multifamily", lender: "City National Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "80%", minDscr: "N/A", states: ["DC", "IN", "KY", "MD", "NC", "OH", "PA", "SC", "TN", "VA", "WV"], assets: ["Apartments"], status: "Active", email: "brian.parrott@bankatcity.com", phone: "304-347-2427", recourse: "CASE BY CASE", contactPerson: "Brian Parrott", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Will consider transactions with out of footprint borrowers if property is in footprint.  Assets need to be located close to West Virginia when in peripheral states" },
  { id: 205, source: "Spreadsheet", spreadsheetRow: "R206", program: "City National Bank - perm/mini-perm", lender: "City National Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["WV", "VA", "OH", "KY", "IN", "MD", "NC", "PA", "SC", "TN", "DC"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "brian.parrott@bankatcity.com", phone: "304-347-2427", recourse: "NON RECOURSE", contactPerson: "Brian Parrott", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 206, source: "Spreadsheet", spreadsheetRow: "R207", program: "Civic Financial Services", lender: "Civic Financial Services", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AZ", "CA", "CO", "FL", "GA", "HI", "NV", "OR", "TN", "TX", "UT", "WA"], assets: ["Apartments"], status: "Active", email: "matthew.marky@civicfs.com", phone: "", recourse: "NON RECOURSE", contactPerson: "Matthew Marky", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 207, source: "Spreadsheet", spreadsheetRow: "R208", program: "CIVIC Multifamily", lender: "Civic", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AZ", "CA", "CO", "FL", "GA", "HI", "NC", "NV", "OR", "SC", "TN", "TX", "UT", "VA", "WA"], assets: ["Apartments"], status: "Active", email: "brian.lee@civicfs.com, brian.murphy@civicfs.com", phone: "424-336-7903, 424-336-7511", recourse: "CASE BY CASE", contactPerson: "Brian Lee, Brian Murphy", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Minimum 1.2x stabilized DSCR, interest guarantee for loans 2+ years" },
  { id: 208, source: "Spreadsheet", spreadsheetRow: "R209", program: "Clarkston State Bank (Detroit area)", lender: "Clarkston State Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["MI"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "rneuman@clarkstonstatebank.com", phone: "248-922-6965", recourse: "CASE BY CASE", contactPerson: "Rebecca Neuman", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["MI"], notes: "Only focus on a few counties (Genesee, Livingston, Oakland, Macomb and Wayne)" },
  { id: 209, source: "Spreadsheet", spreadsheetRow: "R210", program: "Clearinghouse CDFI - Construction", lender: "Clearinghouse CDFI", type: "Senior", minLoan: "$250,000", maxLoan: "$7,500,000", maxLtv: "80%", minDscr: "N/A", states: ["CA", "NM", "AZ"], assets: ["Apartments", "Assisted Living", "Co-living", "Office", "Medical Office", "Retail-Multi Tenant", "Religious", "Other"], status: "Active", email: "brianm@ccdfi.com", phone: "702-522-2283", recourse: "CASE BY CASE", contactPerson: "Brian Maddox", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 210, source: "Spreadsheet", spreadsheetRow: "R211", program: "Clearinghouse CDFI - Perm", lender: "Clearinghouse CDFI", type: "Senior", minLoan: "$250,000", maxLoan: "$7,500,000", maxLtv: "80%", minDscr: "N/A", states: ["CA", "NV", "NM", "AZ"], assets: ["Apartments", "Assisted Living", "Co-living", "Office", "Medical Office", "Retail-Multi Tenant", "Religious", "Other"], status: "Active", email: "brianm@ccdfi.com", phone: "702-522-2283", recourse: "CASE BY CASE", contactPerson: "Brian Maddox", loanTerms: "10 year, 15 year, 20 year, 25 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 211, source: "Spreadsheet", spreadsheetRow: "R212", program: "Clearpath FCU", lender: "Clearpath Federal Credit Union", type: "Senior", minLoan: "$50,000", maxLoan: "$1,700,000", maxLtv: "80%", minDscr: "N/A", states: ["CA", "OR", "WA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "businesslending@clearpathfcu.org", phone: "", recourse: "NON RECOURSE", contactPerson: "", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["CA", "OR", "WA"], notes: "" },
  { id: 212, source: "Spreadsheet", spreadsheetRow: "R213", program: "Coastal FCU - home markets", lender: "Coastal FCU", type: "Senior", minLoan: "$2,000,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NC", "SC", "VA"], assets: ["Apartments", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "creeves@coastal24.com", phone: "919-673-3183", recourse: "NON RECOURSE", contactPerson: "Charlie Reeves", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 213, source: "Spreadsheet", spreadsheetRow: "R214", program: "Coastal FCU - national", lender: "Coastal FCU", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "creeves@coastal24.com", phone: "919-673-3183", recourse: "NON RECOURSE", contactPerson: "Charlie Reeves", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "If outside NC, SC, VA, must be investment grade credit tenant" },
  { id: 214, source: "Spreadsheet", spreadsheetRow: "R215", program: "Coastal State Bank - CRE Capital", lender: "Coastal States Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "85%", minDscr: "N/A", states: ["GA", "NC", "SC", "TN", "AL", "FL"], assets: ["Apartments", "Student Housing", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "jandersen@coastalstatesbank.com", phone: "404-513-5215", recourse: "CASE BY CASE", contactPerson: "Jim Andersen", loanTerms: "5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "SOME SBA WILL PAY LENDER" },
  { id: 215, source: "Spreadsheet", spreadsheetRow: "R216", program: "Colony Capital - senior", lender: "Colony Northstar", type: "Senior", minLoan: "$20,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "kburke@clny.com", phone: "212.547.2777", recourse: "CASE BY CASE", contactPerson: "Kailey Burke", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Floating rate, L+250 to L+300" },
  { id: 216, source: "Spreadsheet", spreadsheetRow: "R217", program: "Colorado Federal Bank", lender: "Colorado Federal Bank", type: "Senior", minLoan: "$300,000", maxLoan: "$13,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Other"], status: "Active", email: "blopez@cofsbank.com", phone: "650-430-9919", recourse: "CASE BY CASE", contactPerson: "Bill Lopez", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Spec SFR Construction" },
  { id: 217, source: "Spreadsheet", spreadsheetRow: "R218", program: "Columbia Bank (NJ)", lender: "Columbia Bank (NJ)", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NJ", "NY", "PA"], assets: ["Apartments", "Senior Housing", "Assisted Living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Religious"], status: "Active", email: "jorsag@columbiabankonline.com", phone: "(609) 240-4434", recourse: "CASE BY CASE", contactPerson: "John Orsag", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 218, source: "Spreadsheet", spreadsheetRow: "R219", program: "Columbia Bank (NJ) - construction", lender: "Columbia Bank (NJ)", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NJ", "NY", "PA"], assets: ["Apartments", "Condos", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Religious"], status: "Active", email: "jorsag@columbiabankonline.com", phone: "(609) 240-4434", recourse: "CASE BY CASE", contactPerson: "John Orsag", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 219, source: "Spreadsheet", spreadsheetRow: "R220", program: "Columbia Bank (Northwest)", lender: "Columbia Bank (Northwest)", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["OR", "ID", "WA"], assets: ["Apartments", "Senior Housing", "Assisted Living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "nathan.sackett@therightbank.com", phone: "206-676-3068", recourse: "CASE BY CASE", contactPerson: "Nathan Sackett", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "variable, fixed and derivatives for pricing options. Construction and Perm loans. sponsor lives within our footprint (OR, WA, ID), we can do deals wherever they go" },
  { id: 220, source: "Spreadsheet", spreadsheetRow: "R221", program: "Columbia Pacific Advisors, LLC", lender: "Columbia Pacific Advisors, LLC", type: "Senior", minLoan: "$5,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "SFR Portfolio", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "karil@columbiapacific.com", phone: "2069639710", recourse: "CASE BY CASE", contactPerson: "Kari Luttinen", loanTerms: "1 year, 2 year, 3 year, 4 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: ["WA"], notes: "Bridge/hard money across the country.  Prefer a 5 minute phone call to discuss the deal vs. an email. They have in house funds so assured to close" },
  { id: 221, source: "Spreadsheet", spreadsheetRow: "R222", program: "Commercial Alliance (CUSO)", lender: "Commercial Alliance (CUSO)", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["MI"], assets: ["Apartments"], status: "Active", email: "", phone: "248-457-3548", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "5yr terms (10yr with reprice at 10). 15/20yr Amortizations. Need to still have decent amount of equity in the deal." },
  { id: 222, source: "Spreadsheet", spreadsheetRow: "R223", program: "Community First Bank of Indiana", lender: "Community First Bank of Indiana", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "80%", minDscr: "N/A", states: ["IN"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "rbolivar@cfbindiana.com", phone: "317-399-7505", recourse: "CASE BY CASE", contactPerson: "Rafael Bolivar", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Can do specialty assets, asset needs to be in IN, sponsor can be outside IN" },
  { id: 223, source: "Spreadsheet", spreadsheetRow: "R224", program: "Continuum Capital Funding", lender: "Continuum Capital Funding", type: "Senior", minLoan: "$100,000", maxLoan: "$3,000,000", maxLtv: "70%", minDscr: "N/A", states: ["IL"], assets: ["Apartments", "Other"], status: "Active", email: "steve@ccfbridgeloans.com", phone: "312-620-1100", recourse: "FULL", contactPerson: "Steve Adams", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "Only lend in Chicago land area (2 hour radius of Chicago).  Asset needs to have a residential component." },
  { id: 224, source: "Spreadsheet", spreadsheetRow: "R225", program: "CorAmerica", lender: "CorAmerica", type: "Senior", minLoan: "$10,000,000", maxLoan: "$40,000,000", maxLtv: "70-85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "CorAmerica is a good life company lender for with deals with a 'story'. They also have a very strong bridge program which can offer I/O and non-recourse for unusual product types." },
  { id: 225, source: "Spreadsheet", spreadsheetRow: "R226", program: "CoreVest", lender: "CoreVest Finance", type: "Senior", minLoan: "$500,000", maxLoan: "$100,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Other"], status: "Active", email: "timothy@cvest.com", phone: "949.344.7889", recourse: "NON RECOURSE", contactPerson: "Tim Leber", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "$500k minimum.  Bridge more focused on borrower" },
  { id: 226, source: "Spreadsheet", spreadsheetRow: "R227", program: "CoreVest (Development)", lender: "CoreVest Finance", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Other"], status: "Active", email: "boris@cvest.com", phone: "949.344.7889", recourse: "NON RECOURSE", contactPerson: "Boris Zhuravel", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 227, source: "Spreadsheet", spreadsheetRow: "R228", program: "Country Bank", lender: "Country Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Co-living"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 228, source: "Spreadsheet", spreadsheetRow: "R229", program: "CRE Simple", lender: "CRE Simple", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "laura@cresimple.com, justin@cresimple.com", phone: "(650) 799-6851", recourse: "CASE BY CASE", contactPerson: "Laura Millichap", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Credit rating requirement exceptions: Chik-fil-a, Dunkin Donuts" },
  { id: 229, source: "Spreadsheet", spreadsheetRow: "R230", program: "Cross River Bank", lender: "Cross River Bank", type: "Senior", minLoan: "$200,000", maxLoan: "$20,500,000", maxLtv: "", minDscr: "N/A", states: ["NJ", "NY", "CT"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "sstern@crossriverbank.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Shlomo Stern", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 230, source: "Spreadsheet", spreadsheetRow: "R231", program: "Cross River Bank - Bridge", lender: "Cross River Bank", type: "Senior", minLoan: "$200,000", maxLoan: "$20,500,000", maxLtv: "", minDscr: "N/A", states: ["NJ", "NY", "CT", "FL", "DE", "DC"], assets: ["Apartments"], status: "Active", email: "sstern@crossriverbank.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Shlomo Stern", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition"], sponsorStates: [], notes: "6.5-7.5% I/O for value add, perm loan on back end Sponsor experience" },
  { id: 231, source: "Spreadsheet", spreadsheetRow: "R232", program: "Cross River Bank - Construction/Major Rehab", lender: "Cross River Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["NJ", "NY", "CT"], assets: ["Apartments"], status: "Active", email: "sstern@crossriverbank.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Shlomo Stern", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 232, source: "Spreadsheet", spreadsheetRow: "R233", program: "Crowdfunz - land acquisition", lender: "Crowdfunz", type: "Senior", minLoan: "$1,000,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Land"], status: "Active", email: "johnny@crowdfunz.com", phone: "347-607-7980", recourse: "CASE BY CASE", contactPerson: "Johnny Zhang", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition"], sponsorStates: [], notes: "Land acquisition up to 55% LTV" },
  { id: 233, source: "Spreadsheet", spreadsheetRow: "R234", program: "CUBG", lender: "CUBG", type: "Senior", minLoan: "$500,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jeff.stone@cubg.org", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 234, source: "Spreadsheet", spreadsheetRow: "R235", program: "CUBS", lender: "CUBS", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["GA", "SC", "TN", "AL"], assets: ["Apartments", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "davidp@cubsllc.org", phone: "(770) 416-2166", recourse: "CASE BY CASE", contactPerson: "David Polevoy", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Originate loans for a network of 22 credit unions. No Western TN." },
  { id: 235, source: "Spreadsheet", spreadsheetRow: "R236", program: "Customer's Bank - multifamily construction", lender: "Customer's Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["NJ", "CT", "MA"], assets: ["Apartments"], status: "Active", email: "ksmith@customersbank.com", phone: "516-501-2038", recourse: "CASE BY CASE", contactPerson: "Kevin Smith", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Focus is on strong sponsorship (with clean background) and sufficient equity." },
  { id: 236, source: "Spreadsheet", spreadsheetRow: "R237", program: "Davidson Kempner - senior", lender: "Davidson Kempner", type: "Senior", minLoan: "$60,000,000", maxLoan: "$250,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "alliu@dkpartners.com", phone: "646-282-5869", recourse: "CASE BY CASE", contactPerson: "Alan Liu", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Distress, restructuring, capital dislocation, complex situations" },
  { id: 237, source: "Spreadsheet", spreadsheetRow: "R238", program: "Delta Community CU", lender: "Delta Community CU", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "eric.latimer@deltacommunitycu.com", phone: "678-595-3816", recourse: "CASE BY CASE", contactPerson: "Eric Latimer", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["GA"], notes: "Retail needs to have strong anchor \"like Publix\"; sponsor must be local; 75% max LTV" },
  { id: 238, source: "Spreadsheet", spreadsheetRow: "R239", program: "Desert Financial Credit Union - Commerical Lending", lender: "Desert Financial Credit Union", type: "Senior", minLoan: "$100,000", maxLoan: "$16,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AZ"], assets: ["Apartments", "Condos", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "david.a.jones@desertfinancial.com", phone: "602-708-4174", recourse: "CASE BY CASE", contactPerson: "David Jones", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["AZ"], notes: "70% LTV OOCRE, 80% LTV NOOCRE, Spread Varies, Specialize in Commerical Investment Prop, Require Personal and Business debt schedule and history of business" },
  { id: 239, source: "Spreadsheet", spreadsheetRow: "R240", program: "Deutsche Bank", lender: "Deutsche Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "ryan.katz@db.com", phone: "310.788.6431", recourse: "CASE BY CASE", contactPerson: "Ryan Katz", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Will look at $5MM + deals (.5 to 1pt paid via term sheet depending on deal size.)" },
  { id: 240, source: "Spreadsheet", spreadsheetRow: "R241", program: "Dime Community Bank", lender: "Dime Community Bank", type: "Senior", minLoan: "$0", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "awilson@dime.com", phone: "718-782-6200 ext 5588", recourse: "CASE BY CASE", contactPerson: "Anthony Wilson", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Not as aggressive on multifamily as they once were" },
  { id: 241, source: "Spreadsheet", spreadsheetRow: "R242", program: "Dominion Capital - Multifamily Program", lender: "Dominion Capital", type: "Senior", minLoan: "$0", maxLoan: "$7,000,000", maxLtv: "80%", minDscr: "N/A", states: ["NY", "NJ", "CA", "OH", "FL", "MA"], assets: ["Apartments", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Light Industrial", "Land"], status: "Active", email: "daniel.hanasab@domcapllc.com", phone: "212-785-4683", recourse: "FULL", contactPerson: "Daniel Hanasab", loanTerms: "1 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Looking at Top MSA's and suburbs" },
  { id: 242, source: "Spreadsheet", spreadsheetRow: "R243", program: "Drake Real Estate Partners - acquisition", lender: "Drake Real Estate Partners", type: "JV Equity", minLoan: "$7,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jlee@drakerep.com", phone: "646-475-2392", recourse: "CASE BY CASE", contactPerson: "Jiho Lee", loanTerms: "", typeOfLoans: ["Acquisition"], sponsorStates: [], notes: "" },
  { id: 243, source: "Spreadsheet", spreadsheetRow: "R244", program: "Drake Real Estate Partners - development", lender: "Drake Real Estate Partners", type: "JV Equity", minLoan: "$7,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Other"], status: "Active", email: "jlee@drakerep.com", phone: "646-475-2392", recourse: "CASE BY CASE", contactPerson: "Jiho Lee", loanTerms: "", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 244, source: "Spreadsheet", spreadsheetRow: "R245", program: "Dwight Capital - Development", lender: "Dwight Capital", type: "Senior", minLoan: "$8,000,000", maxLoan: "$10.0B", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Assisted Living", "Hospital/Health Care"], status: "Active", email: "by@dwightcap.com", phone: "347-338-6361", recourse: "CASE BY CASE", contactPerson: "Brian Yee", loanTerms: "10 year, 35 year, 40 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Cannot do bridge to HUD for construction loans." },
  { id: 245, source: "Spreadsheet", spreadsheetRow: "R246", program: "Dwight Capital - Refi", lender: "Dwight Capital", type: "Senior", minLoan: "$4,000,000", maxLoan: "$10.0B", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Assisted Living", "Hospital/Health Care"], status: "Active", email: "by@dwightcap.com", phone: "347-338-6361", recourse: "CASE BY CASE", contactPerson: "Brian Yee", loanTerms: "10 year, 35 year, 40 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "If student housing, must be rented annually by unit (not by bed)." },
  { id: 246, source: "Spreadsheet", spreadsheetRow: "R247", program: "East West Bank", lender: "EastWest Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "65%", minDscr: "N/A", states: ["CA", "NV", "TX", "GA", "NY", "NJ", "CT", "MA", "DC", "PA"], assets: ["Apartments", "SFR Portfolio", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "derrick.do@eastwestbank.com, david.watson@eastwestbank.com, austin.clay@eastwestbank.com", phone: "213-392-4771", recourse: "FULL", contactPerson: "Austin Clay", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 247, source: "Spreadsheet", spreadsheetRow: "R248", program: "Eastern Bank", lender: "Eastern Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["MA", "NH"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "m.osborne@easternbank.com", phone: "781-964-9495", recourse: "CASE BY CASE", contactPerson: "Matthew Osborne", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["MA", "NH"], notes: "" },
  { id: 248, source: "Spreadsheet", spreadsheetRow: "R249", program: "Eastern Savings Bank", lender: "Eastern Savings Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["MD", "DE", "PA", "NY", "NJ"], assets: ["Apartments", "Student Housing", "SFR Portfolio", "Office", "Retail-Multi Tenant"], status: "Active", email: "sfreitag@easternsavingsbank.com", phone: "410-568-6173", recourse: "FULL", contactPerson: "Scott Freitag", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 249, source: "Spreadsheet", spreadsheetRow: "R250", program: "Edgewood Capital Advisors", lender: "Edgewood Capital Advisors", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "matt@edgewoodcapital.com", phone: "203-803-6091, 203-255-1700", recourse: "CASE BY CASE", contactPerson: "Matt Cozzi", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will lend on land with entitements to experienced borrowers. Active in MEZZ development, equity $ must be atleast size of MEZZ $" },
  { id: 250, source: "Spreadsheet", spreadsheetRow: "R251", program: "Edgewood Capital Advisors - NYC Metro", lender: "Edgewood Capital Advisors", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["CT", "NJ", "NY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "matt@edgewoodcapital.com", phone: "203-803-6091, 203-255-1700", recourse: "CASE BY CASE", contactPerson: "Matt Cozzi", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will lend on land with entitements to experienced borrowers. Active in MEZZ development, equity $ must be atleast size of MEZZ $" },
  { id: 251, source: "Spreadsheet", spreadsheetRow: "R252", program: "Emerald Creek - national", lender: "Emerald Creek Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "SSteinel@emeraldcreekcapital.com", phone: "646.237.2568", recourse: "CASE BY CASE", contactPerson: "Scott Steinel", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 252, source: "Spreadsheet", spreadsheetRow: "R253", program: "Emerald Creek - NYC", lender: "Emerald Creek Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "SSteinel@emeraldcreekcapital.com", phone: "646.237.2568", recourse: "CASE BY CASE", contactPerson: "Scott Steinel", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 253, source: "Spreadsheet", spreadsheetRow: "R254", program: "Emigrant Bank", lender: "Emigrant Bank", type: "Senior", minLoan: "$0", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Retail-Multi Tenant", "Other"], status: "Active", email: "peckr@emigrant.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Bob Peck", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 254, source: "Spreadsheet", spreadsheetRow: "R255", program: "Empire National Bank - construction", lender: "Empire National Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$13,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "fderosa@empirenb.com", phone: "631-881-4491", recourse: "CASE BY CASE", contactPerson: "Frank DeRosa", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 255, source: "Spreadsheet", spreadsheetRow: "R256", program: "Empire National Bank - perm", lender: "Empire National Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$13,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "fderosa@empirenb.com", phone: "631-881-4491", recourse: "CASE BY CASE", contactPerson: "Frank DeRosa", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 256, source: "Spreadsheet", spreadsheetRow: "R257", program: "Enact Partners", lender: "Enact Partners", type: "Senior", minLoan: "$400,000", maxLoan: "$5,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Land", "Self-storage", "Religious"], status: "Active", email: "Michael@EnactPartners.com", phone: "760-450-6180", recourse: "CASE BY CASE", contactPerson: "Michael Schumacher", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["AL", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"], notes: "" },
  { id: 257, source: "Spreadsheet", spreadsheetRow: "R258", program: "EquiMax", lender: "EquiMax", type: "Senior", minLoan: "$2,000,000", maxLoan: "$5,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "AZ", "NV"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "sean@emaxloan.com", phone: "310-873-9550", recourse: "CASE BY CASE", contactPerson: "Sean Namvar", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 258, source: "Spreadsheet", spreadsheetRow: "R259", program: "Extensia Financial (CUSO)", lender: "Extensia Financial", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "jwiegand@extensiafinancial.com", phone: "512-964-2456", recourse: "FULL", contactPerson: "Jon Wiegand", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Can do foreign nationals with US bank account, SS #, current US CRE." },
  { id: 259, source: "Spreadsheet", spreadsheetRow: "R260", program: "Farmers & Merchants Bank", lender: "Farmers & Merchants Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["CA"], assets: [], status: "Active", email: "joel.reeling@fmb.com, kyle.roddy@fmb.com", phone: "760-231-9184", recourse: "CASE BY CASE", contactPerson: "Joel Reeling", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "Can do more flexible deals, conservative on LTVs" },
  { id: 260, source: "Spreadsheet", spreadsheetRow: "R261", program: "FBC Funding - Multifamily", lender: "FBC Funding", type: "Senior", minLoan: "$250,000", maxLoan: "$5,000,000", maxLtv: "70%", minDscr: "N/A", states: ["IL", "FL", "GA", "VA", "MD", "DC"], assets: ["Apartments"], status: "Active", email: "louisj@fbcfunding.com", phone: "708-229-3244", recourse: "CASE BY CASE", contactPerson: "Louis Jeffries", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 261, source: "Spreadsheet", spreadsheetRow: "R262", program: "FBC Funding- Commercial", lender: "FBC Funding", type: "Senior", minLoan: "$500,000", maxLoan: "$2,500,000", maxLtv: "65%", minDscr: "N/A", states: ["IL", "FL", "GA", "VA", "MD", "DC"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "louisj@fbcfunding.com", phone: "708-229-3244", recourse: "CASE BY CASE", contactPerson: "Louis Jeffries", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "No assisted living or special use properties, no land or ground up construction" },
  { id: 262, source: "Spreadsheet", spreadsheetRow: "R263", program: "Fifth Third - Western MI sponsors", lender: "Fifth Third Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "peter.draaisma@53.com", phone: "616.653.5084", recourse: "CASE BY CASE", contactPerson: "Peter Draaisma", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["MI"], notes: "Can follow middle-market sponsors from Western MI out to other markets" },
  { id: 263, source: "Spreadsheet", spreadsheetRow: "R264", program: "Fifth Third Bank", lender: "Fifth Third Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "80%", minDscr: "N/A", states: ["MN", "IA", "MO", "WI", "IL", "IN", "MI", "OH"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "Delonda.Belanger@53.com", phone: "312-442-5029", recourse: "CASE BY CASE", contactPerson: "Delonda Belanger", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 264, source: "Spreadsheet", spreadsheetRow: "R265", program: "Finance of America - Commercial", lender: "Finance of America", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "SFR Portfolio"], status: "Active", email: "bryan.closset@financeofamerica.com", phone: "(224) 221-2124, (630) 918-2423", recourse: "NON RECOURSE", contactPerson: "Bryan Closset", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 265, source: "Spreadsheet", spreadsheetRow: "R266", program: "Financial Federal Bank", lender: "Financial Federal Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "rwood@finfedmem.com", phone: "901-371-6013", recourse: "CASE BY CASE", contactPerson: "Rick Wood", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 266, source: "Spreadsheet", spreadsheetRow: "R267", program: "First American Bank - Development", lender: "First American Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["IL", "WI", "IN", "FL"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jlee@firstambank.com", phone: "847-586-2248", recourse: "CASE BY CASE", contactPerson: "John Lee", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: ["IL", "WI", "IN", "FL"], notes: "IL, Southern WI, IN and Miami, FL" },
  { id: 267, source: "Spreadsheet", spreadsheetRow: "R268", program: "First American Bank - Existing", lender: "First American Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "75%", minDscr: "N/A", states: ["IL", "WI", "IN", "FL"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jlee@firstambank.com", phone: "847-586-2248", recourse: "CASE BY CASE", contactPerson: "John Lee", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["IL", "WI", "IN", "FL"], notes: "IL, Southern WI, IN and Miami, FL" },
  { id: 268, source: "Spreadsheet", spreadsheetRow: "R269", program: "First Chatham Bank - SBA/USDA", lender: "First Chatham Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$6,500,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Assisted Living", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "bgoff@firstchatham.com", phone: "(404) 932-6562", recourse: "CASE BY CASE", contactPerson: "Bobby Goff", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 269, source: "Spreadsheet", spreadsheetRow: "R270", program: "First Commonwealth Bank", lender: "First Commonwealth Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["OH", "PA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "", phone: "614-442-3646", recourse: "CASE BY CASE", contactPerson: "Roger Hayes", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 270, source: "Spreadsheet", spreadsheetRow: "R271", program: "First Fidelity Bank", lender: "First Fidelity Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$7,500,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "tpatterson@ffb.com", phone: "405-821-4085", recourse: "CASE BY CASE", contactPerson: "Todd Patterson", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "national STNL needs to be investment grade; \"Most of our STNL transaction have remaining lease terms of between 10 and 20 years.  Anything inside of 10 years is a challenge for us unless it’s especially low-leveraged.\"" },
  { id: 271, source: "Spreadsheet", spreadsheetRow: "R272", program: "First Fidelity Bank - Oklahoma", lender: "First Fidelity Bank", type: "Senior", minLoan: "$10,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["OK", "TX", "KS"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "dpopp@ffb.com", phone: "405-801-8401", recourse: "CASE BY CASE", contactPerson: "Donna Popp", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will look at any asset around the state of Oklahoma" },
  { id: 272, source: "Spreadsheet", spreadsheetRow: "R273", program: "First Financial Bank", lender: "First Financial Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["OH", "KY", "IN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "bkbailey@mainsourcebank.com", phone: "513 259 2626", recourse: "CASE BY CASE", contactPerson: "Brian Bailey", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 273, source: "Spreadsheet", spreadsheetRow: "R274", program: "First Foundation Bank", lender: "First Foundation Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$35,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "NV", "HI"], assets: ["Apartments", "Senior Housing", "SFR Portfolio", "Mobile Home Park", "Self-storage"], status: "Active", email: "pmatchett@ff-inc.com", phone: "949-668-7139", recourse: "CASE BY CASE", contactPerson: "Patrick Matchett", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 274, source: "Spreadsheet", spreadsheetRow: "R275", program: "First Internet Bank - owner-occupied commercial", lender: "First Internet Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hospital/Health Care", "Other"], status: "Active", email: "mupton@firstib.com", phone: "317-806-8232", recourse: "CASE BY CASE", contactPerson: "Mike Upton", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Investment Grade Tenant only. No Max leverage. No non-recourse. Long lease term. If lease term is under 15 years, amortization will be 18-20." },
  { id: 275, source: "Spreadsheet", spreadsheetRow: "R276", program: "First Internet Bank - STNL", lender: "First Internet Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$20,000,000", maxLtv: "70%", minDscr: "1.15", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hospital/Health Care", "Other"], status: "Active", email: "mupton@firstib.com", phone: "317-806-8232", recourse: "CASE BY CASE", contactPerson: "Mike Upton", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Investment Grade Tenant only. No Max leverage. No non-recourse. Long lease term. If lease term is under 15 years, amortization will be 18-20." },
  { id: 276, source: "Spreadsheet", spreadsheetRow: "R277", program: "First Landmark Bank", lender: "First Landmark Bank", type: "Senior", minLoan: "$0", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "mwilliamson@firstlandmark.com", phone: "770-799-5655", recourse: "CASE BY CASE", contactPerson: "Mary Willimason", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Community Bank - wants relationship. Local ownership. 20 yr AM - longest fixed is 5 yr." },
  { id: 277, source: "Spreadsheet", spreadsheetRow: "R278", program: "First Midwest Bank", lender: "First Midwest Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$40,000,000", maxLtv: "75%", minDscr: "N/A", states: ["IL", "IN", "MI", "MN", "WI", "MO", "IA"], assets: ["Apartments", "Student Housing", "Assisted Living", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Hospital/Health Care"], status: "Active", email: "bob.rodie@firstmidwest.com", phone: "708-876-8865", recourse: "CASE BY CASE", contactPerson: "Bob Rodie", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Need experienced sponsor, pricing is typically fixed over Treasury or SWAPs or floating over Prime or LIBOR" },
  { id: 278, source: "Spreadsheet", spreadsheetRow: "R279", program: "First National Bank", lender: "First National Bank of Nebraska", type: "Senior", minLoan: "$0", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["CO"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "rschmitz@fnni.com", phone: "970-495-9450", recourse: "CASE BY CASE", contactPerson: "Roch Schmitz", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: ["CO"], notes: "Flagged Hotel, up to 75% LTC  construction lending" },
  { id: 279, source: "Spreadsheet", spreadsheetRow: "R280", program: "First Republic Bank", lender: "First Republic Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Co-living"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 280, source: "Spreadsheet", spreadsheetRow: "R281", program: "Flagstar Bank", lender: "Flagstar Bank", type: "Senior", minLoan: "$0", maxLoan: "$2,500,000", maxLtv: "75%", minDscr: "N/A", states: ["MI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "crista.kolin@flagstar.com", phone: "248-863-2907", recourse: "CASE BY CASE", contactPerson: "Crista Kolin", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Crista does business lending, different department for loans >$2.5mm" },
  { id: 281, source: "Spreadsheet", spreadsheetRow: "R282", program: "Flushing Bank - Above $1.5 Million", lender: "Flushing Bank", type: "Senior", minLoan: "$1,500,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "ivan.nunez@flushingbank.com", phone: "718-512-2908", recourse: "CASE BY CASE", contactPerson: "Ivan Nunez", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "75% Multifamily, 65% all others; 5/30 typical term" },
  { id: 282, source: "Spreadsheet", spreadsheetRow: "R283", program: "Flushing Bank - Below $1.5 Million", lender: "Flushing Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$1,500,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "SFR Portfolio"], status: "Active", email: "cohara@flushingbank.com", phone: "718-512-2809", recourse: "CASE BY CASE", contactPerson: "Chris O'Hara", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "75% Multifamily, 65% all others; 5/30 typical term" },
  { id: 283, source: "Spreadsheet", spreadsheetRow: "R284", program: "Flushing Bank - Owner Occupied", lender: "Flushing Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "ragresti@flushingbank.com", phone: "646 923 9521", recourse: "CASE BY CASE", contactPerson: "Rosalia Agresti", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "75% owner occupied - 80% LTV medical" },
  { id: 284, source: "Spreadsheet", spreadsheetRow: "R285", program: "Fort Amsterdam Capital - bridge", lender: "Fort Amsterdam Capital", type: "Senior", minLoan: "$4,000,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NY", "NJ", "CT", "NH", "RI", "MA", "VT", "ME", "DE"], assets: ["Apartments", "Condos", "Office", "Light Industrial", "Land"], status: "Active", email: "nicholas.kheny@fortamcap.com", phone: "610.937.7734", recourse: "CASE BY CASE", contactPerson: "Nick Kheny", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Typically full recourse unless lower leverage" },
  { id: 285, source: "Spreadsheet", spreadsheetRow: "R286", program: "Fort Amsterdam Capital - construction", lender: "Fort Amsterdam Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "nicholas.kheny@fortamcap.com", phone: "610.937.7734", recourse: "CASE BY CASE", contactPerson: "Nick Kheny", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Typically full recourse unless lower leverage" },
  { id: 286, source: "Spreadsheet", spreadsheetRow: "R287", program: "Fort Amsterdam Capital - term", lender: "Fort Amsterdam Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "1.1x", states: ["NY", "NJ", "CT", "NH", "RI", "MA", "VT", "ME", "DE"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "nicholas.kheny@fortamcap.com", phone: "610.937.7734", recourse: "CASE BY CASE", contactPerson: "Nick Kheny", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Higher rates than banks, I/O, down to 1.1x DSCR with longer term leases Can handle property violations" },
  { id: 287, source: "Spreadsheet", spreadsheetRow: "R288", program: "Fortress Investment Group - development", lender: "Fortress Investment Group", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "sgarfield@fortress.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 288, source: "Spreadsheet", spreadsheetRow: "R289", program: "Franklin Synergy Bank", lender: "Franklin Synergy Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$30,000,000", maxLtv: "", minDscr: "N/A", states: ["TN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "travis.dumke@franklinsynergy.com", phone: "615-236-8312", recourse: "CASE BY CASE", contactPerson: "Travis Dunke", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Strongest in Middle Tennessee (Nashville). The borrower or the property has to be in lending footprint." },
  { id: 289, source: "Spreadsheet", spreadsheetRow: "R290", program: "Gamma Real Estate Lending", lender: "Gamma Real Estate Lending", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "jkalikow@gammare.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Jonathan Kalikow", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 290, source: "Spreadsheet", spreadsheetRow: "R291", program: "Garrison Investment Group - Bridge", lender: "Garrison Investment Group", type: "Senior", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jscheiman@garrisoninv.com", phone: "212-372-9585", recourse: "CASE BY CASE", contactPerson: "Jordan Scheiman", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 291, source: "Spreadsheet", spreadsheetRow: "R292", program: "Garrison Investment Group - Mezz", lender: "Garrison Investment Group", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jscheiman@garrisoninv.com", phone: "212-372-9585", recourse: "CASE BY CASE", contactPerson: "Jordan Scheiman", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 292, source: "Spreadsheet", spreadsheetRow: "R293", program: "Gelt Financial - Bridge/Hard Money", lender: "Gelt Financial", type: "Senior", minLoan: "$100,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "jackmiller@geltfinancial.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 293, source: "Spreadsheet", spreadsheetRow: "R294", program: "Genesis Capital", lender: "Genesis Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$1,500,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "SFR Portfolio", "Other"], status: "Active", email: "Michael.MacNeil@GenesisCapital.com", phone: "617-823-0551", recourse: "FULL", contactPerson: "Mike MacNeil", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 294, source: "Spreadsheet", spreadsheetRow: "R295", program: "Genworth - via Walker & Dunlop", lender: "Genworth", type: "Senior", minLoan: "$2,000,000", maxLoan: "$35,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6345", recourse: "CASE BY CASE", contactPerson: "Dave Semmer", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 295, source: "Spreadsheet", spreadsheetRow: "R296", program: "Geolo Capital - equity", lender: "Geolo Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "db@geolo.com", phone: "415-694-5810", recourse: "CASE BY CASE", contactPerson: "Duff Bedrosian", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "20% of the equity should come from the sponsor they partner with." },
  { id: 296, source: "Spreadsheet", spreadsheetRow: "R297", program: "Gershman - Long Term Mutlifamily & Health HUD", lender: "Gershman Mortgage", type: "Senior", minLoan: "$2,000,000", maxLoan: "$250,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Assisted Living", "Hospital/Health Care"], status: "Active", email: "kmuesenfechter@gershman.com", phone: "816-585-1963", recourse: "NON RECOURSE", contactPerson: "Kevin Muesenfechter", loanTerms: "35 year, 40 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Agency lender looking for long term multifamily and healthcare facility" },
  { id: 297, source: "Spreadsheet", spreadsheetRow: "R298", program: "Goldman Sachs - large loans", lender: "Goldman Sachs", type: "Senior", minLoan: "$100,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jeffrey.fine@gs.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Jeffrey Fine", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 298, source: "Spreadsheet", spreadsheetRow: "R299", program: "Greater Commercial Lending", lender: "Greater Commercial Lending", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "smurrill@greaterlending.com", phone: "775-326-6717", recourse: "CASE BY CASE", contactPerson: "Shalla Murrill", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "USDA, FSA, CF, SBA 7a, SBA 504" },
  { id: 299, source: "Spreadsheet", spreadsheetRow: "R300", program: "Greystone - agency", lender: "Greystone", type: "Senior", minLoan: "$750,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "dov.weinschneider@greyco.com, monica.shiwratan@greyco.com, gavin.niemi@greyco.com, velve.luuk@greyco.com", phone: "540-359-7031", recourse: "CASE BY CASE", contactPerson: "DOV WEINSCHNEIDER", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 300, source: "Spreadsheet", spreadsheetRow: "R301", program: "Greystone - CMBS Mezz", lender: "Greystone", type: "Mezzanine", minLoan: "$500,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "monica.shiwratan@greyco.com, gavin.niemi@greyco.com, velve.luuk@greyco.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Monica Shiwratan", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Greystone can do Mezz on top if they are originating the CMBS" },
  { id: 301, source: "Spreadsheet", spreadsheetRow: "R302", program: "Gryphon - Large Loan", lender: "Gryphon Real Estate Capital Partners", type: "Senior", minLoan: "$100,000,000", maxLoan: "$250,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Assisted Living", "Light Industrial", "Self-storage"], status: "Active", email: "yair.tilson@gryphonrecapital.com", phone: "914.450.1872", recourse: "NON RECOURSE", contactPerson: "Yair Tilson", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 302, source: "Spreadsheet", spreadsheetRow: "R303", program: "Gryphon - Residential Low Leverage Transitional", lender: "Gryphon Real Estate Capital Partners", type: "Senior", minLoan: "$10,000,000", maxLoan: "$75,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing"], status: "Active", email: "daniel.rawson@gryphonrecapital.com", phone: "914-450-1872", recourse: "CASE BY CASE", contactPerson: "Daniel Rawson", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 303, source: "Spreadsheet", spreadsheetRow: "R304", program: "Gryphon - Residential Permanent Financing", lender: "Gryphon Real Estate Capital Partners", type: "Senior", minLoan: "$10,000,000", maxLoan: "$75,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing"], status: "Active", email: "daniel.rawson@gryphonrecapital.com", phone: "914-450-1872", recourse: "CASE BY CASE", contactPerson: "Daniel Rawson", loanTerms: "5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 304, source: "Spreadsheet", spreadsheetRow: "R305", program: "Gryphon - Residential Transitional Lending", lender: "Gryphon Real Estate Capital Partners", type: "Senior", minLoan: "$10,000,000", maxLoan: "$75,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing"], status: "Active", email: "daniel.rawson@gryphonrecapital.com", phone: "914-450-1872", recourse: "CASE BY CASE", contactPerson: "Daniel Rawson", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 305, source: "Spreadsheet", spreadsheetRow: "R306", program: "Gryphon - Self Storage Permanent Financing", lender: "Gryphon Real Estate Capital Partners", type: "Senior", minLoan: "$10,000,000", maxLoan: "$75,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Self-storage"], status: "Active", email: "daniel.rawson@gryphonrecapital.com", phone: "914-450-1872", recourse: "CASE BY CASE", contactPerson: "Daniel Rawson", loanTerms: "5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 306, source: "Spreadsheet", spreadsheetRow: "R307", program: "Gryphon - Self Storage Transitional Lending", lender: "Gryphon Real Estate Capital Partners", type: "Senior", minLoan: "$10,000,000", maxLoan: "$75,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Self-storage"], status: "Active", email: "daniel.rawson@gryphonrecapital.com", phone: "914-450-1872", recourse: "CASE BY CASE", contactPerson: "Daniel Rawson", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 307, source: "Spreadsheet", spreadsheetRow: "R308", program: "Guaranty Bank and Trust", lender: "Guaranty Bank and Trust", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["CO"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "aimee.love@gbnk.com", phone: "303-293-5574", recourse: "CASE BY CASE", contactPerson: "Aimee Love", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: ["CO"], notes: "They play well in the \"value-add\" Space. This is a relationship based lender - local and wants despoits/more transactions." },
  { id: 308, source: "Spreadsheet", spreadsheetRow: "R309", program: "Guardian Life - via Walker & Dunlop", lender: "Guardian Life", type: "Senior", minLoan: "$5,000,000", maxLoan: "$70,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6353", recourse: "CASE BY CASE", contactPerson: "Dave Semmer", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 309, source: "Spreadsheet", spreadsheetRow: "R310", program: "Hakimian Capital", lender: "Hakimian Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "sammy@hakimiancapital.com, daniel@hakimiancapital.com, michael@hakimiancapital.com", phone: "212-302-4066", recourse: "CASE BY CASE", contactPerson: "Sammy Hakimian", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 310, source: "Spreadsheet", spreadsheetRow: "R311", program: "Hanover Community Bank", lender: "Hanover Community Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$8,500,000", maxLtv: "", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "rmarrali@hanovercommunitybank.com", phone: "516-548-8504", recourse: "CASE BY CASE", contactPerson: "Robert Marrali (Chief Lending Officer)", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "2, 3, 5 , 7 and 10 year terms, with options.  Options are priced at 350 over the 5 Year UST Bill w/floors of the initial start rate" },
  { id: 311, source: "Spreadsheet", spreadsheetRow: "R312", program: "Harvest Small Business Finance", lender: "Harvest Small Business Finance", type: "Senior", minLoan: "$350,000", maxLoan: "$15,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "scoleman@harvestsbf.com", phone: "770-883-2258", recourse: "CASE BY CASE", contactPerson: "Scott Coleman", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Can do credit scores down to 600, DSCR down to 1:1" },
  { id: 312, source: "Spreadsheet", spreadsheetRow: "R313", program: "Heritage Bank (Atlanta)", lender: "Heritage Bank", type: "Senior", minLoan: "$0", maxLoan: "$9,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "scott.willis@heritagebank.com", phone: "404-433-6355", recourse: "CASE BY CASE", contactPerson: "Scott Willis", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 313, source: "Spreadsheet", spreadsheetRow: "R314", program: "Hines Realty Income Fund - mezz", lender: "Hines Realty Income Fund", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "andrew.cooper@hines.com", phone: "347 837 3807", recourse: "NON RECOURSE", contactPerson: "Andrew Cooper", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "LTV based on stabilized value, higher LTC" },
  { id: 314, source: "Spreadsheet", spreadsheetRow: "R315", program: "Hines Realty Income Fund - senior", lender: "Hines Realty Income Fund", type: "Senior", minLoan: "$5,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "andrew.cooper@hines.com", phone: "347 837 3807", recourse: "NON RECOURSE", contactPerson: "Andrew Cooper", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "LTV based on stabilized value, higher LTC" },
  { id: 315, source: "Spreadsheet", spreadsheetRow: "R316", program: "Hirshmark Capital - bridge", lender: "Hirshmark Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$50,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mfey@hirshmark.com", phone: "646-849-1821", recourse: "CASE BY CASE", contactPerson: "Michael Fey", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 316, source: "Spreadsheet", spreadsheetRow: "R317", program: "Hirshmark Capital - mezz", lender: "Hirshmark Capital", type: "Senior", minLoan: "$4,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mfey@hirshmark.com", phone: "646-849-1821", recourse: "CASE BY CASE", contactPerson: "Michael Fey", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 317, source: "Spreadsheet", spreadsheetRow: "R318", program: "HomeStreet Bank - Commerical Capital", lender: "HomeStreet Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["UT", "WA", "OR", "CO", "CA", "NV", "AZ", "TX"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "kris.hollingshead@homestreet.com, chuck.carrillo@homestreet.com", phone: "206-753-3712,310-748-7427", recourse: "CASE BY CASE", contactPerson: "Kris Hollingshead, Chuck Carillo", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "up to 30yr term (fixed first 10), 80% LTV MF and 70% all others." },
  { id: 318, source: "Spreadsheet", spreadsheetRow: "R319", program: "HomeStreet Bank - Portfolio Construction", lender: "HomeStreet Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$30,000,000", maxLtv: "", minDscr: "N/A", states: ["UT", "WA", "OR", "CO", "CA", "NV", "AZ", "TX"], assets: ["Apartments", "Office"], status: "Active", email: "kris.hollingshead@homestreet.com, chuck.carrillo@homestreet.com", phone: "206-753-3712,310-748-7427", recourse: "CASE BY CASE", contactPerson: "Kris Hollingshead, Chuck Carillo", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "3 - 10YR term, Recourse with burndowns possible, 75% MF and 70% all other, Min 50% pre-lease office, also have bridge for rehab properties" },
  { id: 319, source: "Spreadsheet", spreadsheetRow: "R320", program: "HomeStreet Bank-Portfolio Permanent", lender: "HomeStreet Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["UT", "WA", "OR", "CO", "CA", "NV", "AZ", "TX"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "kris.hollingshead@homestreet.com, chuck.carrillo@homestreet.com", phone: "206-753-3712,310-748-7427", recourse: "CASE BY CASE", contactPerson: "Kris Hollingshead, Chuck Carillo", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "3 -10YR term, 75% LTV MF & 70% all other, Primary and Secondary Markets" },
  { id: 320, source: "Spreadsheet", spreadsheetRow: "R321", program: "HSBC - development", lender: "HSBC", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "ryan.campanelli@us.hsbc.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Ryan Campanelli", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 321, source: "Spreadsheet", spreadsheetRow: "R322", program: "Hunt Mortgage - Bridge", lender: "Hunt Mortgage", type: "Senior", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "precilla.torres@huntcompanies.com", phone: "212-521-6437", recourse: "NON RECOURSE", contactPerson: "Precilla Torres", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 322, source: "Spreadsheet", spreadsheetRow: "R323", program: "Huntington Bank", lender: "Huntington National Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["MI", "OH", "PA", "IL", "KY", "WI"], assets: ["Apartments", "Retail-Multi Tenant", "Other"], status: "Active", email: "michael.skinner@huntington.com", phone: "313-791-1070", recourse: "CASE BY CASE", contactPerson: "Michael Skinner", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "MIdwest Bank - Multi, Retail, Gas Stations. Purchase & Refi but no cash out." },
  { id: 323, source: "Spreadsheet", spreadsheetRow: "R324", program: "Huntington National Bank - Chicago sponsors", lender: "Huntington National Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jonathan.gilfillan@huntington.com, scott.heiserman@huntington.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Scott Heiserman", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IL"], notes: "Chicago-based sponsors over $20M in holdings ($40M if Multifamily)" },
  { id: 324, source: "Spreadsheet", spreadsheetRow: "R325", program: "Huntington National Bank - REITs and funds", lender: "Huntington National Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "michael.d.mitro@huntington.com", phone: "216-515-6983", recourse: "CASE BY CASE", contactPerson: "Mike Mitro", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "REITs and Funds" },
  { id: 325, source: "Spreadsheet", spreadsheetRow: "R326", program: "Iberia Bank", lender: "Iberia Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Co-living"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "Need a contact", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "They term sheeted Domos' co-living project in Atlanta." },
  { id: 326, source: "Spreadsheet", spreadsheetRow: "R327", program: "iBorrow - bridge debt", lender: "iBorrow", type: "Senior", minLoan: "$2,000,000", maxLoan: "$85,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "ryan@iborrow.com", phone: "253-222-1059", recourse: "NON RECOURSE", contactPerson: "Ryan Kurth", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 327, source: "Spreadsheet", spreadsheetRow: "R328", program: "ICON Realty Capital - Multifamily", lender: "Icon Realty Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jcruz@iconrecapital.com", phone: "212-303-7676", recourse: "CASE BY CASE", contactPerson: "Jon Cruz", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "$10mm min for new construction, Pricing is 8-10% plus 2-3 points.  New development must be shovel ready." },
  { id: 328, source: "Spreadsheet", spreadsheetRow: "R329", program: "ICON Realty Capital - Multifamily construction", lender: "Icon Realty Capital", type: "Senior", minLoan: "$10,000,000", maxLoan: "$30,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jcruz@iconrecapital.com", phone: "212-303-7676", recourse: "CASE BY CASE", contactPerson: "Jon Cruz", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "$10mm min for new construction, Pricing is 8-10% plus 2-3 points.  New development must be shovel ready." },
  { id: 329, source: "Spreadsheet", spreadsheetRow: "R330", program: "ICON Realty Capital - National", lender: "Icon Realty Capital", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "FL", "TX"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jcruz@iconrecapital.com", phone: "212-303-7676", recourse: "CASE BY CASE", contactPerson: "Jon Cruz", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "$20mm min for new construction, Pricing is L+6-8%, 2-3 points, up to 70% ARV." },
  { id: 330, source: "Spreadsheet", spreadsheetRow: "R331", program: "ICON Realty Capital - NY, NJ, FL", lender: "Icon Realty Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NY", "NJ", "FL"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jcruz@iconrecapital.com", phone: "212-303-7676", recourse: "CASE BY CASE", contactPerson: "Jon Cruz", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["NY"], notes: "$15mm min for new construction, Pricing is L+6-8%, 2-3 points, up to 70% ARV." },
  { id: 331, source: "Spreadsheet", spreadsheetRow: "R332", program: "INCA Capital", lender: "INCA Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AZ", "CO", "CA", "UT", "NV"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "taber@incacapital.com, brandon@incacapital.com", phone: "602-708-0786, 480-332-2919", recourse: "CASE BY CASE", contactPerson: "Taber Lemarr, Brandon Walters", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 332, source: "Spreadsheet", spreadsheetRow: "R333", program: "Inland Mortgage Capital, LLC - Commercial", lender: "Inland Mortgage Capital, LLC", type: "Senior", minLoan: "$3,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "erutenberg@inlandmtg.com", phone: "630-586-2966", recourse: "NON RECOURSE", contactPerson: "Eugene Rutenberg", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 333, source: "Spreadsheet", spreadsheetRow: "R334", program: "Inland Mortgage Capital, LLC - Multifamily", lender: "Inland Mortgage Capital, LLC", type: "Senior", minLoan: "$3,000,000", maxLoan: "$15,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "erutenberg@inlandmtg.com", phone: "630-586-2966", recourse: "NON RECOURSE", contactPerson: "Eugene Rutenberg", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 334, source: "Spreadsheet", spreadsheetRow: "R335", program: "Inspirus Credit Union", lender: "Inspirus Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$3,000,000", maxLtv: "", minDscr: "N/A", states: ["WA"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "bobn@inspiruscu.org", phone: "509-221-9643", recourse: "CASE BY CASE", contactPerson: "Bob Niles", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["WA"], notes: "" },
  { id: 335, source: "Spreadsheet", spreadsheetRow: "R336", program: "Investors Bank - NJ/PA commercial", lender: "Investors Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "70%", minDscr: "N/A", states: ["NJ", "PA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jschaeffer@myinvestorsbank.com", phone: "609-223-8268", recourse: "CASE BY CASE", contactPerson: "James Schaeffer", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "James Lin (NYC Office) Lends in PA to Harrisburg Area (not pittsburg) Will do non-recourse for credit tenants" },
  { id: 336, source: "Spreadsheet", spreadsheetRow: "R337", program: "Investors Bank - NJ/PA multifamily", lender: "Investors Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NJ", "PA"], assets: ["Apartments"], status: "Active", email: "jschaeffer@myinvestorsbank.com", phone: "609-223-8268", recourse: "CASE BY CASE", contactPerson: "James Schaeffer", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "James Lin (NYC Office) Lends in PA to Harrisburg Area (not pittsburg)" },
  { id: 337, source: "Spreadsheet", spreadsheetRow: "R338", program: "Investors Bank - NY commercial", lender: "Investors Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jklein@investorsbank.com, jlim@investorsbank.com", phone: "646.343.2651", recourse: "CASE BY CASE", contactPerson: "Josh Klein", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 338, source: "Spreadsheet", spreadsheetRow: "R339", program: "Investors Bank - NY multifamily", lender: "Investors Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "jklein@investorsbank.com, jlim@investorsbank.com", phone: "646.343.2651", recourse: "CASE BY CASE", contactPerson: "Josh Klein", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 339, source: "Spreadsheet", spreadsheetRow: "R340", program: "iStar Financial - development", lender: "iStar Financial", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "tdoherty@istarfinancial.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 340, source: "Spreadsheet", spreadsheetRow: "R341", program: "JDM Capital - senior", lender: "JDM Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Hotel/Hospitality"], status: "Active", email: "admin@jdmcapitalcorp.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 341, source: "Spreadsheet", spreadsheetRow: "R342", program: "John Hancock Life - senior", lender: "John Hancock Life", type: "Senior", minLoan: "$7,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "ttreacy@jhancock.com", phone: "617-572-0486", recourse: "CASE BY CASE", contactPerson: "Tom Treacy", loanTerms: "10 year, 15 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "http://www.jhancockrealestate.com/lending-guidelines / Contacts are here http://www.jhancockrealestate.com/bios" },
  { id: 342, source: "Spreadsheet", spreadsheetRow: "R343", program: "John Hancock Life - subordinate", lender: "John Hancock Life", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "ttreacy@jhancock.com", phone: "617-572-0486", recourse: "CASE BY CASE", contactPerson: "Tom Treacy", loanTerms: "10 year, 15 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "http://www.jhancockrealestate.com/lending-guidelines / Contacts are here http://www.jhancockrealestate.com/bios" },
  { id: 343, source: "Spreadsheet", spreadsheetRow: "R344", program: "JP Morgan Chase", lender: "JP Morgan Chase", type: "Senior", minLoan: "$5,000,000", maxLoan: "$200,000,000", maxLtv: "80%", minDscr: "N/A", states: ["WA", "OR", "CA", "CO", "NY", "MN", "IL", "MA", "DC"], assets: ["Apartments", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "dan.fine@chase.com", phone: "516-683-4906", recourse: "CASE BY CASE", contactPerson: "Dan Fine", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 344, source: "Spreadsheet", spreadsheetRow: "R345", program: "Kansas City Life - via Walker & Dunlop", lender: "Kansas City Life", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6350", recourse: "CASE BY CASE", contactPerson: "Dave Semmer", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 345, source: "Spreadsheet", spreadsheetRow: "R346", program: "Kawa Capital Mangement - Senior", lender: "Kawa Capital Management", type: "Senior", minLoan: "$3,500,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care"], status: "Active", email: "Eduardo@Kawa.com", phone: "305-560-5235", recourse: "CASE BY CASE", contactPerson: "Eduardo Milhem", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 346, source: "Spreadsheet", spreadsheetRow: "R347", program: "Kellogg CCU - Southwest Michigan Lender", lender: "Kellogg Community Credit Union", type: "Senior", minLoan: "$200,000", maxLoan: "$2,000,000", maxLtv: "75%", minDscr: "N/A", states: ["MI"], assets: ["Apartments", "SFR Portfolio", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "ecase@kelloggccu.org", phone: "269-968-9543", recourse: "FULL", contactPerson: "Ed Case", loanTerms: "5 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "Focused on Southwest Michigan," },
  { id: 347, source: "Spreadsheet", spreadsheetRow: "R348", program: "Key Bridge", lender: "Key Bridge Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "60%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Hospital/Health Care", "Other"], status: "Active", email: "liz@keybridgefund.com", phone: "626-241-3550", recourse: "NON RECOURSE", contactPerson: "Liz Tao", loanTerms: "1 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Low bridge rates for low leverage deals (sub 60%)" },
  { id: 348, source: "Spreadsheet", spreadsheetRow: "R349", program: "Keybank - Commercial", lender: "Keybank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$200,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "david_rabban@keybank.com, daniel_j_baker@keybank.com", phone: "212-424-1827", recourse: "NON RECOURSE", contactPerson: "David Rabban, Dan Baker", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Usually partial recourse Can also place deals with Life Cos." },
  { id: 349, source: "Spreadsheet", spreadsheetRow: "R350", program: "Keybank - Multifamily", lender: "Keybank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$250,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Mobile Home Park"], status: "Active", email: "david_rabban@keybank.com, janette_o'brien@keybank.com", phone: "216-689-4784", recourse: "NON RECOURSE", contactPerson: "Janette O'Brien", loanTerms: "1 year, 10 year, 12 year, 15 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "https://www.key.com/corporate/financing/agency-fannie-freddie.jsp" },
  { id: 350, source: "Spreadsheet", spreadsheetRow: "R351", program: "Keybank - Senior housing & care", lender: "Keybank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$200,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Senior Housing", "Assisted Living", "Hospital/Health Care"], status: "Active", email: "carolyn_c_nazdin@keybank.com", phone: "202-452-4912", recourse: "CASE BY CASE", contactPerson: "Carolyn Nazdin", loanTerms: "10 year, 12 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Fannie, Freddie, HUD, and balance sheet for senior housing & care $15,000,000+ for non-stabilized" },
  { id: 351, source: "Spreadsheet", spreadsheetRow: "R352", program: "Keybank - Streamlined (small balance securitized)", lender: "Keybank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$12,000,000", maxLtv: "75%", minDscr: "1.25", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "david_rabban@keybank.com", phone: "212-424-1827", recourse: "NON RECOURSE", contactPerson: "David Rabban", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Cap fees at $22k.  45 days to close.  DSCR 1.3 commercial, 1.25 multifamily.  Debt yield 9% commercial, 8% multifamily.  Prepay greater of YM or 1%." },
  { id: 352, source: "Spreadsheet", spreadsheetRow: "R353", program: "Keysite Capital Partners", lender: "Keysite Capital Partners", type: "Mezzanine", minLoan: "$1,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "dmiller@keysitecapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Daniel Miller", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "NYC ONLY" },
  { id: 353, source: "Spreadsheet", spreadsheetRow: "R354", program: "Keystone Bridge Capital - Bridge Product", lender: "Keystone Bridge Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Self-storage"], status: "Active", email: "gschecher@keystonebridgecapital.com", phone: "561-843-6032", recourse: "NON RECOURSE", contactPerson: "Greg Schecher", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Short term money, wants to have a cash out plan" },
  { id: 354, source: "Spreadsheet", spreadsheetRow: "R355", program: "Kinecta Federal Credit Union", lender: "Kinecta Federal Credit Union", type: "Senior", minLoan: "$750,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dillon.renn@kinecta.org", phone: "949-253-5338", recourse: "CASE BY CASE", contactPerson: "Dillon Renn", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "We will lend on all property types aside from gas stations, churches and assisted living. We offer a 15 year term and 30 year amortization on all of our loans. We have the fourth largest commercial real estate portfolio in the country among credit" },
  { id: 355, source: "Spreadsheet", spreadsheetRow: "R356", program: "KKR - development", lender: "KKR", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "paul.fine@kkr.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Paul Fine", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Typically start at $60mm+" },
  { id: 356, source: "Spreadsheet", spreadsheetRow: "R357", program: "KKR - large loans", lender: "KKR", type: "Senior", minLoan: "$100,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "paul.fine@kkr.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Paul Fine", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 357, source: "Spreadsheet", spreadsheetRow: "R358", program: "Korth Direct Mortgage", lender: "Korth Direct Mortgage", type: "Senior", minLoan: "$2,000,000", maxLoan: "$40,000,000", maxLtv: "70%", minDscr: "1", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "rjones@kdmfinancial.com", phone: "786-999-2315", recourse: "NON RECOURSE", contactPerson: "Ralph Jones", loanTerms: "5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Flexible prepay, lend off appraisal, no tax returns required, 30 year am or I/O. Can use any property-related income to count toward 1.0 DSCR. Foreign nationals: 65% LTV, show they've been doing business in US for 12 months. Need i10." },
  { id: 358, source: "Spreadsheet", spreadsheetRow: "R359", program: "Ladder Capital - Bridge", lender: "Ladder Capital", type: "Senior", minLoan: "$10,000,000", maxLoan: "$275,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "walker.brown@laddercapital.com", phone: "212-715-3158", recourse: "NON RECOURSE", contactPerson: "Walker Brown", loanTerms: "2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 359, source: "Spreadsheet", spreadsheetRow: "R360", program: "Ladder Capital - CMBS", lender: "Ladder Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$450,000,000", maxLtv: "75%", minDscr: "1.25", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "walker.brown@laddercapital.com", phone: "212-715-3158", recourse: "NON RECOURSE", contactPerson: "Walker Brown", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 360, source: "Spreadsheet", spreadsheetRow: "R361", program: "Lancewood Capital", lender: "Lancewood Capital", type: "Senior", minLoan: "$700,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant"], status: "Active", email: "mschatzle@lancewoodcapital.com", phone: "561-222-4339", recourse: "CASE BY CASE", contactPerson: "Matthew Schatzle", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 361, source: "Spreadsheet", spreadsheetRow: "R362", program: "Lantzman Lending", lender: "Lantzman Lending", type: "Senior", minLoan: "$50,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "NV", "TX"], assets: ["Apartments"], status: "Active", email: "jason@lantzmanlending.com", phone: "858-720-0229", recourse: "CASE BY CASE", contactPerson: "Jason Weber", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 362, source: "Spreadsheet", spreadsheetRow: "R363", program: "LBBW - development", lender: "LBBW", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "lisa.komm@lbbwus.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 363, source: "Spreadsheet", spreadsheetRow: "R364", program: "Lee Bank", lender: "Lee Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["MA"], assets: ["Apartments"], status: "Active", email: "dharrington@leebank.com", phone: "413-212-9513", recourse: "CASE BY CASE", contactPerson: "David Harrington", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Berkshire County MA Focused." },
  { id: 364, source: "Spreadsheet", spreadsheetRow: "R365", program: "LendingOne - Bridge", lender: "LendingOne", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "PA", "RI", "SC", "TN", "TX", "VA", "WA", "WI", "WV", "WY"], assets: ["Apartments"], status: "Active", email: "mfaiella@lendingone.com", phone: "215.933.1014", recourse: "CASE BY CASE", contactPerson: "Michael Faiella", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition"], sponsorStates: [], notes: "A/B Markets with good population density. rates are more \"soft\"money, then hard. 2 to 3 units MF." },
  { id: 365, source: "Spreadsheet", spreadsheetRow: "R366", program: "LendingOne - New Construction", lender: "LendingOne", type: "Senior", minLoan: "$250,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "SFR Portfolio"], status: "Active", email: "mboggiano@lendingone.com", phone: "(561) 453-0735", recourse: "CASE BY CASE", contactPerson: "Michael Boggiano", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 366, source: "Spreadsheet", spreadsheetRow: "R367", program: "LGE Community CU", lender: "LGE Community Credit Union", type: "Senior", minLoan: "$100,000", maxLoan: "$10,000,000", maxLtv: "85%", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jasonal@lgeccu.org", phone: "470-316-0268", recourse: "CASE BY CASE", contactPerson: "Jason Albritton", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Geographic footprint is metro Atlanta. They can do resi portfolio refis" },
  { id: 367, source: "Spreadsheet", spreadsheetRow: "R368", program: "Liberty SBF - owner operator", lender: "Liberty SBF", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "zosmani@libertysbf.com", phone: "(619) 957-9708", recourse: "CASE BY CASE", contactPerson: "Zoheb Osmani", loanTerms: "", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "30%<50% conventional (75% LTV), >50% SBA 504 (90% LTV)" },
  { id: 368, source: "Spreadsheet", spreadsheetRow: "R369", program: "LiftForward", lender: "LiftForward", type: "Mezzanine", minLoan: "$100,000", maxLoan: "$4,000,000", maxLtv: "100%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "aaron@myliftloans.com", phone: "908-202-0830", recourse: "CASE BY CASE", contactPerson: "Aaron Fausel", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 369, source: "Spreadsheet", spreadsheetRow: "R370", program: "Lightstone - Core/Value Add", lender: "Lightstone", type: "Senior", minLoan: "$3,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "erozovsky@lightstonegroup.com, jfhima@lightstonegroup.com", phone: "212-324-0231", recourse: "CASE BY CASE", contactPerson: "Eugene Rozovsky", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 370, source: "Spreadsheet", spreadsheetRow: "R371", program: "Lightstone - Opportunistic", lender: "Lightstone", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "erozovsky@lightstonegroup.com, jfhima@lightstonegroup.com", phone: "212-324-0231", recourse: "CASE BY CASE", contactPerson: "Eugene Rozovsky", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 371, source: "Spreadsheet", spreadsheetRow: "R372", program: "Lima One Capital", lender: "Lima One Capital", type: "Senior", minLoan: "$250,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WV", "WY"], assets: ["Apartments"], status: "Active", email: "broker@limaonecapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 372, source: "Spreadsheet", spreadsheetRow: "R373", program: "Live Oak Bank - construction", lender: "Live Oak Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["GA", "SC", "NC", "VA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "angus.mcdonald@liveoak.bank", phone: "910-795-0055 or cell 9195997952", recourse: "CASE BY CASE", contactPerson: "Angus McDonald", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Construction lending for the Southeast" },
  { id: 373, source: "Spreadsheet", spreadsheetRow: "R374", program: "M&T Bank - stabilized", lender: "M&T Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["NY", "NJ", "PA", "CT", "MD", "VA", "DC"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "jpizzutelli@mtb.com", phone: "212-350-2625", recourse: "CASE BY CASE", contactPerson: "Joe Pizzutelli", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 374, source: "Spreadsheet", spreadsheetRow: "R375", program: "Mabrey Bank - Oklahoma properties", lender: "Mabrey Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["OK"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "maholt@mabreybank.com", phone: "405-550-7881", recourse: "CASE BY CASE", contactPerson: "Michael Aholt", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 375, source: "Spreadsheet", spreadsheetRow: "R376", program: "Mabrey Bank - Oklahoma sponsors", lender: "Mabrey Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["OK", "AR", "KS", "MO"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "maholt@mabreybank.com", phone: "405-550-7881", recourse: "CASE BY CASE", contactPerson: "Michael Aholt", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["OK"], notes: "" },
  { id: 376, source: "Spreadsheet", spreadsheetRow: "R377", program: "Mack Real Estate Group - development", lender: "Mack Real Estate Group", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "psotoloff@mackregroup.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Peter Sotoloff", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 377, source: "Spreadsheet", spreadsheetRow: "R378", program: "Man Group", lender: "Man Group", type: "Senior", minLoan: "$20,000,000", maxLoan: "$90,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "SFR Portfolio", "Mobile Home Park", "Co-living", "Retail-Multi Tenant"], status: "Active", email: "daniel.graca@man.com", phone: "212-649-6704", recourse: "NON RECOURSE", contactPerson: "Dan Graca", loanTerms: "2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 378, source: "Spreadsheet", spreadsheetRow: "R379", program: "CIBM Bank", lender: "CIBM Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["IN", "IL", "WI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "william.cosgrove@cibmbank.com", phone: "", recourse: "FULL", contactPerson: "William Cosgrove", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "US Treasury + 300bps" },
  { id: 379, source: "Spreadsheet", spreadsheetRow: "R380", program: "Maxim - National", lender: "Maxim Capital Group", type: "Senior", minLoan: "$1,500,000", maxLoan: "$30,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Other"], status: "Active", email: "aglick@maximcapitalgroup.com", phone: "2123272555", recourse: "CASE BY CASE", contactPerson: "Adam Glick", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 380, source: "Spreadsheet", spreadsheetRow: "R381", program: "Maxim - NY Tri-state", lender: "Maxim Capital Group", type: "Senior", minLoan: "$500,000", maxLoan: "$30,000,000", maxLtv: "65%", minDscr: "N/A", states: ["NY", "CT", "NJ"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Other"], status: "Active", email: "aglick@maximcapitalgroup.com", phone: "2123272555", recourse: "CASE BY CASE", contactPerson: "Adam Glick", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 381, source: "Spreadsheet", spreadsheetRow: "R382", program: "Meadows Bank - Reno NV OO", lender: "Meadows Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "dwilliams@meadowsbank.com", phone: "775-343-7101", recourse: "CASE BY CASE", contactPerson: "Denny Williams", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Pausing on investor loans for the rest of 2018 (as of 9/21/18)" },
  { id: 382, source: "Spreadsheet", spreadsheetRow: "R383", program: "Melody Capital Partners", lender: "Melody Capital Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Tim reached out 11/10/17" },
  { id: 383, source: "Spreadsheet", spreadsheetRow: "R384", program: "Met Life Real Estate - Senior", lender: "MetLife Real Estate", type: "Senior", minLoan: "$20,000,000", maxLoan: "$500,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Medical Office", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "patrick.lim@metlife.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Patrick Lim", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Metlife also has a debt fund. it is“bridge-lite” so they need a minimum 5-6% debt yield going in and they can do up to 80% ltv with future fundings for leasing capital, capex, interest reserve, etc" },
  { id: 384, source: "Spreadsheet", spreadsheetRow: "R385", program: "MidCap Financial - Bridge - Healthcare", lender: "MidCap Financial", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Assisted Living", "Hospital/Health Care"], status: "Active", email: "zbritton@midcapfinancial.com", phone: "240-383-3127", recourse: "CASE BY CASE", contactPerson: "Zach Britton", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Healthcare, skilled nursing, medical office" },
  { id: 385, source: "Spreadsheet", spreadsheetRow: "R386", program: "MidCap Financial - Bridge - Multifamily/Commercial", lender: "MidCap Financial", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "zbritton@midcapfinancial.com", phone: "240-383-3127", recourse: "CASE BY CASE", contactPerson: "Zach Britton", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Zach will hand off deals to the right team at MidCap (organized by asset type)" },
  { id: 386, source: "Spreadsheet", spreadsheetRow: "R387", program: "Money360 - commercial", lender: "Money360", type: "Senior", minLoan: "$3,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "tombelsanti@money360.com", phone: "949.528-6190", recourse: "CASE BY CASE", contactPerson: "Tom Belsanti", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 387, source: "Spreadsheet", spreadsheetRow: "R388", program: "Money360 - multifamily", lender: "Money360", type: "Senior", minLoan: "$3,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park"], status: "Active", email: "tombelsanti@money360.com", phone: "949.528-6190", recourse: "CASE BY CASE", contactPerson: "Tom Belsanti", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 388, source: "Spreadsheet", spreadsheetRow: "R389", program: "Monroe Bank & Trust", lender: "Monroe Bank & Trust", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["MI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "darren.lalonde@monroe.bank", phone: "734-737-0714", recourse: "CASE BY CASE", contactPerson: "Darren LaLonde", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["MI"], notes: "Prefer SE Michigan" },
  { id: 389, source: "Spreadsheet", spreadsheetRow: "R390", program: "Monroe Federal", lender: "Monroe Federal", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["OH"], assets: ["Apartments", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "tonyg@monroefederal.com", phone: "", recourse: "FULL", contactPerson: "Tony Green", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "Local Bank (Dayton Ohio + 100 mile radius) Construction if in backyard" },
  { id: 390, source: "Spreadsheet", spreadsheetRow: "R391", program: "Morgan Stanley", lender: "Morgan Stanley", type: "Senior", minLoan: "$3,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "SFR Portfolio", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "Thomas.Lawlor@morganstanley.com", phone: "310 788-2113", recourse: "NON RECOURSE", contactPerson: "Tom Lawlor", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 391, source: "Spreadsheet", spreadsheetRow: "R392", program: "Mountain America Credit Union", lender: "Mountain America Credit Union", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["UT"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "dafisher@macu.com", phone: "801-325-1911", recourse: "CASE BY CASE", contactPerson: "Dale Fisher", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Fixed/Variable rates, 75% LTV Max, NO PPP" },
  { id: 392, source: "Spreadsheet", spreadsheetRow: "R393", program: "MutualBank", lender: "MutualBank", type: "Senior", minLoan: "$50,000", maxLoan: "$10,000,000", maxLtv: "85%", minDscr: "N/A", states: ["IN"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "bryan.olund@bankwithmutual.com", phone: "574-273-7608", recourse: "FULL", contactPerson: "Bryan Olund", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IN"], notes: "Indiana, Southern Michigan, Western Ohio" },
  { id: 393, source: "Spreadsheet", spreadsheetRow: "R394", program: "National Life Group/Sentinel Asset Management", lender: "National Life Group/Sentinel Asset Management", type: "Senior", minLoan: "$6,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Sentinel is very fleXible on the larger deals. They do all product types and can offer 30 yr am. 10-yr fiXed. They sometimes offer I/O." },
  { id: 394, source: "Spreadsheet", spreadsheetRow: "R395", program: "National Life of Vermont - via Walker & Dunlop", lender: "National Life of Vermont", type: "Senior", minLoan: "$7,500,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dsemmer@walkerdunlop.com", phone: "310-414-6347", recourse: "CASE BY CASE", contactPerson: "Dave Semmer", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 395, source: "Spreadsheet", spreadsheetRow: "R396", program: "Natixis - CMBS", lender: "Natixis", type: "Senior", minLoan: "$10,000,000", maxLoan: "", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "Anya.Nabiev@natixis.com", phone: "212-891-5759", recourse: "NON RECOURSE", contactPerson: "Anya Nabiev", loanTerms: "10 year, 2 year, 3 year, 4 year, 5 year, 6 year, 7 year, 8 year, 9 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will do fixed and foating rate, spread on fixed 350 to 550 and floating 150 to 350 bp" },
  { id: 396, source: "Spreadsheet", spreadsheetRow: "R397", program: "Natixis - development", lender: "Natixis", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "michael.magner@natixis.com,Anya.Nabiev@natixis.com", phone: "212-891-5759", recourse: "CASE BY CASE", contactPerson: "Michael Magner", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 397, source: "Spreadsheet", spreadsheetRow: "R398", program: "Natixis - Portfolio", lender: "Natixis", type: "Senior", minLoan: "$100,000,000", maxLoan: "", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "Anya.Nabiev@natixis.com", phone: "212-891-5759", recourse: "CASE BY CASE", contactPerson: "Anya Nabiev", loanTerms: "2 year, 3 year, 4 year, 5 year, 6 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 398, source: "Spreadsheet", spreadsheetRow: "R399", program: "NBT Bank", lender: "NBT Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["MA"], assets: ["Apartments"], status: "Active", email: "karen.boyer@nbtbank.com", phone: "413-664-6521", recourse: "CASE BY CASE", contactPerson: "Karen boyer", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 399, source: "Spreadsheet", spreadsheetRow: "R400", program: "New Era Capital - Bridge", lender: "New Era Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "dan@neweracapitalinc.com", phone: "716.998.1859", recourse: "NON RECOURSE", contactPerson: "Dan Vecchies", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 400, source: "Spreadsheet", spreadsheetRow: "R401", program: "New Era Capital - Build to Suit", lender: "New Era Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dan@neweracapitalinc.com", phone: "716.998.1859", recourse: "NON RECOURSE", contactPerson: "Dan Vecchies", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 401, source: "Spreadsheet", spreadsheetRow: "R402", program: "New Gables Capital", lender: "New Gables Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "Steven@NewGablesCapital.com", phone: "646-880-8590", recourse: "CASE BY CASE", contactPerson: "Steven Fischler", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 402, source: "Spreadsheet", spreadsheetRow: "R403", program: "New York Life - large loans", lender: "New York Life", type: "Senior", minLoan: "$100,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 403, source: "Spreadsheet", spreadsheetRow: "R404", program: "Newport Commercial Capital", lender: "Newport Commercial Capital", type: "Senior", minLoan: "$50,000", maxLoan: "$5,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AZ", "CA", "CO", "NV", "OR", "UT", "WA"], assets: ["Apartments", "Senior Housing", "Student Housing", "SFR Portfolio", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "info@newportcommercialcapital.com", phone: "714-318-0519", recourse: "CASE BY CASE", contactPerson: "Mike Blumenkranz", loanTerms: "1 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["CA"], notes: "9.5%-15% with 2 pts" },
  { id: 404, source: "Spreadsheet", spreadsheetRow: "R405", program: "NexBank - nnn", lender: "NexBank", type: "Senior", minLoan: "$2,500,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jeff.kocher@nexbank.com", phone: "972-934-4722", recourse: "CASE BY CASE", contactPerson: "Jeff Kocher", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Minimum 10 Year Lease Term Remaining (Prefer 15+ years remaining) Tier I and II Major MSAs (Excludes tertiary markets)" },
  { id: 405, source: "Spreadsheet", spreadsheetRow: "R406", program: "North Avenue Capital", lender: "North Avenue Capital", type: "Senior", minLoan: "$1,500,000", maxLoan: "$20,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Assisted Living", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "bmathewson@northavenue.com", phone: "402-304-9142", recourse: "FULL", contactPerson: "Ben Mathewson", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Secondary & Tertiary US Locations, Borrower must have 10%-20% cash into the deal at closing. 10% for existing properties. 20% for new properties." },
  { id: 406, source: "Spreadsheet", spreadsheetRow: "R407", program: "Nuvision Federal Credit Union", lender: "Nuvision Federal Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$7,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "OR", "WA", "NV", "NM", "TX", "AZ", "UT", "ID", "WY", "MT", "CO"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dnguyen1@nuvisionfederal.org", phone: "714-465-6140", recourse: "CASE BY CASE", contactPerson: "Dominic Nguyen", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["CA"], notes: "" },
  { id: 407, source: "Spreadsheet", spreadsheetRow: "R408", program: "Och Ziff", lender: "Oz Management", type: "Senior", minLoan: "$20,000,000", maxLoan: "$60,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "mark.schwartz@ozm.com", phone: "646-562-4563", recourse: "CASE BY CASE", contactPerson: "Mark Schwartz", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "High leverage development/redevelopment. Pricing in high single digits." },
  { id: 408, source: "Spreadsheet", spreadsheetRow: "R409", program: "Oklahoma Fidelity Bank", lender: "Oklahoma Fidelity Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$3,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "cfranks@fidelitybank.com", phone: "405-507-3123", recourse: "CASE BY CASE", contactPerson: "Clayton Franks", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 409, source: "Spreadsheet", spreadsheetRow: "R410", program: "One AZ Credit Union", lender: "One AZ Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["AZ"], assets: ["Apartments", "Senior Housing", "Assisted Living", "SFR Portfolio", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Land", "Self-storage", "Religious", "Other"], status: "Active", email: "SGillies@oneazcu.com", phone: "928-777-6051", recourse: "CASE BY CASE", contactPerson: "Suzanne Gillies", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["AZ"], notes: "Spread dependent on asset, LTV/LTC dependent on OOC/Investor, Does SBA Loans, ground up construction" },
  { id: 410, source: "Spreadsheet", spreadsheetRow: "R411", program: "Opus Bank", lender: "Opus Bank", type: "Senior", minLoan: "$2,500,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "WA", "AZ", "OR"], assets: ["Apartments", "Senior Housing", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "rappeldorn@opusbank.com", phone: "949.251.8145", recourse: "CASE BY CASE", contactPerson: "Randy Appledorn", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Randy focuses on floating rate bridge loans for non-stabilized and value-add projects" },
  { id: 411, source: "Spreadsheet", spreadsheetRow: "R412", program: "Oritani Bank", lender: "Oritani Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["PA", "CT", "DE", "NJ"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "kbreitenstein@oritani.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Kurt Breitenstein", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 412, source: "Spreadsheet", spreadsheetRow: "R413", program: "Osprey Capital - senior bridge", lender: "Osprey Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["FL", "GA", "SC", "NC", "AL", "TN", "VA", "WV", "MS", "KY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "gk@ospreycre.com, blee@ospreycre.com", phone: "813-833-4697", recourse: "CASE BY CASE", contactPerson: "Gus Katsadouros", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 413, source: "Spreadsheet", spreadsheetRow: "R414", program: "Pacific Enterprise Bank", lender: "Pacific Enterprise Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "thalbmaier@pacificenterprisebank.com", phone: "949-623-7585", recourse: "CASE BY CASE", contactPerson: "Tobias Halbmaier", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 414, source: "Spreadsheet", spreadsheetRow: "R415", program: "Pacific Mercantile Bank", lender: "Pacific Mercantile Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA"], assets: ["Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "Ross.Macdonald@pmbank.com", phone: "949-467-2229", recourse: "FULL", contactPerson: "Ross Macdonald", loanTerms: "3 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["CA"], notes: "\"Shine\" on owner-occupied" },
  { id: 415, source: "Spreadsheet", spreadsheetRow: "R416", program: "Pacific National Bank - CRE and C&I Lending", lender: "Pacific National Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "85%", minDscr: "N/A", states: ["FL", "SC", "NC", "GA", "TX", "MA", "NY", "NJ", "VA", "MD", "DE"], assets: ["Apartments", "Condos", "Senior Housing", "Assisted Living", "SFR Portfolio", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "osegal@pnb.com", phone: "305-753-3255", recourse: "CASE BY CASE", contactPerson: "Oscar Segal", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Foreign Nationals on Case-By-Case Basis; Can do construction loans in South FL only, if out of FL then loan needs to be $1M+" },
  { id: 416, source: "Spreadsheet", spreadsheetRow: "R417", program: "Pacific National Bank - South Florida", lender: "Pacific National Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Assisted Living", "SFR Portfolio", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "osegal@pnb.com", phone: "305-753-3255", recourse: "CASE BY CASE", contactPerson: "Oscar Segal", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Foreign Nationals on Case-By-Case Basis; Can do construction loans in South FL only, if out of FL then loan needs to be $1M+" },
  { id: 417, source: "Spreadsheet", spreadsheetRow: "R418", program: "Pacific Premier Bank - 7a", lender: "Pacific Premier Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "", phone: "(951) 533-9422", recourse: "CASE BY CASE", contactPerson: "Matthew Murphy", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "7(a) only Requires at least 1 yr tax returns from borrowing entity - not conversions" },
  { id: 418, source: "Spreadsheet", spreadsheetRow: "R419", program: "Paramount Real Estate Group - large loans", lender: "Paramount Real Estate Group", type: "Senior", minLoan: "$100,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mmurphy@ppbi.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 419, source: "Spreadsheet", spreadsheetRow: "R420", program: "Paramount Specialty Finance - NNN Development", lender: "Paramount Specialty Finance", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "valdez@paramountfin.com, Lstone@paramountfin.com", phone: "512-656-5179 (c) 512-717-8571 (o)", recourse: "CASE BY CASE", contactPerson: "Matt Valdez, Luke Stone", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "100% Financing 10-12% Build To Suit / Sale Leaseback / Blend & Extend Retail / Industrial / Medical / Office" },
  { id: 420, source: "Spreadsheet", spreadsheetRow: "R421", program: "Park National Bank", lender: "Park National Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["OH"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "jhyson@parknationalbank.com", phone: "513-607-6145", recourse: "FULL", contactPerson: "Jay Hyson", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 421, source: "Spreadsheet", spreadsheetRow: "R422", program: "Parke Bank", lender: "Parke Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$19,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NJ", "PA", "DE", "NY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "wmohnacs@parkebank.com", phone: "856-858-0825 x612", recourse: "CASE BY CASE", contactPerson: "William Mohnacs", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: ["NJ", "PA", "DE", "NY"], notes: "" },
  { id: 422, source: "Spreadsheet", spreadsheetRow: "R423", program: "Parke Bank - construction", lender: "Parke Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$19,000,000", maxLtv: "65%", minDscr: "N/A", states: ["NJ", "PA", "DE", "NY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "wmohnacs@parkebank.com", phone: "856-858-0825 x612", recourse: "CASE BY CASE", contactPerson: "William Mohnacs", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: ["NJ", "PA", "DE", "NY"], notes: "" },
  { id: 423, source: "Spreadsheet", spreadsheetRow: "R424", program: "Parkview Financial", lender: "Parkview Financial", type: "Senior", minLoan: "$5,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "larry@parkviewloan.com", phone: "619-672-9289", recourse: "CASE BY CASE", contactPerson: "Larry Perry", loanTerms: "3 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "8.99%+, Min $10MM in SC" },
  { id: 424, source: "Spreadsheet", spreadsheetRow: "R425", program: "Pearlmark - mezz", lender: "Pearlmark", type: "Mezzanine", minLoan: "$4,000,000", maxLoan: "$40,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "bswackhamer@pearlmark.com, mwitt@pearlmark.com, rlitvin@pearlmark.com, dlyons@pearlmark.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Added from Commercial Mortgage Alert ad, no direct contact yet" },
  { id: 425, source: "Spreadsheet", spreadsheetRow: "R426", program: "Pembrook - mezz", lender: "Pembrook Group", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$20,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "tbaydala@pembrookgroup.com", phone: "212-906-8688", recourse: "NON RECOURSE", contactPerson: "Terry Baydala", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Loves affordable housing" },
  { id: 426, source: "Spreadsheet", spreadsheetRow: "R427", program: "Pembrook - senior", lender: "Pembrook Group", type: "Senior", minLoan: "$10,000,000", maxLoan: "$50,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "tbaydala@pembrookgroup.com", phone: "212-906-8688", recourse: "NON RECOURSE", contactPerson: "Terry Baydala", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Can stretch up to 85%, pricing at least L+750" },
  { id: 427, source: "Spreadsheet", spreadsheetRow: "R428", program: "Pender Capital - Small Balance Bridge Program", lender: "Pender Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Hospital/Health Care"], status: "Active", email: "Jessica@pendercapital.com", phone: "424.363.0083", recourse: "CASE BY CASE", contactPerson: "Jessica Lyons", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 428, source: "Spreadsheet", spreadsheetRow: "R429", program: "People's United Bank SBA or general inquiry", lender: "People's United Financial", type: "Senior", minLoan: "$300,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "SFR Portfolio", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "sandeep@sanghavi@peoples.com", phone: "516-273-5926", recourse: "CASE BY CASE", contactPerson: "Sandeep Shanghavi", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 429, source: "Spreadsheet", spreadsheetRow: "R430", program: "People's United Financial - development", lender: "People's United Financial", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "kevin.kelly@peoples.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Kevin Kelly", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Wont pay referal fees" },
  { id: 430, source: "Spreadsheet", spreadsheetRow: "R431", program: "PGIM - balance sheet", lender: "PGIM", type: "Senior", minLoan: "$20,000,000", maxLoan: "$200,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Hotel/Hospitality", "Other"], status: "Active", email: "corley.audorff@pgim.com", phone: "470-606-1876", recourse: "CASE BY CASE", contactPerson: "Corley Audorff", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Balance sheet pricing between 4.25% and 5% (as of August 2018)" },
  { id: 431, source: "Spreadsheet", spreadsheetRow: "R432", program: "PGIM - multifamily", lender: "PGIM", type: "Senior", minLoan: "$1,000,000", maxLoan: "$200,000,000", maxLtv: "87%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living"], status: "Active", email: "corley.audorff@pgim.com", phone: "470-606-1876", recourse: "CASE BY CASE", contactPerson: "Corley Audorff", loanTerms: "10 year, 12 year, 15 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Also do Fannie/Freddie/HUD $1M minimum, and bridge to each" },
  { id: 432, source: "Spreadsheet", spreadsheetRow: "R433", program: "Pinnacle Financial Partners - Balance Sheet", lender: "Pinnacle Financial Partners", type: "Senior", minLoan: "$800,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["VA", "NC", "SC", "TN"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "michael.laurencelle@pnfp.com", phone: "Office: (972) 755-6474 Cell: (248) 561-8432", recourse: "CASE BY CASE", contactPerson: "Michael Laurencelle", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 433, source: "Spreadsheet", spreadsheetRow: "R434", program: "Pinnacle Financial Partners - Freddie SBL", lender: "Pinnacle Financial Partners", type: "Senior", minLoan: "$1,000,000", maxLoan: "$7,500,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing"], status: "Active", email: "michael.laurencelle@pnfp.com", phone: "Office: (972) 755-6474 Cell: (248) 561-8432", recourse: "NON RECOURSE", contactPerson: "Michael Laurencelle", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 434, source: "Spreadsheet", spreadsheetRow: "R435", program: "Pinnacle Financial Partners - SBA", lender: "Pinnacle Financial Partners", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["VA", "NC", "SC", "TN"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "michael.laurencelle@pnfp.com", phone: "Office: (972) 755-6474 Cell: (248) 561-8432", recourse: "FULL", contactPerson: "Michael Laurencelle", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 435, source: "Spreadsheet", spreadsheetRow: "R436", program: "PlainsCapital Bank", lender: "PlainsCapital Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$13,000,000", maxLtv: "75%", minDscr: "N/A", states: ["TX"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "will.shellenberger@plainscapital.com", phone: "469-941-1261", recourse: "FULL", contactPerson: "Will Shellenberger", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["TX"], notes: "" },
  { id: 436, source: "Spreadsheet", spreadsheetRow: "R437", program: "Planters First Bank", lender: "Planters First Bank", type: "Senior", minLoan: "$50,000", maxLoan: "$6,000,000", maxLtv: "85%", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "jlangham@bankpfb.com", phone: "478-314-8017", recourse: "CASE BY CASE", contactPerson: "Jamie Langham", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 437, source: "Spreadsheet", spreadsheetRow: "R438", program: "PMC Trust - SBA 7(a)", lender: "PMC Commercial Trust", type: "Senior", minLoan: "$300,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "l.ivy@pmctrust.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Laurie Ivy", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 438, source: "Spreadsheet", spreadsheetRow: "R439", program: "Principal RE Investors", lender: "Principal RE Investors", type: "Senior", minLoan: "$10,000,000", maxLoan: "$40,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dirks.rob@principal.com", phone: "515-247-5100", recourse: "CASE BY CASE", contactPerson: "Rob Dirks", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 439, source: "Spreadsheet", spreadsheetRow: "R440", program: "Principal RE Investors - construction", lender: "Principal RE Investors", type: "Senior", minLoan: "$15,000,000", maxLoan: "$40,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "dirks.rob@principal.com", phone: "515-247-5100", recourse: "CASE BY CASE", contactPerson: "Rob Dirks", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 440, source: "Spreadsheet", spreadsheetRow: "R441", program: "Private Bank of Buckhead - investor", lender: "Private Bank of Buckhead", type: "Senior", minLoan: "$250,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office"], status: "Active", email: "aaronbinion@privatebankofbuckhead.com", phone: "404-264-7987", recourse: "CASE BY CASE", contactPerson: "Aaron Binion", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 441, source: "Spreadsheet", spreadsheetRow: "R442", program: "Private Bank of Buckhead - OO", lender: "Private Bank of Buckhead", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "aaronbinion@privatebankofbuckhead.com", phone: "404-264-7987", recourse: "CASE BY CASE", contactPerson: "Aaron Binion", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 442, source: "Spreadsheet", spreadsheetRow: "R443", program: "Provident Bank", lender: "Provident Bank", type: "Senior", minLoan: "$200,000", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["CA"], assets: ["Apartments"], status: "Active", email: "lvirzibiber@myprovident.com", phone: "714-681-0001", recourse: "CASE BY CASE", contactPerson: "LeeAnn Virzi Biber", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will pay 1% up to $20,000" },
  { id: 443, source: "Spreadsheet", spreadsheetRow: "R444", program: "Provident Bank (NJ)", lender: "Provident Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$5,000,000", maxLtv: "75%", minDscr: "N/A", states: ["NJ"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "brown.small@provident.bank", phone: "7327265462", recourse: "CASE BY CASE", contactPerson: "Brown Small", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["NJ", "PA", "NY"], notes: "" },
  { id: 444, source: "Spreadsheet", spreadsheetRow: "R445", program: "PSG Lending", lender: "PSG Lending", type: "Senior", minLoan: "$125,000", maxLoan: "$9,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Land", "Self-storage", "Other"], status: "Active", email: "cameron@psglending.com", phone: "(443) 386-6044", recourse: "CASE BY CASE", contactPerson: "Cameron Lawson", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 445, source: "Spreadsheet", spreadsheetRow: "R446", program: "Quorum Federal Credit Union", lender: "Quorum Federal Credit Union", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Land", "Self-storage", "Other"], status: "Active", email: "tyson.blackburn@quorumfcu.org", phone: "860-997-8847", recourse: "FULL", contactPerson: "Tyson Blackburn", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 446, source: "Spreadsheet", spreadsheetRow: "R447", program: "Quorum Federal Credit Union - construction", lender: "Quorum Federal Credit Union", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Land", "Self-storage", "Other"], status: "Active", email: "tyson.blackburn@quorumfcu.org", phone: "860-997-8847", recourse: "FULL", contactPerson: "Tyson Blackburn", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 447, source: "Spreadsheet", spreadsheetRow: "R448", program: "Rabo Bank - hotel, retail, special purpose", lender: "Rabobank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$25,000,000", maxLtv: "65%", minDscr: "N/A", states: ["CA"], assets: ["Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "steve.stearman@rabobank.com", phone: "760-836-1224", recourse: "CASE BY CASE", contactPerson: "Steve Stearman", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Hotels must be in a destination location such as San Diego, Palm Springs, Monterey, ect and must be flagged." },
  { id: 448, source: "Spreadsheet", spreadsheetRow: "R449", program: "Rabo Bank - multi, office, industrial", lender: "Rabobank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial"], status: "Active", email: "steve.stearman@rabobank.com", phone: "760-836-1224", recourse: "CASE BY CASE", contactPerson: "Steve Stearman", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Swap pricing available, usually about 10-15 bp less than conventional." },
  { id: 449, source: "Spreadsheet", spreadsheetRow: "R450", program: "RCN Capital - Buy to Rent Product", lender: "RCN Capital", type: "Senior", minLoan: "$50,000", maxLoan: "$2,500,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos"], status: "Active", email: "kdavis@rcncapital.com", phone: "860-432-4896", recourse: "CASE BY CASE", contactPerson: "Kimberly Davis", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 450, source: "Spreadsheet", spreadsheetRow: "R451", program: "RCN Capital - Long Term Rental Program", lender: "RCN Capital", type: "Senior", minLoan: "$50,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "0.7", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Condos", "SFR Portfolio"], status: "Active", email: "tpazler@rcncapital.com", phone: "860.432.4936", recourse: "CASE BY CASE", contactPerson: "Tom Pazler", loanTerms: "3 year, 30 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 451, source: "Spreadsheet", spreadsheetRow: "R452", program: "RCN Capital - Multifamily bridge", lender: "RCN Capital", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "0.7", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos"], status: "Active", email: "kdavis@rcncapital.com", phone: "860-432-4896", recourse: "CASE BY CASE", contactPerson: "Kimberly Davis", loanTerms: "1 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "up to 80% purchase price + 100% reno cost" },
  { id: 452, source: "Spreadsheet", spreadsheetRow: "R453", program: "Ready Capital - \"CMBS lookalike\"", lender: "Ready Capital", type: "Senior", minLoan: "$750,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Student Housing", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "kevin.leonard@readycapital.com", phone: "704-591-1477", recourse: "NON RECOURSE", contactPerson: "Kevin Leonard", loanTerms: "10 year, 12 year, 15 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 453, source: "Spreadsheet", spreadsheetRow: "R454", program: "Ready Capital - Agency", lender: "Ready Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$7,500,000", maxLtv: "80%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "kevin.leonard@readycapital.com", phone: "704-591-1477", recourse: "NON RECOURSE", contactPerson: "Kevin Leonard", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 454, source: "Spreadsheet", spreadsheetRow: "R455", program: "Ready Capital - Bridge", lender: "Ready Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "David.cohen@readycapital.com", phone: "(212) 301-1883", recourse: "NON RECOURSE", contactPerson: "David Cohen", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 455, source: "Spreadsheet", spreadsheetRow: "R456", program: "Realty Capital Finance - Bridge Loan", lender: "Realty Capital Finance", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "SFR Portfolio", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "skwadrat@realtycapitalfinance.com", phone: "(908) 923-0100 x 406", recourse: "CASE BY CASE", contactPerson: "Samuel Kwadrat", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 456, source: "Spreadsheet", spreadsheetRow: "R457", program: "Red Capital Group - small balance agency", lender: "Red Capital Group", type: "Senior", minLoan: "$1,000,000", maxLoan: "$7,500,000", maxLtv: "80%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "mpyoung@redcapitalgroup.com, mgmccreary@redcapitalgroup.com", phone: "302-593-7618", recourse: "CASE BY CASE", contactPerson: "Michael Young, Matthew McCreary", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 457, source: "Spreadsheet", spreadsheetRow: "R458", program: "Red Oak Capital", lender: "Red Oak Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$7,500,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "Megan@Redoakcapitalgroup.com", phone: "616-734-6099", recourse: "FULL", contactPerson: "Megan Green", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Top 200 MSA's" },
  { id: 458, source: "Spreadsheet", spreadsheetRow: "R459", program: "Red Star Mortgage - 30YR FIXED RATE COMMERCIAL", lender: "Red Star Mortgage", type: "Senior", minLoan: "$200,000", maxLoan: "$5,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "gpolao@redstarmortgage.com", phone: "610-578-0715", recourse: "FULL", contactPerson: "Gary Polao", loanTerms: "10 year, 30 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Major MSAs, no doc loans, 30 yr fixed available" },
  { id: 459, source: "Spreadsheet", spreadsheetRow: "R460", program: "Redwood Mortgage", lender: "Redwood Mortgage", type: "Senior", minLoan: "$200,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "barry@redwoodmortgage.com", phone: "818-294-7058", recourse: "CASE BY CASE", contactPerson: "Barry Judis", loanTerms: "1 year, 10 year, 2 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 460, source: "Spreadsheet", spreadsheetRow: "R461", program: "Related Group", lender: "Related Group", type: "Senior", minLoan: "$15,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "zachary.hoffman@related.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Zach Hoffman", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 461, source: "Spreadsheet", spreadsheetRow: "R462", program: "Renasant - SBA", lender: "Renasant Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["GA", "TN", "AL", "MS", "FL"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "skinard@thebrandbank.com", phone: "770-846-9588", recourse: "FULL", contactPerson: "Sherry Kinard", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "SBA 504 and 7a loans; heard they will pay a broker fee but forgot to ask" },
  { id: 462, source: "Spreadsheet", spreadsheetRow: "R463", program: "Renasant Bank", lender: "Renasant Bank", type: "Senior", minLoan: "$1,500,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["GA", "FL", "SC", "NC", "TN", "AL", "MS"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "scott.freese@renasant.com", phone: "404-931-9271", recourse: "CASE BY CASE", contactPerson: "Scott Freese", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["GA", "FL", "SC", "NC", "TN", "AL", "MS"], notes: "" },
  { id: 463, source: "Spreadsheet", spreadsheetRow: "R464", program: "Republic Bank", lender: "Republic Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["IL"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "rburzic@republicbank.com", phone: "630-207-3394", recourse: "CASE BY CASE", contactPerson: "Ray Burzic", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IL"], notes: "Want personal guarantees, rare to do just carve outs" },
  { id: 464, source: "Spreadsheet", spreadsheetRow: "R465", program: "Rialto - CMBS", lender: "Rialto", type: "Senior", minLoan: "$2,500,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "ben.silver@rialtocapital.com", phone: "212-826-3540", recourse: "NON RECOURSE", contactPerson: "Ben Silver", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 465, source: "Spreadsheet", spreadsheetRow: "R466", program: "Ridgewood Savings Bank", lender: "Ridgewood Savings Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "vpadilla@ridgewoodbank.com", phone: "718-240-4773", recourse: "CASE BY CASE", contactPerson: "Victor Padilla", loanTerms: "10 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 466, source: "Spreadsheet", spreadsheetRow: "R467", program: "Robins FCU", lender: "Robins FCU", type: "Senior", minLoan: "$500,000", maxLoan: "$12,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "aocain@robinsfcu.org", phone: "", recourse: "CASE BY CASE", contactPerson: "Amy O'Cain", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 467, source: "Spreadsheet", spreadsheetRow: "R468", program: "ROC Capital Holdings - bridge", lender: "ROC Capital Holdings", type: "Senior", minLoan: "$2,000,000", maxLoan: "$125,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AK", "AL", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "evan.hakimi@roccapital.com, ranajoy@roccapital.com", phone: "212.607.8377", recourse: "CASE BY CASE", contactPerson: "Evan Hakimi", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Nationwide bridge lender offering high LTV with higher rates and recourse" },
  { id: 468, source: "Spreadsheet", spreadsheetRow: "R469", program: "ROC Capital Holdings - build to suit", lender: "ROC Capital Holdings", type: "Senior", minLoan: "$2,000,000", maxLoan: "$125,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AK", "AL", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WY"], assets: ["Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "evan.hakimi@roccapital.com, ranajoy@roccapital.com", phone: "212.607.8377", recourse: "NON RECOURSE", contactPerson: "Evan Hakimi", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Up to 100% LTC on NNN, 9-11%. Min guarantor credit 640+." },
  { id: 469, source: "Spreadsheet", spreadsheetRow: "R470", program: "ROC Capital Holdings - SFRs", lender: "ROC Capital Holdings", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AK", "AL", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WY"], assets: ["SFR Portfolio"], status: "Active", email: "evan.hakimi@roccapital.com, ranajoy@roccapital.com", phone: "212.607.8377", recourse: "CASE BY CASE", contactPerson: "Evan Hakimi", loanTerms: "30 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Nationwide bridge lender offering high LTV with higher rates and recourse" },
  { id: 470, source: "Spreadsheet", spreadsheetRow: "R471", program: "ROC Capital Holdings - small balance bridge", lender: "ROC Capital Holdings", type: "Senior", minLoan: "$500,000", maxLoan: "$2,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AK", "AL", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WY"], assets: ["Apartments"], status: "Active", email: "evan.hakimi@roccapital.com, ranajoy@roccapital.com", phone: "212.607.8377", recourse: "CASE BY CASE", contactPerson: "Evan Hakimi", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Nationwide bridge lender offering high LTV with higher rates and recourse" },
  { id: 471, source: "Spreadsheet", spreadsheetRow: "R472", program: "S&T Bank", lender: "S&T Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$1,500,000", maxLtv: "80%", minDscr: "N/A", states: ["PA"], assets: ["Apartments", "Senior Housing", "Student Housing", "SFR Portfolio", "Office", "Light Industrial", "Retail-Multi Tenant", "Land", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "michelle.knupp@stbank.com", phone: "724-840-5578", recourse: "FULL", contactPerson: "Michelle Knupp", loanTerms: "5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["PA"], notes: "" },
  { id: 472, source: "Spreadsheet", spreadsheetRow: "R473", program: "Sabal Capital Partners - Bridge", lender: "Sabal", type: "Senior", minLoan: "$2,000,000", maxLoan: "$7,500,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "natalie.dumont@sabalcap.com", phone: "617-678-5636", recourse: "NON RECOURSE", contactPerson: "Natalie Dumont", loanTerms: "1 year, 2 year, 25 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "Freddlie SBL lender, bridge needs to fit with eventual SBL criteria.  Net worth > 100% per loan.  Liquidity > 9 months perm loan debt service" },
  { id: 473, source: "Spreadsheet", spreadsheetRow: "R474", program: "Sabal Capital Partners - Freddie SBL", lender: "Sabal", type: "Senior", minLoan: "$1,000,000", maxLoan: "$7,500,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "natalie.dumont@sabalcap.com", phone: "617-678-5636", recourse: "NON RECOURSE", contactPerson: "Natalie Dumont", loanTerms: "10 year, 12 year, 15 year, 30 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Freddlie SBL lender.  Net worth > 100% per loan.  Liquidity > 9 months perm loan debt service.  Min FICO 650." },
  { id: 474, source: "Spreadsheet", spreadsheetRow: "R475", program: "Sabal S-CRE (CMBS)", lender: "Sabal", type: "Senior", minLoan: "$2,000,000", maxLoan: "$25,000,000", maxLtv: "80%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "natalie.dumont@sabalcap.com", phone: "617-678-5636", recourse: "NON RECOURSE", contactPerson: "Natalie Dumont", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Priced off Swaps, 25 and 30 year am, may offer I/O for 1-3 years" },
  { id: 475, source: "Spreadsheet", spreadsheetRow: "R476", program: "Salin Bank", lender: "Salin Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "80%", minDscr: "N/A", states: ["IN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "m.lopez@salin.com", phone: "800-320-7536", recourse: "CASE BY CASE", contactPerson: "Moises Lopez", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IN"], notes: "" },
  { id: 476, source: "Spreadsheet", spreadsheetRow: "R477", program: "Saratoga National Bank & Trust", lender: "Arrow Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$20,000,000", maxLtv: "80%", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "john.wyatt@arrowbank.com", phone: "518-306-2732", recourse: "CASE BY CASE", contactPerson: "John Wyatt", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["NY"], notes: "Can go up to 90% LTV if there is supportive financing.  Prefer asset/sponsor to be located near Albany and to the north." },
  { id: 477, source: "Spreadsheet", spreadsheetRow: "R478", program: "SCE Federal Credit Union", lender: "SCE Federal Credit Union", type: "Senior", minLoan: "$300,000", maxLoan: "$5,500,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Assisted Living", "Co-living", "Office", "Medical Office", "Manufacturing", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage"], status: "Active", email: "roberth@scefcu.org", phone: "800.866.6474 x2247", recourse: "CASE BY CASE", contactPerson: "Robert Hernandez", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "10 Counties in Southern Cali and 4 counties in NV. Can also do SFR portfolios." },
  { id: 478, source: "Spreadsheet", spreadsheetRow: "R479", program: "Scottsdale Fund", lender: "Scottsdale Fund", type: "Senior", minLoan: "$150,000", maxLoan: "$750,000", maxLtv: "75%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "HI", "IA", "ID", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "ND", "NE", "NH", "NM", "NV", "OH", "OK", "OR", "PA", "RI", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "jeff@scottsdalefund.com, bruce@scottsdalefund.com", phone: "", recourse: "FULL", contactPerson: "Jeffrey Bleaman", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Two brothers, family money, make decisions fast" },
  { id: 479, source: "Spreadsheet", spreadsheetRow: "R480", program: "Seacoast Bank", lender: "Seacoast Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$12,000,000", maxLtv: "75%", minDscr: "N/A", states: ["FL"], assets: ["Apartments", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "Jorge.Alvarez@SeacoastBank.com", phone: "786-554-5749", recourse: "CASE BY CASE", contactPerson: "Jorge Alvarez", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Won't pay us directly without our agreement with the borrower, but will drop their pricing to Par on deals from us.  Currently focused on east coast" },
  { id: 480, source: "Spreadsheet", spreadsheetRow: "R481", program: "Select Bank", lender: "Select Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "85%", minDscr: "1.1", states: ["NC", "SC", "VA"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "louisc@selectbank.com", phone: "919.977.5870", recourse: "CASE BY CASE", contactPerson: "Louis Cipriani", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 481, source: "Spreadsheet", spreadsheetRow: "R482", program: "ServisFirst Bank - construction", lender: "ServisFirst Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$40,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "cdunn@servisfirstbank.com", phone: "678-504-2707", recourse: "FULL", contactPerson: "Cheryl Dunn", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 482, source: "Spreadsheet", spreadsheetRow: "R483", program: "ServisFirst Bank - perm", lender: "ServisFirst Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$40,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "cdunn@servisfirstbank.com", phone: "678-504-2707", recourse: "FULL", contactPerson: "Cheryl Dunn", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 483, source: "Spreadsheet", spreadsheetRow: "R484", program: "Sharestates", lender: "Sharestates", type: "Senior", minLoan: "$100,000", maxLoan: "$20,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "SFR Portfolio", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "sevans@sharestates.com", phone: "212-201-0750", recourse: "FULL", contactPerson: "Scott Evans", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "New to real estate" },
  { id: 484, source: "Spreadsheet", spreadsheetRow: "R485", program: "Signature Bank", lender: "Signature Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["NY", "NJ", "CT", "CA"], assets: ["Apartments", "Senior Housing", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "bmazzotta@signatureny.com", phone: "631-861-2748", recourse: "CASE BY CASE", contactPerson: "Brian Mazzotta", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "3.5% fixed for 5 years. Non-recourse on everything. No origination fees. 30 day close. 75 miles of manhattan only" },
  { id: 485, source: "Spreadsheet", spreadsheetRow: "R486", program: "Silver Point Capital", lender: "Silver Point Capital", type: "Senior", minLoan: "$10,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "gzaiman@silverpointcapital.com", phone: "203-542-4074", recourse: "CASE BY CASE", contactPerson: "Genna Zaiman", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "L+600-800" },
  { id: 486, source: "Spreadsheet", spreadsheetRow: "R487", program: "Silvergate Bank", lender: "Silvergate Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$24,000,000", maxLtv: "68%", minDscr: "N/A", states: ["CA", "NV", "AZ", "UT", "OR"], assets: ["Apartments", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "nganel@silvergatebank.com", phone: "858.362.3319", recourse: "CASE BY CASE", contactPerson: "Noam Ganel", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will pay up to 1%. Much better fit for value add deals." },
  { id: 487, source: "Spreadsheet", spreadsheetRow: "R488", program: "SL Green - large loans", lender: "SL Green", type: "Senior", minLoan: "$100,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "david.schonbraun@slgreen.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 488, source: "Spreadsheet", spreadsheetRow: "R489", program: "Small Town Bank", lender: "Small Town Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "ghobbs@smalltownbank.com", phone: "770.834.5111", recourse: "CASE BY CASE", contactPerson: "Galen Hobbs", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["GA"], notes: "Atlanta-area borrowers" },
  { id: 489, source: "Spreadsheet", spreadsheetRow: "R490", program: "SmartBiz", lender: "Smartbiz", type: "Senior", minLoan: "$500,000", maxLoan: "$5,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "doug.kilroy@smartbizloans.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Doug Kilroy", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 490, source: "Spreadsheet", spreadsheetRow: "R491", program: "Socotra Capital - CA & NV", lender: "Socotra Capital", type: "Senior", minLoan: "$50,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "NV"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "kerati@socotracapital.com", phone: "415-906-3306", recourse: "CASE BY CASE", contactPerson: "Kerati Apilakvanichakit", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 491, source: "Spreadsheet", spreadsheetRow: "R492", program: "Socotra Capital - outside CA/NV", lender: "Socotra Capital", type: "Senior", minLoan: "$100,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AZ", "WA", "OR", "AK", "DC", "CO", "ID", "UT", "HI", "NC", "MD", "GA"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "kerati@socotracapital.com", phone: "415-906-3306", recourse: "CASE BY CASE", contactPerson: "Kerati Apilakvanichakit", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 492, source: "Spreadsheet", spreadsheetRow: "R493", program: "Somerset Financial Group, Inc.", lender: "Somerset Financial Group, Inc.", type: "Senior", minLoan: "$250,000", maxLoan: "$5,000,000", maxLtv: "65%", minDscr: "N/A", states: ["NY", "NJ", "CT", "FL"], assets: ["Apartments", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jmorello.sfg@gmail.com", phone: "561-530-4917", recourse: "CASE BY CASE", contactPerson: "Joe Morello", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["NY", "NJ", "CT", "FL"], notes: "Pricing is typically 9-12%" },
  { id: 493, source: "Spreadsheet", spreadsheetRow: "R494", program: "Sound Community Bank", lender: "Sound Community Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Co-living"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 494, source: "Spreadsheet", spreadsheetRow: "R495", program: "South Central Bank", lender: "South Central Bank", type: "Senior", minLoan: "$100,000", maxLoan: "$15,000,000", maxLtv: "85%", minDscr: "N/A", states: ["KY", "OH", "TN", "WV", "IN"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "coby.adkins@southcentralbank.com", phone: "859-223-0170 ext. 4389", recourse: "CASE BY CASE", contactPerson: "Coby Adkins", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 495, source: "Spreadsheet", spreadsheetRow: "R496", program: "South End Capital Corporation", lender: "South End Capital Corporation", type: "Senior", minLoan: "$175,000", maxLoan: "$5,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AK", "AL", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "myron@southendcapital.com", phone: "617-334-7718", recourse: "FULL", contactPerson: "Myron Alford", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 496, source: "Spreadsheet", spreadsheetRow: "R497", program: "Southern Farm Bureau Life", lender: "Southern Farm Bureau Life", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Southern Farm underwrites very conservatively (different standards for different product types). They are currently offering spreads of 165/CMT for $2-$5mm, and 145/CMT for deals $5mm and up. They only look at multi-tenant deals. Sometimes they can get to 135/CMT. EXtremely competitive on rate." },
  { id: 497, source: "Spreadsheet", spreadsheetRow: "R498", program: "Southern First Bank - Acqusition & Refi Loan", lender: "Southern First Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$7,000,000", maxLtv: "80%", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Religious"], status: "Active", email: "ftroutman@southernfirst.com", phone: "404-550-9602", recourse: "CASE BY CASE", contactPerson: "Fielding Troutman", loanTerms: "7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Atlanta Lender, but has branches in SC" },
  { id: 498, source: "Spreadsheet", spreadsheetRow: "R499", program: "Square Mile - Mezz", lender: "Square Mile Capital Management", type: "Mezzanine", minLoan: "", maxLoan: "", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "erattner@squaremilecapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Elliot Ratner", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 499, source: "Spreadsheet", spreadsheetRow: "R500", program: "Square Mile - Senior", lender: "Square Mile Capital Management", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "erattner@squaremilecapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Elliot Ratner", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 500, source: "Spreadsheet", spreadsheetRow: "R501", program: "Stabilis Capital", lender: "Stabilis Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$70,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "ianmccarthy@stabiliscap.com", phone: "212-256-8953", recourse: "CASE BY CASE", contactPerson: "Ian McCarthy", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Owner occupied loans that combine real estate with other hard collateral to max proceeds. Asset based lending, equipment, inventory, A/R, franchise loans. 10-12%" },
  { id: 501, source: "Spreadsheet", spreadsheetRow: "R502", program: "Stallion Funding", lender: "Stallion Funding", type: "Senior", minLoan: "$250,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["TX"], assets: ["Office", "Light Industrial"], status: "Active", email: "rachael@stallionfunding.com", phone: "512-219-5558", recourse: "CASE BY CASE", contactPerson: "Rachael Osterloh", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 502, source: "Spreadsheet", spreadsheetRow: "R503", program: "StanCorp Mortgage Investors, LLC", lender: "StanCorp Mortgage Investors, LLC", type: "Senior", minLoan: "$700,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "StanCorp is a great lender for small difficult deals. They are very fleXible and are able to do a lot of loans that other life companies can't. They have a strong bridge-to-perm program." },
  { id: 503, source: "Spreadsheet", spreadsheetRow: "R504", program: "Starion Bank - construction", lender: "Starion Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "80%", minDscr: "N/A", states: ["WI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "erikj@starionbank.com", phone: "608-772-7935", recourse: "CASE BY CASE", contactPerson: "Erik Julson", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Can do medical, religious organizations" },
  { id: 504, source: "Spreadsheet", spreadsheetRow: "R505", program: "Starion Bank - perm", lender: "Starion Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "80%", minDscr: "N/A", states: ["WI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "erikj@starionbank.com", phone: "608-772-7935", recourse: "CASE BY CASE", contactPerson: "Erik Julson", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Can do medical, religious organizations" },
  { id: 505, source: "Spreadsheet", spreadsheetRow: "R506", program: "Starwood - CMBS", lender: "Starwood Mortgage Capital", type: "Senior", minLoan: "$4,000,000", maxLoan: "$200,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Mobile Home Park", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "cpicket@starwood.com", phone: "212-600-2839", recourse: "NON RECOURSE", contactPerson: "Craig Picket", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Will do cannabis, but not single tenant owner occupied cannabis.  Cannabis company could be one of many tenants in a multi-tenant retail property" },
  { id: 506, source: "Spreadsheet", spreadsheetRow: "R507", program: "State Bank & Trust", lender: "State Bank & Trust", type: "Senior", minLoan: "$3,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality"], status: "Active", email: "blake.snyder@statebt.com", phone: "404-788-7225", recourse: "CASE BY CASE", contactPerson: "Blake Snyder", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: ["GA"], notes: "local sponsorship; just bought by Cadence Bank" },
  { id: 507, source: "Spreadsheet", spreadsheetRow: "R508", program: "Sterling National Bank - extended", lender: "Sterling National Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$45,000,000", maxLtv: "", minDscr: "N/A", states: ["MA", "RI"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "mvitale@snb.com", phone: "914-367-9017", recourse: "CASE BY CASE", contactPerson: "Mike Vitale", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 508, source: "Spreadsheet", spreadsheetRow: "R509", program: "Sterling National Bank - tri-state", lender: "Sterling National Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$45,000,000", maxLtv: "", minDscr: "N/A", states: ["NY", "NJ", "CT"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "mvitale@snb.com", phone: "914-367-9017", recourse: "CASE BY CASE", contactPerson: "Mike Vitale", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 509, source: "Spreadsheet", spreadsheetRow: "R510", program: "Stern Brothers", lender: "Stern Brothers", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["West"], assets: ["Apartments"], status: "Active", email: "lgarcia@sternbrothers.com", phone: "602-538-0073", recourse: "CASE BY CASE", contactPerson: "Lauro Garcia", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "L+225" },
  { id: 510, source: "Spreadsheet", spreadsheetRow: "R511", program: "Stock Yards Bank", lender: "Stock Yards Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$25,000,000", maxLtv: "80%", minDscr: "1.2", states: ["IN", "OH", "KY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "laura.haynes@syb.com", phone: "317-238-2830", recourse: "FULL", contactPerson: "Laura Haynes", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IN", "OH", "KY"], notes: "Focus on Indianapolis, Louisville and Cincinatti, and surrounding areas." },
  { id: 511, source: "Spreadsheet", spreadsheetRow: "R512", program: "Stronghill Capital - Perm Program", lender: "Stronghill Capital", type: "Senior", minLoan: "$250,000", maxLoan: "$3,500,000", maxLtv: "75%", minDscr: "N/A", states: ["AL", "AK", "AR", "AZ", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "brian@stronghill.com", phone: "425-308-1532", recourse: "FULL", contactPerson: "Brian Simmons", loanTerms: "10 year, 15 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Permanent financing (not hard money), Portfolios OK, Short term rentals OK (e.g. Airbnb), DSCRs from 1.10x, at par lender, no yield maintenance, YSP available. Residential 1-4 Natinowide except AZ, MI, MN, NV, ND, SD, VA, VT" },
  { id: 512, source: "Spreadsheet", spreadsheetRow: "R513", program: "Suncoast Credit Union", lender: "Suncoast Credit Union", type: "Senior", minLoan: "$250,000", maxLoan: "$35,000,000", maxLtv: "", minDscr: "N/A", states: ["FL"], assets: ["Apartments", "Assisted Living", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Hospital/Health Care"], status: "Active", email: "christopher.massie@suncoastcreditunion.com", phone: "813.465.0553", recourse: "FULL", contactPerson: "Chris Massie", loanTerms: "1 year, 10 year, 2 year, 25 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "" },
  { id: 513, source: "Spreadsheet", spreadsheetRow: "R514", program: "Suntrust - agency", lender: "Suntrust", type: "Senior", minLoan: "$1,000,000", maxLoan: "$200,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Fannie/Freddie/HUD" },
  { id: 514, source: "Spreadsheet", spreadsheetRow: "R515", program: "SunTrust - development", lender: "SunTrust", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "ward.ebbert@suntrust.com", phone: "404.813.1214", recourse: "CASE BY CASE", contactPerson: "Ward Ebbert", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "https://cre.suntrustrh.com/contact-us" },
  { id: 515, source: "Spreadsheet", spreadsheetRow: "R516", program: "Suntrust - multifamily bridge", lender: "Suntrust", type: "Senior", minLoan: "$10,000,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "L+250" },
  { id: 516, source: "Spreadsheet", spreadsheetRow: "R517", program: "Symetra Life", lender: "Symetra Life", type: "Senior", minLoan: "$700,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 25 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Kevin: \"We probably do 70% of our life company loans with Symetra. They are eXtremely fleXible and have an eXcellent program, especially for smaller $700,000-$10,000,000 deals. Their spreads are currently around 160-190, and they currently offer 10+10+5, or even 25/25 fully amortizing deals. Non-recourse can be had at the lower LTVs. They underwrite on an imputed 6.50% Cap rate, and usually take around 70% of that. \"" },
  { id: 517, source: "Spreadsheet", spreadsheetRow: "R518", program: "Synartis Capital Management", lender: "Synartis Capital Management", type: "Senior", minLoan: "$250,000", maxLoan: "$3,000,000", maxLtv: "75%", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "SFR Portfolio", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "cbj@synartis.net", phone: "404-241-3400", recourse: "FULL", contactPerson: "Chris Johnston", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Offer TI/LC Mezz for retail reposition" },
  { id: 518, source: "Spreadsheet", spreadsheetRow: "R519", program: "Taylor Derrick Capital", lender: "Taylor Derrick Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["UT", "CO", "CA", "NV", "ID", "AZ", "OR", "WA", "MT", "WY", "TX"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "nick@taylorderrick.com", phone: "801-450-7815", recourse: "CASE BY CASE", contactPerson: "Nick Etherington", loanTerms: "1 year, 2 year, 25 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "Originiation 1-4%, First position rates 9-13%, Second Position Rates 14-18%" },
  { id: 519, source: "Spreadsheet", spreadsheetRow: "R520", program: "TBK Bank", lender: "TBK Bank", type: "Senior", minLoan: "$3,000,000", maxLoan: "$35,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Land", "Self-storage", "Other"], status: "Active", email: "ssillers@tbkbank.com", phone: "214-365-6958", recourse: "CASE BY CASE", contactPerson: "Scott Sillers", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Primarily non-recourse but selective" },
  { id: 520, source: "Spreadsheet", spreadsheetRow: "R521", program: "TBK Commercial", lender: "TBK Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "NOTE PURCHASE"], status: "Active", email: "swright@tbkbank.com", phone: "719-384-4462", recourse: "CASE BY CASE", contactPerson: "Shade Wright", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Big on non recourse.  Will do canibus if it does not violate federal" },
  { id: 521, source: "Spreadsheet", spreadsheetRow: "R522", program: "TCF Bank - MI", lender: "TCF Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "N/A", states: ["MI"], assets: ["Apartments", "Office", "Light Industrial", "Hotel/Hospitality", "Other"], status: "Active", email: "mreifel@tcfbank.com", phone: "248-740-1635", recourse: "CASE BY CASE", contactPerson: "Mark Reifel", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["MI"], notes: "Prefer borrower and asset to be in SE Michigan" },
  { id: 522, source: "Spreadsheet", spreadsheetRow: "R523", program: "Leste", lender: "TCM Finance", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "VT", "WI", "WV", "WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "", phone: "305-249-1607", recourse: "CASE BY CASE", contactPerson: "Larbi Benslimane", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 523, source: "Spreadsheet", spreadsheetRow: "R524", program: "TD Bank - NYC/NJ", lender: "TD Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["NJ"], assets: ["Apartments", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "michael.spencer2@td.com", phone: "914-922-2849", recourse: "CASE BY CASE", contactPerson: "Michael Spencer", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "90 minutes from New York metro, loans sub 1MM, focused on SBA lending" },
  { id: 524, source: "Spreadsheet", spreadsheetRow: "R525", program: "Terra - Senior", lender: "Terra Capital Partners", type: "Senior", minLoan: "$25,000,000", maxLoan: "$75,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mfishbein@tcp-us.com", phone: "212-754-6092", recourse: "CASE BY CASE", contactPerson: "Mike Fishbein", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 525, source: "Spreadsheet", spreadsheetRow: "R526", program: "Texas Bank", lender: "Texas Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "70%", minDscr: "N/A", states: ["TX"], assets: ["Office", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "daniel.hutson@texasbank.com", phone: "325-649-9264", recourse: "CASE BY CASE", contactPerson: "Daniel Hutson", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 526, source: "Spreadsheet", spreadsheetRow: "R527", program: "The Battery Group", lender: "The Battery Group", type: "Senior", minLoan: "$250,000", maxLoan: "$15,000,000", maxLtv: "65%", minDscr: "N/A", states: ["NY", "NJ", "CT", "DC", "VA", "MA", "VT", "NH", "ME", "PA", "DE", "MD", "NC", "SC", "GA", "FL", "WV", "OH", "KY", "TN", "IL", "MI", "WI", "MO"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "victor@thebatterygroup.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Victor Streicher", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "up to 65% LTV" },
  { id: 527, source: "Spreadsheet", spreadsheetRow: "R528", program: "The Cecilian Bank", lender: "The Cecilian Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "", phone: "270-737-1593", recourse: "FULL", contactPerson: "Billy Cann", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 528, source: "Spreadsheet", spreadsheetRow: "R529", program: "The CIM Group - development", lender: "The CIM Group", type: "Senior", minLoan: "$30,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jschreiber@cimgroup.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Jason Schreiber", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "" },
  { id: 529, source: "Spreadsheet", spreadsheetRow: "R530", program: "The Dominion Group", lender: "The Dominion Group", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "SFR Portfolio", "Office"], status: "Active", email: "Wade@thedominiongroup.com", phone: "443-610-9354", recourse: "FULL", contactPerson: "Wade Susini", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Preferred for SFR Portfolio" },
  { id: 530, source: "Spreadsheet", spreadsheetRow: "R531", program: "The National Bank of Indianapolis", lender: "The National Bank of Indianapolis", type: "Senior", minLoan: "$2,000,000", maxLoan: "$26,000,000", maxLtv: "80%", minDscr: "N/A", states: ["IN", "IL", "OH", "MI", "WI", "MN", "IA", "ND", "SD", "NE", "KS", "MO"], assets: ["Apartments", "Office", "Retail-Multi Tenant"], status: "Active", email: "tomurick@nbofi.com", phone: "317-267-1696", recourse: "CASE BY CASE", contactPerson: "Tom Urick", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: ["IN"], notes: "" },
  { id: 531, source: "Spreadsheet", spreadsheetRow: "R532", program: "The Westmoore Group", lender: "The Westmoore Group", type: "Senior", minLoan: "$50,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["GA", "SC", "AL", "FL", "TN", "NC"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "jblock@westmooregroup.com", phone: "646-801-6190", recourse: "FULL", contactPerson: "Jonathan Block", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Can close in 5 business days, typically full recourse, max LTV is 80%, but typically we are 70%" },
  { id: 532, source: "Spreadsheet", spreadsheetRow: "R533", program: "Thorofare Capital - Bridge", lender: "Thorofare Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$40,000,000", maxLtv: "68%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "felix@thorofarecapital.com", phone: "8479628106", recourse: "NON RECOURSE", contactPerson: "Felix Gutnikov", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 533, source: "Spreadsheet", spreadsheetRow: "R534", program: "Thorofare Capital - Core+ Institutional", lender: "Thorofare Capital", type: "Senior", minLoan: "$15,000,000", maxLoan: "$75,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "felix@thorofarecapital.com", phone: "8479628106", recourse: "NON RECOURSE", contactPerson: "Felix Gutnikov", loanTerms: "2 year, 3 year, 4 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 534, source: "Spreadsheet", spreadsheetRow: "R535", program: "Thorofare Capital - Intermediate-Term", lender: "Thorofare Capital", type: "Senior", minLoan: "$10,000,000", maxLoan: "$40,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "felix@thorofarecapital.com", phone: "8479618106", recourse: "NON RECOURSE", contactPerson: "Felix Gutnikov", loanTerms: "2 year, 3 year, 4 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 535, source: "Spreadsheet", spreadsheetRow: "R536", program: "Thrive Lending", lender: "Thrive Lending", type: "Senior", minLoan: "", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["TX"], assets: ["Apartments"], status: "Active", email: "sonya@thrivelend.com", phone: "512-394-7114", recourse: "CASE BY CASE", contactPerson: "Sonya Gonzalez", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 536, source: "Spreadsheet", spreadsheetRow: "R537", program: "TIAA Bank", lender: "TIAA Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "1.15", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Student Housing", "Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "brendan.gale@tiaabank.com", phone: "410-204-4646", recourse: "NON RECOURSE", contactPerson: "Brendan Gale", loanTerms: "10 year, 15 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Must be in Top 200 MSA (75k+ population within 5 miles). Bridge top 100 MSAs.  Partial recourse if there is an \"issue\".  No single tenant retail, tenant must be investment grade credit.  OK Canadian borrowers, must have U.S. assets.  Shannan Wooten covers Midwest.  TIAA originators follow broker for territory, not sponsor or asset. No rent stabilized units." },
  { id: 537, source: "Spreadsheet", spreadsheetRow: "R538", program: "Touchmark National Bank", lender: "Touchmark National Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$25,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "deedee.mcintyre@touchmarknb.com", phone: "678-873-2301", recourse: "CASE BY CASE", contactPerson: "DeeDee McIntyre", loanTerms: "10 year, 7 year, Less than 1 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "SBA 7a, SBA 504, USDA" },
  { id: 538, source: "Spreadsheet", spreadsheetRow: "R539", program: "TownshipCapital - JV Equity", lender: "TownshipCapital", type: "JV Equity", minLoan: "$3,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "tsteindorf@townshipinc.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Tyler Steindorf", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Primary and Secondary Markets" },
  { id: 539, source: "Spreadsheet", spreadsheetRow: "R540", program: "TownshipCapital - mezz debt", lender: "TownshipCapital", type: "Mezzanine", minLoan: "$3,000,000", maxLoan: "$40,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "tsteindorf@townshipinc.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Tyler Steindorf", loanTerms: "10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "Primary and Secondary Markets" },
  { id: 540, source: "Spreadsheet", spreadsheetRow: "R541", program: "Forman Capital", lender: "Forman Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Other"], status: "Active", email: "bjacobson@formancap.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Ben Jacobson", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 541, source: "Spreadsheet", spreadsheetRow: "R542", program: "TriCity National Bank", lender: "TriCity National Bank", type: "Senior", minLoan: "$2,500", maxLoan: "$22,000,000", maxLtv: "85%", minDscr: "N/A", states: ["IL", "WI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "m.merritt@tcnb.com", phone: "414-325-1242", recourse: "CASE BY CASE", contactPerson: "Mike Merritt", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["WI"], notes: "" },
  { id: 542, source: "Spreadsheet", spreadsheetRow: "R543", program: "Tristate Capital Bank", lender: "TriState Capital Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "jpascarella@tscbank.com", phone: "412-304-0484", recourse: "CASE BY CASE", contactPerson: "Joe Pascarella", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["PA", "OH", "NY", "NJ"], notes: "" },
  { id: 543, source: "Spreadsheet", spreadsheetRow: "R544", program: "Triumph Capital Partners - multifamily", lender: "Triumph Capital Partners, LLC", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "SFR Portfolio", "Co-living"], status: "Active", email: "MMueller@triumph.capital", phone: "", recourse: "CASE BY CASE", contactPerson: "Matt Mueller", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Bridge and renovation plays. Can close quickly." },
  { id: 544, source: "Spreadsheet", spreadsheetRow: "R545", program: "Trustone Federal Credit Union - NNN Signle Tenant National", lender: "Trustone Federal Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$8,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Retail-Multi Tenant"], status: "Active", email: "elia.griffith@trustone.org", phone: "", recourse: "FULL", contactPerson: "Elia Griffith", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Nation-wide single tenant NNN retail lender. 65% LTV Full Recourse, No prepay, 25 year am. Will go up to 80% in WI, MN. No big box." },
  { id: 545, source: "Spreadsheet", spreadsheetRow: "R546", program: "Trustone Federal Credit Union - Wisconsin", lender: "TruStone Credit Union", type: "Senior", minLoan: "$350,000", maxLoan: "$15,000,000", maxLtv: "80%", minDscr: "N/A", states: ["WI"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage"], status: "Active", email: "doug.tilque@trustone.org", phone: "414-454-9733", recourse: "FULL", contactPerson: "Doug Tilque", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 546, source: "Spreadsheet", spreadsheetRow: "R547", program: "U.S. Trust", lender: "U.S. Trust", type: "Senior", minLoan: "$3,000,000", maxLoan: "$200,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "m.boisseree@ustrust.com", phone: "619-249-1705", recourse: "CASE BY CASE", contactPerson: "Matt Boisseree", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Bridge loans, 3,5,7 fixed rate terms with up to 30 year amo for the wealthy and affluent" },
  { id: 547, source: "Spreadsheet", spreadsheetRow: "R548", program: "UBS", lender: "UBS", type: "Senior", minLoan: "$3,000,000", maxLoan: "$10.0B", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "neal.casey@ubs.com", phone: "212-713-4236", recourse: "NON RECOURSE", contactPerson: "Neal Casey", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "CMBS; can build 50 bps in for SS and we collect the other 50; really responsive lender;" },
  { id: 548, source: "Spreadsheet", spreadsheetRow: "R549", program: "Unify Financial Credit Union - branch markets", lender: "Unify Financial Credit Union", type: "Senior", minLoan: "$1,000,000", maxLoan: "$30,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA", "TX", "GA", "CO", "AR", "MS", "WV", "VA", "TN", "KY", "AL", "NV", "AZ", "IN", "NJ", "MI", "UT"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jeff.rogers@unifyfcu.com", phone: "310.381.2161", recourse: "CASE BY CASE", contactPerson: "Jeff Rogers", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 549, source: "Spreadsheet", spreadsheetRow: "R550", program: "Union Bank - commercial", lender: "Union Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "OR", "WA"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "david.moehring@unionbank.com", phone: "714-987-5101", recourse: "CASE BY CASE", contactPerson: "David Moehring", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Must have 5+ tenants on commercial properties" },
  { id: 550, source: "Spreadsheet", spreadsheetRow: "R551", program: "Union Bank - multifamily", lender: "Union Bank", type: "Senior", minLoan: "$1,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["CA", "OR", "WA"], assets: ["Apartments"], status: "Active", email: "david.moehring@unionbank.com", phone: "714-987-5101", recourse: "CASE BY CASE", contactPerson: "David Moehring", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 551, source: "Spreadsheet", spreadsheetRow: "R552", program: "Union National Bank of Elgin", lender: "Union National Bank", type: "Senior", minLoan: "$0", maxLoan: "$6,000,000", maxLtv: "90%", minDscr: "N/A", states: ["IL"], assets: ["Apartments", "Condos", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "unbsales@unbelgin.com", phone: "847-888-7500, 847-450-9055", recourse: "CASE BY CASE", contactPerson: "Don Hansen", loanTerms: "1 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["IL"], notes: "Also do SBA" },
  { id: 552, source: "Spreadsheet", spreadsheetRow: "R553", program: "United Bank of Michigan", lender: "United Bank of Michigan", type: "Senior", minLoan: "$250,000", maxLoan: "$11,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "doris.drain@unitedbank4u.com", phone: "616-559-4524", recourse: "CASE BY CASE", contactPerson: "Doris Drain", loanTerms: "3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 553, source: "Spreadsheet", spreadsheetRow: "R554", program: "United Farm Family Life", lender: "United Farm Family Life", type: "Senior", minLoan: "$1,000,000", maxLoan: "$5,000,000", maxLtv: "65%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "United Farm Family is one of our smaller life companies. They usually only do around $65mm-$70mm/year in loans, but are very aggressive and creative when they find something they like. They underwrite to 65% of the market cap rate and usually offer 10/25 up to a 10/30. The majority of the loans they do are non-recourse. They can do a 12-month forward committment and lock rate at application. EXpedited closings are available." },
  { id: 554, source: "Spreadsheet", spreadsheetRow: "R555", program: "United Federal Credit Union - Nevada construction", lender: "United Federal Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["NV"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mlivermore@unitedfcu.com", phone: "775-287-9704", recourse: "CASE BY CASE", contactPerson: "Martin Livermore", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Prefer construction-to-perm" },
  { id: 555, source: "Spreadsheet", spreadsheetRow: "R556", program: "United Federal Credit Union - Nevada perm", lender: "United Federal Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["NV"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mlivermore@unitedfcu.com", phone: "775-287-9704", recourse: "CASE BY CASE", contactPerson: "Martin Livermore", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 556, source: "Spreadsheet", spreadsheetRow: "R557", program: "United Security Bank - construction", lender: "United Security Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "psaunders@unitedsecuritybank.com", phone: "559-248-4942", recourse: "CASE BY CASE", contactPerson: "Porsche Saunders", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Non-recourse by exception for publically traded entities." },
  { id: 557, source: "Spreadsheet", spreadsheetRow: "R558", program: "United Security Bank - perm", lender: "United Security Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "psaunders@unitedsecuritybank.com", phone: "559-248-4942", recourse: "CASE BY CASE", contactPerson: "Porsche Saunders", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Non-recourse by exception for publically traded entities." },
  { id: 558, source: "Spreadsheet", spreadsheetRow: "R559", program: "US Bank", lender: "US Bank", type: "Senior", minLoan: "$200,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AZ", "AR", "CA", "CO", "ID", "IL", "IA", "IN", "KS", "KY", "KS", "MS", "MO", "NE", "NM", "NV", "ND", "OH", "OR", "SD", "TN", "UT", "WA", "WI", "WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "ashton.ram@usbank.com, cythiam.johnson@usbank.com", phone: "510-367-6769", recourse: "CASE BY CASE", contactPerson: "Ashton Ram, Cythnia Johnson", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["AZ", "AR", "CA", "CO", "ID", "IL", "IA", "IN", "KS", "KY", "KS", "MS", "MO", "NE", "NM", "NV", "ND", "OH", "OR", "SD", "TN", "UT", "WA", "WI", "WY"], notes: "Multifamily and Retail" },
  { id: 559, source: "Spreadsheet", spreadsheetRow: "R560", program: "US Bank - Columbus and Cincinnati", lender: "US Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$25,000,000", maxLtv: "", minDscr: "N/A", states: ["OH"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "", phone: "614.232.8093", recourse: "CASE BY CASE", contactPerson: "John Hart", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["AZ", "AR", "CA", "CO", "ID", "IL", "IA", "IN", "KS", "KY", "KS", "MS", "MO", "NE", "NM", "NV", "ND", "OH", "OR", "SD", "TN", "UT", "WA", "WI", "WY"], notes: "https://www.usbank.com/cgi_w/cfm/commercial_business/products_and_services/cre/CREMarketProfile3q2016.pdf" },
  { id: 560, source: "Spreadsheet", spreadsheetRow: "R561", program: "Valley National Bank", lender: "Valley National Bank", type: "Senior", minLoan: "$1,500,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "1.25", states: ["NY", "NJ", "CT"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "Imaharaj@valley.com", phone: "347-901-0338", recourse: "CASE BY CASE", contactPerson: "Indira Maharaj", loanTerms: "10 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["NY", "NJ"], notes: "" },
  { id: 561, source: "Spreadsheet", spreadsheetRow: "R562", program: "Velocity Mortgage Capital - Traditional I", lender: "Velocity Mortgage Capital", type: "Senior", minLoan: "$75,000", maxLoan: "$3,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TX", "UT", "VA", "WA", "WI", "WV", "WY"], assets: ["Apartments", "Condos", "SFR Portfolio"], status: "Active", email: "rallred@velocitymortgage.com", phone: "949-275-8375", recourse: "CASE BY CASE", contactPerson: "Rand Allred", loanTerms: "1 year, 10 year, 2 year, 3 year, 30 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "High rates, troubled credit --> Credit Based Rates" },
  { id: 562, source: "Spreadsheet", spreadsheetRow: "R563", program: "Velocity Mortgage Capital - Traditional II", lender: "Velocity Mortgage Capital", type: "Senior", minLoan: "$75,000", maxLoan: "$3,000,000", maxLtv: "70%", minDscr: "N/A", states: ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MO", "MS", "MT", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TX", "UT", "VA", "WA", "WI", "WV", "WY"], assets: ["Office", "Medical Office", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "rallred@velocitymortgage.com", phone: "949-275-8375", recourse: "FULL", contactPerson: "Rand Allred", loanTerms: "1 year, 10 year, 2 year, 3 year, 30 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Credit Based Rates" },
  { id: 563, source: "Spreadsheet", spreadsheetRow: "R564", program: "Victory State Bank", lender: "Victory State Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$8,250,000", maxLtv: "75%", minDscr: "N/A", states: ["NY"], assets: ["Apartments", "Condos", "Student Housing", "SFR Portfolio", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "jreyes@victorystatebank.com", phone: "718-889-3612", recourse: "FULL", contactPerson: "Johnny Reyes", loanTerms: "1 year, 10 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Good solid bank that does construction loans in nyc for multifamily" },
  { id: 564, source: "Spreadsheet", spreadsheetRow: "R565", program: "Walnut Street - Bridge", lender: "Walnut Street", type: "Senior", minLoan: "$100,000", maxLoan: "$2,500,000", maxLtv: "", minDscr: "N/A", states: ["DC", "MD", "VA", "NC", "SC", "DE"], assets: ["Apartments", "SFR Portfolio"], status: "Active", email: "info@walnutstreetfinance.com", phone: "703.273.3500", recourse: "FULL", contactPerson: "Katia Potapov", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 565, source: "Spreadsheet", spreadsheetRow: "R566", program: "Watermarq", lender: "Watermarq", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Light Industrial"], status: "Active", email: "josh@watermarqre.com", phone: "954-695-8016", recourse: "CASE BY CASE", contactPerson: "Josh Koperwas", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "Top 100 MSAs. No tertiary markets." },
  { id: 566, source: "Spreadsheet", spreadsheetRow: "R567", program: "Wells Fargo", lender: "Wells Fargo", type: "Senior", minLoan: "$500,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "ryan.campbell@wellsfargo.com, Christopher.Micheletti@wellsfargo.com", phone: "727-385-7606", recourse: "CASE BY CASE", contactPerson: "Ryan Campbell, Chris Micheletti", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 567, source: "Spreadsheet", spreadsheetRow: "R568", program: "Wells Fargo Construction", lender: "Wells Fargo", type: "Senior", minLoan: "$500,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "Vincent.J.Zerilli@wellsfargo.com, Christopher.Micheletti@wellsfargo.com", phone: "646-773-2071", recourse: "CASE BY CASE", contactPerson: "Vincent Zerilli, Chris Micheletti", loanTerms: "1 year, 2 year", typeOfLoans: ["New Development", "Redevelopment"], sponsorStates: [], notes: "Can do HUD takeouts" },
  { id: 568, source: "Spreadsheet", spreadsheetRow: "R569", program: "Wells Fargo LI", lender: "Wells Fargo", type: "Senior", minLoan: "$500,000", maxLoan: "$200,000,000", maxLtv: "", minDscr: "N/A", states: ["NY", "NJ", "PA", "CT", "MA"], assets: ["Apartments", "Senior Housing", "SFR Portfolio", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "Christopher.Micheletti@wellsfargo.com", phone: "516.350.3099", recourse: "CASE BY CASE", contactPerson: "Chris Micheletti", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 569, source: "Spreadsheet", spreadsheetRow: "R570", program: "Wells Fargo SBA", lender: "Wells Fargo", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Other"], status: "Active", email: "Christopher.Micheletti@wellsfargo.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Chris Micheletti", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 570, source: "Spreadsheet", spreadsheetRow: "R571", program: "Wells Fargo SFR  Portfolio", lender: "Wells Fargo Home Mortgage", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["SFR Portfolio"], status: "Active", email: "Anthony.J.Ayala@wellsfargo.com, Christopher.Micheletti@wellsfargo.com", phone: "718-736-1962", recourse: "CASE BY CASE", contactPerson: "Tony Ayala, Chris Micheletti", loanTerms: "", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 571, source: "Spreadsheet", spreadsheetRow: "R572", program: "Wells Fargo Small Balance CMBS", lender: "Wells Fargo", type: "Senior", minLoan: "$1,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "andrew.j.walker@wellsfargo.com, Christopher.Micheletti@wellsfargo.com", phone: "312-345-7665", recourse: "NON RECOURSE", contactPerson: "Andrew Walker, Chris Micheletti", loanTerms: "10 year, 5 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "1.25x min DSCR, 8% min debt yield, $25,000 processing fee for loans <$10mm, $30,000 processfing fee for loans $10-15mm." },
  { id: 572, source: "Spreadsheet", spreadsheetRow: "R573", program: "Wellthy International", lender: "Wellthy International", type: "JV Equity", minLoan: "$500,000", maxLoan: "$10,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Co-living"], status: "Active", email: "cashflow@ceofactory.biz", phone: "917-576-7207", recourse: "CASE BY CASE", contactPerson: "Harold Looney", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["New Development"], sponsorStates: [], notes: "Equity syndicator for Co-living. Uses Reg D Loves Common as property manager." },
  { id: 573, source: "Spreadsheet", spreadsheetRow: "R574", program: "WesBanco - Pittsburgh", lender: "WesBanco Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial"], status: "Active", email: "ldillon@wesbanco.com", phone: "412-902-3107", recourse: "CASE BY CASE", contactPerson: "Lisa Dillon", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 574, source: "Spreadsheet", spreadsheetRow: "R575", program: "WesBanco Bank", lender: "WesBanco", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "70%", minDscr: "N/A", states: ["WV"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "rtrickett@wesbanco.com", phone: "304-905-7359", recourse: "CASE BY CASE", contactPerson: "Randall Trickett", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "For out of state borrowers, prefer low LTV and strong liquidity" },
  { id: 575, source: "Spreadsheet", spreadsheetRow: "R576", program: "West Bay Capital", lender: "West Bay Capital", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Student Housing", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Other"], status: "Active", email: "kprince@westbayllc.com", phone: "310-231-1270", recourse: "CASE BY CASE", contactPerson: "Kevin Prince", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Prefer CA" },
  { id: 576, source: "Spreadsheet", spreadsheetRow: "R577", program: "West Town Bank & Trust", lender: "West Town Bank & Trust", type: "Senior", minLoan: "$750,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "mplowcha@westtownbank.com", phone: "919-741-4391", recourse: "CASE BY CASE", contactPerson: "Matt Plowcha", loanTerms: "10 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "SBA 7a and USDA B&I" },
  { id: 577, source: "Spreadsheet", spreadsheetRow: "R578", program: "White Oak - Bridge", lender: "White Oak Realty Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$5,000,000", maxLtv: "70%", minDscr: "N/A", states: ["NY", "NJ", "CT"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Other"], status: "Active", email: "seth@aegisrealty.com", phone: "917-417-5526", recourse: "CASE BY CASE", contactPerson: "Seth Miller", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: [], notes: "Not big on recourse, but makes all own decisions" },
  { id: 578, source: "Spreadsheet", spreadsheetRow: "R579", program: "Wilshire Finance Partners - CA", lender: "Wishire Finance Partners", type: "Senior", minLoan: "$250,000", maxLoan: "$7,000,000", maxLtv: "75%", minDscr: "N/A", states: ["CA"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "tmorast@wilshirefp.com", phone: "913.526.9276", recourse: "CASE BY CASE", contactPerson: "Tom Morast", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 579, source: "Spreadsheet", spreadsheetRow: "R580", program: "Wilshire Finance Partners - Nationwide", lender: "Wishire Finance Partners", type: "Senior", minLoan: "$1,000,000", maxLoan: "$10,000,000", maxLtv: "85%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Assisted Living", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Retail-Multi Tenant", "Self-storage", "Other"], status: "Active", email: "tmorast@wilshirefp.com, jash@wilshirefp.com", phone: "913.526.9276, 949-599-2900", recourse: "CASE BY CASE", contactPerson: "Tom Morast, Jay Ash", loanTerms: "1 year, 2 year, 3 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 580, source: "Spreadsheet", spreadsheetRow: "R581", program: "Wilshire Quinn Capital", lender: "Wilshire Quinn Capital", type: "Senior", minLoan: "$200,000", maxLoan: "$10,000,000", maxLtv: "60%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"], status: "Active", email: "dgoldberg@wilshirequinn.com", phone: "619-872-6000", recourse: "CASE BY CASE", contactPerson: "Dan Goldberg", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Will consider a wide variety of loan types including gas stations, car washes, parking lots, self-storage, hospitality, retail centers, mixed-use, specialty-use, office, entitled land etc." },
  { id: 581, source: "Spreadsheet", spreadsheetRow: "R582", program: "Wisconsin Bank & Trust - WI & Northern Illinois", lender: "Wisconsin Bank & Trust", type: "Senior", minLoan: "$500,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["WI"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "ahinze@wisconsinbankandtrust.com", phone: "Preferably Wisconsin-based borrowers, but will look at outside sponsors in right situation", recourse: "CASE BY CASE", contactPerson: "Alex Hinze", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 582, source: "Spreadsheet", spreadsheetRow: "R583", program: "Wisconsin Bank & Trust - WI borrowers", lender: "Wisconsin Bank & Trust", type: "Senior", minLoan: "$1,000,000", maxLoan: "$40,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality"], status: "Active", email: "ahinze@wisconsinbankandtrust.com", phone: "Wisconsin, Northern Illinois, will follow borrowers into other market", recourse: "CASE BY CASE", contactPerson: "Alex Hinze", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: ["WI"], notes: "" },
  { id: 583, source: "Spreadsheet", spreadsheetRow: "R584", program: "Woodforest National Bank", lender: "Woodforest National Bank", type: "Senior", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["TX", "NC"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant"], status: "Active", email: "jlively@woodforest.com", phone: "832-375-2069", recourse: "CASE BY CASE", contactPerson: "Jason Lively", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "$5 to $20 is sweet spot. Generally less than 5 yr tems. Can go up to 25yr AM. Focused in TX and some parts of NC" },
  { id: 584, source: "Spreadsheet", spreadsheetRow: "R585", program: "Woodmen Life", lender: "Woodmen Life", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "kevin@alisonmortgage.com", phone: "(805) 845-5200", recourse: "CASE BY CASE", contactPerson: "Kevin Corstorphine", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "They prefer >500,000 in the MSA Woodmen can generally get to 70-75% of an imputed 7.00% Cap rate with 1.50:1 minimum DSCR on 25 year amortization. They can do immediate funding, forward committments, or construction/perms. Rate is locked at application with a 2% refundable GFD. They usually use a yield -maintenance prepayment formula, but a step-down fixed/declining  option is also available on a case-by-case basis for a 5-10bp premium. They charge a $3,000-$5,000 Committment fee and require a minimum MSA population of 500,000." },
  { id: 585, source: "Spreadsheet", spreadsheetRow: "R586", program: "Woori America Bank", lender: "Woori America Bank", type: "Senior", minLoan: "$500,000", maxLoan: "$37,000,000", maxLtv: "60%", minDscr: "N/A", states: ["GA"], assets: ["Apartments", "Light Industrial", "Retail-Multi Tenant", "Hotel/Hospitality", "Other"], status: "Active", email: "steve.han@wooriamericabank.com", phone: "770-364-3640", recourse: "CASE BY CASE", contactPerson: "Steve Han", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 586, source: "Spreadsheet", spreadsheetRow: "R587", program: "Xceed Financial Credit Union", lender: "Xceed Financial Credit Union", type: "Senior", minLoan: "$500,000", maxLoan: "$4,500,000", maxLtv: "75%", minDscr: "N/A", states: ["OR", "WA", "CA", "UT", "AZ", "TX", "CO", "ID"], assets: ["Apartments", "Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "jmccurdy@xfcu.org", phone: "435-760-5198", recourse: "CASE BY CASE", contactPerson: "John McCurdy", loanTerms: "1 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: ["CA", "OR", "WA", "NV", "AZ", "CO", "ID", "NM", "UT", "ND", "SD", "MO", "WY", "TX"], notes: "" },
  { id: 587, source: "Spreadsheet", spreadsheetRow: "R588", program: "xj9r", lender: "xj9r", type: "Senior", minLoan: "$50,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["CO", "WY", "NM", "TX", "OK", "KS", "NE", "MN", "IA", "MO", "AR", "LA", "MS", "AL", "GA", "FL", "TN", "SC", "NC", "KY", "IL", "WI", "IN", "MI", "OH", "WV", "VA", "PA", "DC", "MD", "DC", "NJ", "NY", "VT", "CT", "RI", "MA", "NH", "ME"], assets: ["Apartments", "SFR Portfolio", "Co-living"], status: "Active", email: "jc@xj9r.com", phone: "917-733-9385", recourse: "CASE BY CASE", contactPerson: "Joe Cohen", loanTerms: "1 year, 2 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Close \"super fast\"" },
  { id: 588, source: "Spreadsheet", spreadsheetRow: "R589", program: "Yam Capital - Bridge Program", lender: "Yam Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$50,000,000", maxLtv: "75%", minDscr: "1.2", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Senior Housing", "Student Housing", "Office", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "gkim@yamcapital.com, rmuranaka@yamcapital.com", phone: "480.387.5608, 480.344.0140", recourse: "CASE BY CASE", contactPerson: "Gene Kim, Ryan Murananka", loanTerms: "1 year, 2 year, 5 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 589, source: "Spreadsheet", spreadsheetRow: "R590", program: "Zions Bank - hotels", lender: "Zions Bank", type: "Senior", minLoan: "$0", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["UT", "ID"], assets: ["Hotel/Hospitality"], status: "Active", email: "douglas.tuttle@zionsbank.com, chad.call@zionsbank.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "10 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 590, source: "Spreadsheet", spreadsheetRow: "R591", program: "Zions Bank - investors", lender: "Zions Bank", type: "Senior", minLoan: "$0", maxLoan: "$8,000,000", maxLtv: "", minDscr: "N/A", states: ["AK", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "MD", "MI", "MN", "MO", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "douglas.tuttle@zionsbank.com, chad.call@zionsbank.com", phone: "(404) 694-1770", recourse: "CASE BY CASE", contactPerson: "Doug Tuttle", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Full recourse. No single-tenant." },
  { id: 591, source: "Spreadsheet", spreadsheetRow: "R592", program: "Zions Bank - owner operator", lender: "Zions Bank", type: "Senior", minLoan: "$300,000", maxLoan: "$8,000,000", maxLtv: "90%", minDscr: "N/A", states: ["AK", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "MD", "MI", "MN", "MO", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"], assets: ["Office", "Light Industrial", "Retail-Multi Tenant", "Other"], status: "Active", email: "douglas.tuttle@zionsbank.com, chad.call@zionsbank.com", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "1 year, 10 year, 2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 592, source: "Spreadsheet", spreadsheetRow: "R593", program: "Colony Bank - Perm Loan", lender: "Colony Bank", type: "Senior", minLoan: "$750,000", maxLoan: "$12,500,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Senior Housing", "Assisted Living", "Mobile Home Park", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Hotel/Hospitality", "Self-storage", "Hospital/Health Care"], status: "Active", email: "dana.campbell@colonybank.com", phone: "912-424-2557", recourse: "FULL", contactPerson: "Dana Campbell", loanTerms: "10 year, 15 year, 25 year", typeOfLoans: ["Acquisition", "New Development", "Refinance"], sponsorStates: ["GA"], notes: "Prefer 51% O/O; Investment on USDA B&I; SBA 7(a), 504, and USDA B&I" },
  { id: 593, source: "Spreadsheet", spreadsheetRow: "R594", program: "Joe Speiser", lender: "Joe Speiser", type: "Preferred Equity", minLoan: "$500,000", maxLoan: "$2,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Co-living", "Retail-Multi Tenant"], status: "Active", email: "Ask Tim", phone: "Ask Tim", recourse: "CASE BY CASE", contactPerson: "Joe Speiser", loanTerms: "2 year, 3 year, 5 year, 7 year", typeOfLoans: ["Acquisition", "Redevelopment"], sponsorStates: [], notes: "Long Island based ad tech entrepreneur. Sold a company and started another, investing profits into real estate. Wants to stay away from development, focus on value-add multifamily and retail." },
  { id: 594, source: "Spreadsheet", spreadsheetRow: "R595", program: "Entegra Bank - SC Lender", lender: "Entegra Bank", type: "Senior", minLoan: "$250,000", maxLoan: "$18,000,000", maxLtv: "80%", minDscr: "N/A", states: ["SC"], assets: ["Senior Housing", "Assisted Living", "Office", "Medical Office", "Retail-Multi Tenant", "Religious"], status: "Active", email: "rgreene@entegrabank.com", phone: "864-230-0960", recourse: "FULL", contactPerson: "Rod Greene", loanTerms: "5 year, 7 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "Targeting Upstate SC" },
  { id: 595, source: "Spreadsheet", spreadsheetRow: "R596", program: "Unity Capital - Bridge Program", lender: "Unity Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Assisted Living", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Hospital/Health Care", "Other"], status: "Active", email: "rjacobs@unitycapitalllc.com", phone: "646-660-9675", recourse: "CASE BY CASE", contactPerson: "Ron Jacobs", loanTerms: "1 year, 2 year, 3 year, 5 year", typeOfLoans: ["Acquisition", "New Development", "Redevelopment", "Refinance"], sponsorStates: [], notes: "" },
  { id: 596, source: "Spreadsheet", spreadsheetRow: "R597", program: "PCCP", lender: "PCCP", type: "Mezzanine", minLoan: "$15,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "3103562222", recourse: "CASE BY CASE", contactPerson: "Steve Towle", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 597, source: "Spreadsheet", spreadsheetRow: "R598", program: "Westwood Capital", lender: "Westwood Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Casino/Gaming"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 598, source: "Spreadsheet", spreadsheetRow: "R599", program: "madison realty capital", lender: "madison realty capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "mzegen@madisonrealtycapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Marc Zegen", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 599, source: "Spreadsheet", spreadsheetRow: "R600", program: "Firstrust Bank", lender: "Firstrust Bank", type: "Senior", minLoan: "$5,000,000", maxLoan: "$80,000,000", maxLtv: "", minDscr: "N/A", states: ["PA", "NJ"], assets: ["Education Related"], status: "Active", email: "jrago@firstrust.com", phone: "6107101267", recourse: "CASE BY CASE", contactPerson: "Joseph Rago", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 600, source: "Spreadsheet", spreadsheetRow: "R601", program: "united Capital", lender: "united Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["FL"], assets: ["Medical Office", "Retail-Multi Tenant", "Retail Single Tenant", "Hospital/Health Care"], status: "Active", email: "", phone: "3059757450", recourse: "CASE BY CASE", contactPerson: "Adam Titkin", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 601, source: "Spreadsheet", spreadsheetRow: "R602", program: "CalmWater Capital", lender: "CalmWater Capital", type: "Senior", minLoan: "$7,000,000", maxLoan: "$75,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "ryan@calmwatercapital.com", phone: "3109966610", recourse: "CASE BY CASE", contactPerson: "Ryan Altman", loanTerms: "", typeOfLoans: ["Acquisition", "New Development"], sponsorStates: [], notes: "" },
  { id: 602, source: "Spreadsheet", spreadsheetRow: "R603", program: "RMWC", lender: "RMWC", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "Stevenfischler@rmwc.com, michaelrubenstein@rmwc.com", phone: "9176755084, 4155900221", recourse: "CASE BY CASE", contactPerson: "Michael Rubenstein", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 603, source: "Spreadsheet", spreadsheetRow: "R604", program: "Benefit Street", lender: "Benefit Street", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 604, source: "Spreadsheet", spreadsheetRow: "R605", program: "AVANA CAPITAL", lender: "AVANA CAPITAL", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["all"], assets: ["Apartments", "Condos"], status: "Active", email: "trevor.terpening@avanacompanies.com", phone: "4432442504", recourse: "CASE BY CASE", contactPerson: "Trevor Terpening", loanTerms: "", typeOfLoans: ["Construction"], sponsorStates: [], notes: "" },
  { id: 605, source: "Spreadsheet", spreadsheetRow: "R606", program: "Valley Bank", lender: "Valley Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "pmagrane@valley.com", phone: "6107636597", recourse: "CASE BY CASE", contactPerson: "Patrick K Magrane", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 606, source: "Spreadsheet", spreadsheetRow: "R607", program: "cerebrus", lender: "cerebrus", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 607, source: "Spreadsheet", spreadsheetRow: "R608", program: "Cohen and Company", lender: "Cohen and Company", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "5168605927", recourse: "CASE BY CASE", contactPerson: "Jonathan Kohan", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 608, source: "Spreadsheet", spreadsheetRow: "R609", program: "Grant Street Capital", lender: "Grant Street Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 609, source: "Spreadsheet", spreadsheetRow: "R610", program: "Morrison Street Capital", lender: "Morrison Street Capital", type: "Senior", minLoan: "$2,000,000", maxLoan: "$15,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: ["Acquisition", "Refinance"], sponsorStates: [], notes: "" },
  { id: 610, source: "Spreadsheet", spreadsheetRow: "R611", program: "Green Barn investment group- MEZZ", lender: "Green Barn investment group- MEZZ", type: "Mezzanine", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "2678855940", recourse: "CASE BY CASE", contactPerson: "Peter Friedman", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 611, source: "Spreadsheet", spreadsheetRow: "R612", program: "Steeprock Capital-MEZZ", lender: "Steeprock Capital-MEZZ", type: "Mezzanine", minLoan: "$5,000,000", maxLoan: "$150,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "mitchell@steeprockcapital.com", phone: "2122185077", recourse: "CASE BY CASE", contactPerson: "Matt Mitchell", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 612, source: "Spreadsheet", spreadsheetRow: "R613", program: "Monolith Capital", lender: "Monolith Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Casino/Gaming", "Medical Office"], status: "Active", email: "john@monolithcapital.com", phone: "\"5163755558\", \"3059005747\"", recourse: "CASE BY CASE", contactPerson: "John Hohos", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 613, source: "Spreadsheet", spreadsheetRow: "R614", program: "Dunmor Capital", lender: "Dunmor Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 614, source: "Spreadsheet", spreadsheetRow: "R615", program: "EJS DEVELOPMENT", lender: "EJS DEVELOPMENT", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "rtunstall@ejsdev.com", phone: "2122871150", recourse: "CASE BY CASE", contactPerson: "Ryan Tunstall", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 615, source: "Spreadsheet", spreadsheetRow: "R616", program: "Keysite Capital Partners", lender: "Keysite Capital Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 616, source: "Spreadsheet", spreadsheetRow: "R617", program: "Penn Bank", lender: "Penn Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "2679223528", recourse: "CASE BY CASE", contactPerson: "Jeff DeCesare", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 617, source: "Spreadsheet", spreadsheetRow: "R618", program: "Manulife", lender: "Manulife", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "Thomas Tracy", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 618, source: "Spreadsheet", spreadsheetRow: "R619", program: "HillCrest Financial LLC", lender: "HillCrest Financial LLC", type: "Senior", minLoan: "$5,000,000", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "bwang@hillcrestfinancellc.com", phone: "9177415233", recourse: "CASE BY CASE", contactPerson: "Benjamin Wang", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 619, source: "Spreadsheet", spreadsheetRow: "R620", program: "STORMFIELD CAPITAL", lender: "STORMFIELD CAPITAL", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Loan Sales"], status: "Active", email: "", phone: "2037626094", recourse: "CASE BY CASE", contactPerson: "Wesley Carpenter", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 620, source: "Spreadsheet", spreadsheetRow: "R621", program: "BEB LENDING", lender: "BEB LENDING", type: "Senior", minLoan: "$2,000,000", maxLoan: "$25,000,000", maxLtv: "70%%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office"], status: "Active", email: "ssilverbrook@bebcapital.com", phone: "2159625720", recourse: "CASE BY CASE", contactPerson: "Sean Silverbrook", loanTerms: "", typeOfLoans: ["Value add"], sponsorStates: [], notes: "" },
  { id: 621, source: "Spreadsheet", spreadsheetRow: "R622", program: "BHI Lending", lender: "BHI Lending", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 622, source: "Spreadsheet", spreadsheetRow: "R623", program: "acrewood capital", lender: "acrewood capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "6462426489", recourse: "CASE BY CASE", contactPerson: "Jamie Barrett", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 623, source: "Spreadsheet", spreadsheetRow: "R624", program: "JbI realty", lender: "JbI realty", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "440-554-5136", recourse: "CASE BY CASE", contactPerson: "Mark Nasca", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 624, source: "Spreadsheet", spreadsheetRow: "R625", program: "Vertix Realty", lender: "Vertix Realty", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "Loan Sales"], status: "Active", email: "fhermosa@vertixgroup.com", phone: "786-443-9446", recourse: "CASE BY CASE", contactPerson: "Frank Hermosa", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 625, source: "Spreadsheet", spreadsheetRow: "R626", program: "Barlington Group", lender: "Barlington Group", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 626, source: "Spreadsheet", spreadsheetRow: "R627", program: "Peachtree Group", lender: "Peachtree Group", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "4045802193", recourse: "CASE BY CASE", contactPerson: "Jared Schlosser", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 627, source: "Spreadsheet", spreadsheetRow: "R628", program: "Maxim Capital Group", lender: "Maxim Capital Group", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "65%%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Loan Sales", "Land", "Self-storage", "Religious", "Hospital/Health Care"], status: "Active", email: "aglick@maximcapitalgroup.com", phone: "9175797386", recourse: "CASE BY CASE", contactPerson: "Adam glick", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 628, source: "Spreadsheet", spreadsheetRow: "R629", program: "Trez Capital", lender: "Trez Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "1", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "stuartm@trezcapital.com", phone: "206-724-7330", recourse: "CASE BY CASE", contactPerson: "Stuart MacFarland", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 629, source: "Spreadsheet", spreadsheetRow: "R630", program: "Arc PE", lender: "Arc PE", type: "Senior", minLoan: "$2,000,000", maxLoan: "$125,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "NOTE PURCHASE"], status: "Active", email: "dgordon@arcpe.com", phone: "6178515977", recourse: "CASE BY CASE", contactPerson: "David Gordin", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "Pref equity, note distressed purchases" },
  { id: 630, source: "Spreadsheet", spreadsheetRow: "R631", program: "Horn Eichenwald Investments", lender: "Horn Eichenwald Investments", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "3068600770", recourse: "CASE BY CASE", contactPerson: "Ricardo Eichenwald/Joseph Horn", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 631, source: "Spreadsheet", spreadsheetRow: "R632", program: "Highview Capital", lender: "Highview Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 632, source: "Spreadsheet", spreadsheetRow: "R633", program: "Karlin Asset Management", lender: "Karlin Asset Management", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 633, source: "Spreadsheet", spreadsheetRow: "R634", program: "Gate house capital", lender: "Gate house capital", type: "Senior", minLoan: "$10,000,000", maxLoan: "$100,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Loan Sales", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt"], status: "Active", email: "brian@gatehousecp.com", phone: "3104860040", recourse: "CASE BY CASE", contactPerson: "Brian Ursino", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 634, source: "Spreadsheet", spreadsheetRow: "R635", program: "New Wave Loans", lender: "New Wave Loans", type: "Senior", minLoan: "$1,000,000", maxLoan: "$50,000,000", maxLtv: "", minDscr: "N/A", states: ["Florida"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Loan Sales", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 635, source: "Spreadsheet", spreadsheetRow: "R636", program: "Lexington Capital Advisors", lender: "Lexington Capital Advisors", type: "Senior", minLoan: "$100,000", maxLoan: "$5,000,000", maxLtv: "", minDscr: "N/A", states: ["Florida"], assets: [], status: "Active", email: "gschecher@lexcapllc.net", phone: "5618436032", recourse: "CASE BY CASE", contactPerson: "Greg Schecher", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 636, source: "Spreadsheet", spreadsheetRow: "R637", program: "F2", lender: "F2", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 637, source: "Spreadsheet", spreadsheetRow: "R638", program: "IceCap Group", lender: "IceCap Group", type: "Senior", minLoan: "$50,000", maxLoan: "$10,000,000", maxLtv: "80%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Condos", "Senior Housing", "SFR Portfolio", "Mixed-use"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: ["Construction", "Value add"], sponsorStates: [], notes: "" },
  { id: 638, source: "Spreadsheet", spreadsheetRow: "R639", program: "Third Seven Capital", lender: "Third Seven Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "Paul Casey", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 639, source: "Spreadsheet", spreadsheetRow: "R640", program: "Fairbridge Asset Management LLC", lender: "Fairbridge Asset Management LLC", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed-use", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Loan Sales", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other"], status: "Active", email: "john@fairbridgellc.com, swissak@fairbridgellc.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Steven Wissak", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 640, source: "Spreadsheet", spreadsheetRow: "R641", program: "Millbrook Realty Capital", lender: "Millbrook Realty Capital", type: "Senior", minLoan: "$5,000,000", maxLoan: "$20,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed-use", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "NOTE PURCHASE", "Loan Sales", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other"], status: "Active", email: "marc@yprop.net", phone: "9176856440", recourse: "CASE BY CASE", contactPerson: "Marc Yassky", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 641, source: "Spreadsheet", spreadsheetRow: "R642", program: "M2 Equity Advisors", lender: "M2 Equity Advisors", type: "Senior", minLoan: "$5,000,000", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "mm@m2equity.com", phone: "445-942-1318", recourse: "CASE BY CASE", contactPerson: "Matthew McManus", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 642, source: "Spreadsheet", spreadsheetRow: "R643", program: "Romspen Investment Corp", lender: "Romspen Investment Corp", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 643, source: "Spreadsheet", spreadsheetRow: "R644", program: "Rialto Capital", lender: "Rialto Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 644, source: "Spreadsheet", spreadsheetRow: "R645", program: "Red Fox Capital", lender: "Red Fox Capital", type: "Senior", minLoan: "$500,000", maxLoan: "$20,000,000", maxLtv: "75%", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Land"], status: "Active", email: "mark@redfoxcapital.us", phone: "6109523958", recourse: "CASE BY CASE", contactPerson: "Mark Dawejko", loanTerms: "", typeOfLoans: ["Acquisition", "Construction", "Value add", "New Development"], sponsorStates: [], notes: "" },
  { id: 645, source: "Spreadsheet", spreadsheetRow: "R646", program: "Poppy Bank", lender: "Poppy Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 646, source: "Spreadsheet", spreadsheetRow: "R647", program: "Pacific Coast Capital Partners", lender: "Pacific Coast Capital Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 647, source: "Spreadsheet", spreadsheetRow: "R648", program: "Northwind Group", lender: "Northwind Group", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 648, source: "Spreadsheet", spreadsheetRow: "R649", program: "Newcrestimage", lender: "Newcrestimage", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 649, source: "Spreadsheet", spreadsheetRow: "R650", program: "Newbond", lender: "Newbond", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 650, source: "Spreadsheet", spreadsheetRow: "R651", program: "Morgan Stanley", lender: "Morgan Stanley", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 651, source: "Spreadsheet", spreadsheetRow: "R652", program: "Metlife", lender: "Metlife", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 652, source: "Spreadsheet", spreadsheetRow: "R653", program: "Mavik Capital Management", lender: "Mavik Capital Management", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 653, source: "Spreadsheet", spreadsheetRow: "R654", program: "Marathon Asset Management", lender: "Marathon Asset Management", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 654, source: "Spreadsheet", spreadsheetRow: "R655", program: "Lightstone Capital", lender: "Lightstone Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 655, source: "Spreadsheet", spreadsheetRow: "R656", program: "Lasalle", lender: "Lasalle", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 656, source: "Spreadsheet", spreadsheetRow: "R657", program: "Knighthead Funding", lender: "Knighthead Funding", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 657, source: "Spreadsheet", spreadsheetRow: "R658", program: "Hall structured finance", lender: "Hall structured finance", type: "Senior", minLoan: "$20,000,000", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Land", "Hospital/Health Care"], status: "Active", email: "bmitchell@hallstructured.com", phone: "2142699538", recourse: "CASE BY CASE", contactPerson: "Brian Mitchell", loanTerms: "", typeOfLoans: ["Acquisition", "Construction", "Value add", "New Development", "Redevelopment"], sponsorStates: [], notes: "" },
  { id: 658, source: "Spreadsheet", spreadsheetRow: "R659", program: "Goldman Sachs - large loans", lender: "Goldman Sachs - large loans", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 659, source: "Spreadsheet", spreadsheetRow: "R660", program: "Elsee Partners", lender: "Elsee Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 660, source: "Spreadsheet", spreadsheetRow: "R661", program: "Customers Bank", lender: "Customers Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 661, source: "Spreadsheet", spreadsheetRow: "R662", program: "CSG Investment", lender: "CSG Investment", type: "Senior", minLoan: "$50,000,000", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 662, source: "Spreadsheet", spreadsheetRow: "R663", program: "AIG/Corebridge", lender: "AIG/Corebridge", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 663, source: "Spreadsheet", spreadsheetRow: "R664", program: "Cathay Bank", lender: "Cathay Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 664, source: "Spreadsheet", spreadsheetRow: "R665", program: "CalmWater Capital", lender: "CalmWater Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 665, source: "Spreadsheet", spreadsheetRow: "R666", program: "Benefit Street Partners", lender: "Benefit Street Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 666, source: "Spreadsheet", spreadsheetRow: "R667", program: "Arrowmark Partners", lender: "Arrowmark Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 667, source: "Spreadsheet", spreadsheetRow: "R668", program: "Argentic", lender: "Argentic", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 668, source: "Spreadsheet", spreadsheetRow: "R669", program: "Ardent", lender: "Ardent", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 669, source: "Spreadsheet", spreadsheetRow: "R670", program: "Acore Capital", lender: "Acore Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 670, source: "Spreadsheet", spreadsheetRow: "R671", program: "Access Point Financial", lender: "Access Point Financial", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 671, source: "Spreadsheet", spreadsheetRow: "R672", program: "A10 Capital", lender: "A10 Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 672, source: "Spreadsheet", spreadsheetRow: "R673", program: "3650 Reit", lender: "3650 Reit", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 673, source: "Spreadsheet", spreadsheetRow: "R674", program: "Bloomfield Capital", lender: "Bloomfield Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 674, source: "Spreadsheet", spreadsheetRow: "R675", program: "Tishman Speyer", lender: "Tishman Speyer", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 675, source: "Spreadsheet", spreadsheetRow: "R676", program: "OWS Real estate finance", lender: "OWS Real estate finance", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 676, source: "Spreadsheet", spreadsheetRow: "R677", program: "KSL Capital", lender: "KSL Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 677, source: "Spreadsheet", spreadsheetRow: "R678", program: "Fillmore Capital partners", lender: "Fillmore Capital partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 678, source: "Spreadsheet", spreadsheetRow: "R679", program: "Western Southern", lender: "Western Southern", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 679, source: "Spreadsheet", spreadsheetRow: "R680", program: "Ballast Point Capital", lender: "Ballast Point Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 680, source: "Spreadsheet", spreadsheetRow: "R681", program: "Atalaya", lender: "Atalaya", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 681, source: "Spreadsheet", spreadsheetRow: "R682", program: "AEW capital mangement LP", lender: "AEW capital mangement LP", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 682, source: "Spreadsheet", spreadsheetRow: "R683", program: "Synovus Bank", lender: "Synovus Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 683, source: "Spreadsheet", spreadsheetRow: "R684", program: "Rockbridge", lender: "Rockbridge", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 684, source: "Spreadsheet", spreadsheetRow: "R685", program: "Industrial and Commercial Bank of china", lender: "Industrial and Commercial Bank of china", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 685, source: "Spreadsheet", spreadsheetRow: "R686", program: "HB TITAN", lender: "HB TITAN", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 686, source: "Spreadsheet", spreadsheetRow: "R687", program: "Greystone Monticello", lender: "Greystone Monticello", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 687, source: "Spreadsheet", spreadsheetRow: "R688", program: "Grant Street Funding", lender: "Grant Street Funding", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 688, source: "Spreadsheet", spreadsheetRow: "R689", program: "First National Bank of Omaha", lender: "First National Bank of Omaha", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 689, source: "Spreadsheet", spreadsheetRow: "R690", program: "Driftwood Capotal;", lender: "Driftwood Capotal;", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 690, source: "Spreadsheet", spreadsheetRow: "R691", program: "Centential Bank (my 100 bank)", lender: "Centential Bank (my 100 bank)", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 691, source: "Spreadsheet", spreadsheetRow: "R692", program: "Blackrock", lender: "Blackrock", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 692, source: "Spreadsheet", spreadsheetRow: "R693", program: "Bleach Point Capital Management", lender: "Bleach Point Capital Management", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 693, source: "Spreadsheet", spreadsheetRow: "R694", program: "Axos Bank", lender: "Axos Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 694, source: "Spreadsheet", spreadsheetRow: "R695", program: "Arena Investors", lender: "Arena Investors", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 695, source: "Spreadsheet", spreadsheetRow: "R696", program: "ABP Capital", lender: "ABP Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 696, source: "Spreadsheet", spreadsheetRow: "R697", program: "AB Carval", lender: "AB Carval", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 697, source: "Spreadsheet", spreadsheetRow: "R698", program: "25 Capital Partners", lender: "25 Capital Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 698, source: "Spreadsheet", spreadsheetRow: "R699", program: "WM Capital", lender: "WM Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 699, source: "Spreadsheet", spreadsheetRow: "R700", program: "Timbercreek Capital", lender: "Timbercreek Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 700, source: "Spreadsheet", spreadsheetRow: "R701", program: "Sommeri Investment Management", lender: "Sommeri Investment Management", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 701, source: "Spreadsheet", spreadsheetRow: "R702", program: "Fifth Third Bank", lender: "Fifth Third Bank", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 702, source: "Spreadsheet", spreadsheetRow: "R703", program: "Avant Capial", lender: "Avant Capial", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Hotel/Hospitality"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "Bernard", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 703, source: "Spreadsheet", spreadsheetRow: "R704", program: "W fiancnail", lender: "W fiancnail", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 704, source: "Spreadsheet", spreadsheetRow: "R705", program: "Signature Capital Advisors", lender: "Signature Capital Advisors", type: "Senior", minLoan: "$200,000", maxLoan: "$2,000,000", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos"], status: "Active", email: "David.Clark@Sigcapitaladvisors.com", phone: "", recourse: "CASE BY CASE", contactPerson: "David clark", loanTerms: "", typeOfLoans: ["Acquisition", "Construction", "Value add", "New Development"], sponsorStates: [], notes: "" },
  { id: 705, source: "Spreadsheet", spreadsheetRow: "R706", program: "Ease Capital", lender: "Ease Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 706, source: "Spreadsheet", spreadsheetRow: "R707", program: "Monarch Alternative Capital", lender: "Monarch Alternative Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "michael.weinstock@monarchlp.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Michael Weinstock", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 707, source: "Spreadsheet", spreadsheetRow: "R708", program: "Glacier Global Partners", lender: "Glacier Global Partners", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 708, source: "Spreadsheet", spreadsheetRow: "R709", program: "CP Group- (Crocker Partners)", lender: "CP Group- (Crocker Partners)", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 709, source: "Spreadsheet", spreadsheetRow: "R710", program: "PCCP", lender: "PCCP", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "3105244754", recourse: "CASE BY CASE", contactPerson: "Brad Hartstein", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 710, source: "Spreadsheet", spreadsheetRow: "R711", program: "Madison Realty Capital", lender: "Madison Realty Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "2019254668", recourse: "CASE BY CASE", contactPerson: "Marc Zegen", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 711, source: "Spreadsheet", spreadsheetRow: "R712", program: "ARDENT REALTY CAPITAL", lender: "ARDENT REALTY CAPITAL", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "6784258629; 7704508745 XT108", recourse: "CASE BY CASE", contactPerson: "MICHELLE FOWLER", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 712, source: "Spreadsheet", spreadsheetRow: "R713", program: "Trigate capital", lender: "Trigate capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Retail-Multi Tenant", "Retail Single Tenant"], status: "Active", email: "jobenhaus@trigatecapital.com", phone: "2146153370", recourse: "CASE BY CASE", contactPerson: "Jason Obenhaus", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 713, source: "Spreadsheet", spreadsheetRow: "R714", program: "Interport Capital", lender: "Interport Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "3037991732", recourse: "CASE BY CASE", contactPerson: "Zach Lane", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 714, source: "Spreadsheet", spreadsheetRow: "R715", program: "Coulton creek Capital", lender: "Coulton creek Capital", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "whensley@ccrcapital.com", phone: "", recourse: "CASE BY CASE", contactPerson: "Will Hensley", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 715, source: "Spreadsheet", spreadsheetRow: "R716", program: "TALMAR FINANCIAL", lender: "TALMAR FINANCIAL", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 716, source: "Spreadsheet", spreadsheetRow: "R717", program: "HANKEY CAPITAL", lender: "HANKEY CAPITAL", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed-use", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality", "NOTE PURCHASE"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" },
  { id: 717, source: "Spreadsheet", spreadsheetRow: "R718", program: "CROSS RIVER BANK", lender: "CROSS RIVER BANK", type: "Senior", minLoan: "", maxLoan: "", maxLtv: "", minDscr: "N/A", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"], assets: ["Apartments", "NOTE PURCHASE"], status: "Active", email: "", phone: "", recourse: "CASE BY CASE", contactPerson: "", loanTerms: "", typeOfLoans: [], sponsorStates: [], notes: "" }
];

const assetTypes = ["Equipment, Autos, or Other Non Real Estate Products", "Apartments", "Condos", "Senior Housing", "Student Housing", "Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed Use", "Lt Industrial", "Cannabis", "Retail - Multi Tenant", "Retail - Single Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other"];
const capitalTypes = ["Senior", "Mezzanine", "Preferred Equity", "JV Equity", "Line of Credit", "Note on Note", "Loan Sales", "C&I", "Stretch Senior/Hybrid"];
const dealTypes = ["Construction", "Value add", "New Development", "Bridge", "Takeout", "Investment"];
const ownershipStatuses = ["Acquisition", "Refinance"];
const refinanceTypes = ["Cash Out to Borrower", "Cash Out-Value Add", "Rate and Term"];
const recourseOptions = ["FULL", "NON RECOURSE", "CASE BY CASE"];
const marketOptions = ["US", "INTERNATIONAL"];
const allStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const unitAssets = ["Apartments", "Condos", "Hotel/Hospitality", "Hotel/Hospitality-Flag Required", "Hotel/Hospitality-Private or No Flag", "Gaming", "Casino/Gaming", "Student Housing", "Self-storage"];
const retailAssets = ["Retail - Multi Tenant", "Retail - Single Tenant"];
const typeOfLoanOptions = ["Acquisition", "Construction", "Value add", "New Development", "Redevelopment", "Refinance", "Note on Note", "Loan Purchases", "C&I"];
const programTypeOptions = ["Refinance", "Acquisition", "Construction", "Land", "Fannie/Freddie", "HUD", "Small Balance", "Interest-only", "Cannabis"];
const typeOfLenderOptions = ["Bridge", "Conventional", "Local Bank", "CMBS", "Fannie/Freddie", "Small Balance", "Family Office", "Private Lender", "Hard Money", "C&I", "JV", "Non-conventional", "Regional Bank", "Balance Sheet", "Investment Bank"];

const lenderPropertyTypeOptions = ["Apartments", "Condos", "Senior Housing", "Student Housing", "Casino/Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed-use", "Light Industrial", "Cannabis", "Retail-Multi Tenant", "Retail Single Tenant", "Hotel/Hospitality-Flag Required", "Hotel/Hospitality-Private or No Flag", "NOTE PURCHASE", "Loan Sales", "Land", "Self-storage", "Religious", "Hospital/Health Care"];

const loanTermOptions = ["Less than 1 year", "1 year", "2 year", "3 year", "5 year", "7 year", "10 year", "15 year", "20 year", "30 year", "35 year", "40 year+"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrency(v: string) { return Number(String(v || "0").replace(/[^0-9.]/g, "")); }
function formatCurrencyInput(v: string) {
  const digits = String(v || "").replace(/[^0-9.]/g, "");
  if (!digits) return "";
  const [whole, decimal] = digits.split(".");
  return `$${decimal !== undefined ? `${Number(whole||0).toLocaleString("en-US")}.${decimal.slice(0,2)}` : Number(whole||0).toLocaleString("en-US")}`;
}
function formatPercent(v: number) { if (!Number.isFinite(v) || !isFinite(v) || v === 0) return "—"; return `${v.toFixed(1)}%`; }
function matchLabel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 80) return { label: "Excellent Match", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (score >= 60) return { label: "Strong Match", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" };
  if (score >= 40) return { label: "Good Match", color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10", border: "border-[#c9a84c]/30" };
  return { label: "Possible Match", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" };
}
function normalizeRecourse(v: string) { return v === "SELECTIVE" || !v ? "CASE BY CASE" : v; }
function blankAddress(): AssetAddress { return { street: "", unit: "", city: "", state: "", zip: "" }; }
function blankAsset(id: number): AssetData {
  return { id, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower", assetType: "Apartments", loanAmount: "", seniorLoanAmount: "", subordinateAmount: "", propertyValue: "", purchasePrice: "", currentLoanAmount: "", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "", manualLtv: "", dscr: "", currentRate: "", purchaseYear: String(new Date().getFullYear()), fullyEntitled: undefined, currentPropertyValue: "", additionalEquity: "", selectedStates: [], recourseType: "CASE BY CASE", numUnits: "", numBuildings: "", numAcres: "", retailUnits: [{ id: 1, tenant: "", rent: "", sqft: "" }], address: blankAddress() };
}
function blankLenderForm(): NewLenderForm {
  return { programName: "", contactPerson: "", email: "", phone: "", website: "", typeOfLenders: [], typeOfLoans: [], programTypes: [], propertyTypes: [], loanTerms: [], notes: "", minLoan: "", maxLoan: "", maxLtv: "", targetStates: [], sponsorStates: [], recourse: "CASE BY CASE", capitalTypes: [], capitalTypePrograms: [], contacts: [], status: "Active" };
}
function subordinateLabel(ct: string) {
  if (ct === "Mezzanine") return "Mezzanine Amount";
  if (ct === "Preferred Equity") return "Preferred Equity Amount";
  if (ct === "JV Equity") return "JV Equity Amount";
  return "Subordinate Capital Amount";
}
function calcMetrics(asset: AssetData, capitalType: string) {
  const isSubCap = ["Mezzanine", "Preferred Equity", "JV Equity"].includes(capitalType);
  const isConstruction = asset.dealType === "Construction";
  const isNewDev = asset.dealType === "New Development";
  const isProjectDealType = isConstruction || isNewDev; // both use project cost matrix
  const isAcquisition = asset.ownershipStatus === "Acquisition";
  const isRefinance = asset.ownershipStatus === "Refinance";
  const isAcqNonConst = isAcquisition && !isConstruction;
  const projTotal = parseCurrency(asset.landCost) + parseCurrency(asset.softCosts) + parseCurrency(asset.originationClosingCosts) + parseCurrency(asset.hardCosts) + parseCurrency(asset.carryingCosts);
  const acqConstLoan = Math.max(0, projTotal - parseCurrency(asset.additionalEquity || "") - parseCurrency(asset.borrowerEquity));
  const effectiveAmt = isProjectDealType && isAcquisition ? acqConstLoan : isSubCap ? parseCurrency(asset.subordinateAmount) : parseCurrency(asset.loanAmount);
  const seniorAmt = parseCurrency(asset.seniorLoanAmount);
  const propVal = parseCurrency(asset.propertyValue);
  const purchaseVal = parseCurrency(asset.purchasePrice);
  const newLoanAmt = parseCurrency(asset.loanAmount);
  const curLoanAmt = parseCurrency(asset.currentLoanAmount);
  const totalCap = isSubCap ? seniorAmt + effectiveAmt : effectiveAmt;
  const seniorLoanForLtv = isSubCap ? seniorAmt : newLoanAmt;
  const seniorLtv = propVal > 0 && seniorLoanForLtv > 0 ? (seniorLoanForLtv / propVal) * 100 : 0;
  const autoLtv = propVal > 0 ? (totalCap / propVal) * 100 : 0;
  const equityPct = propVal > 0 ? (parseCurrency(asset.borrowerEquity) / propVal) * 100 : 0;
  const cashOut = Math.max(0, newLoanAmt - curLoanAmt);
  // Construction & New Development LTC: (Total Costs − Additional Equity) ÷ Total Costs
  // Regular acquisition LTC: Loan ÷ Purchase Price
  let seniorLtc = 0;
  if (isProjectDealType) {
    const landCost = parseCurrency(asset.landCost || "");
    const hardCosts = parseCurrency(asset.hardCosts || "");
    const softCosts = parseCurrency(asset.softCosts || "");
    const closingCosts = parseCurrency(asset.originationClosingCosts || "");
    const carryCosts = parseCurrency(asset.carryingCosts || "");
    const addlEquity = parseCurrency((asset as any).additionalEquity || "");
    const totalProjectCost = (isConstruction ? landCost : purchaseVal) + hardCosts + softCosts + closingCosts + carryCosts;
    const netCost = Math.max(0, totalProjectCost - addlEquity);
    seniorLtc = totalProjectCost > 0 ? (netCost / totalProjectCost) * 100 : 0;
  } else {
    seniorLtc = purchaseVal > 0 && seniorLoanForLtv > 0 ? (seniorLoanForLtv / purchaseVal) * 100 : 0;
  }
  return { effectiveAmt, totalCap, seniorLtv, autoLtv, equityPct, cashOut, seniorLtc, isSubCap, isConstruction, isAcquisition, isRefinance, isAcqNonConst, acqConstLoan, isNewDev, isProjectDealType };
}

// Advisor matching logic
function assignAdvisors(capitalType: string, teamMembers: TeamMember[]): TeamMember[] {
  const specialists = teamMembers.filter(m => m.specialtyAreas.includes(capitalType));
  const pool = specialists.length > 0 ? specialists : teamMembers;
  if (pool.length === 0) return [];
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return [picked];
}

async function parseDeadWithAI(description: string, capitalTypeHint: string): Promise<Partial<AssetData>> {
  try {
    const response = await fetch("/api/parse-deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, capitalType: capitalTypeHint }),
    });
    if (!response.ok) return {};
    return await response.json();
  } catch { return {}; }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: any }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#c9a84c]/20 bg-[#0a1f44] p-6">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full -translate-y-8 translate-x-8" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold underline">{title}</div>
          <div className="mt-3 text-3xl font-bold text-white">{value}</div>
          <div className="mt-2 text-sm text-gray-300">{detail}</div>
        </div>
        <div className="rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 p-3 text-[#c9a84c]"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function CheckboxGroup({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wide">{label}</label>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])} className="accent-[#0a1f44] w-3.5 h-3.5" />
            <span className={selected.includes(opt) ? "text-[#0a1f44] font-semibold" : "text-gray-600"}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DropdownCheckbox({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase tracking-wide">{label}</label>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm text-left hover:border-[#0a1f44]/40 transition-all">
        <span className={selected.length > 0 ? "text-[#0a1f44] font-medium" : "text-gray-400"}>
          {selected.length === 0 ? `Select ${label}...` : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-[100] mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500 font-medium">{selected.length} selected</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => onChange(options)} className="text-xs text-[#0a1f44] font-medium hover:underline">All</button>
              <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:underline">Clear</button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-2">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2.5 px-2 py-1.5 text-xs cursor-pointer rounded-lg hover:bg-gray-50">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])} className="accent-[#0a1f44] w-3.5 h-3.5 flex-shrink-0" />
                <span className={selected.includes(opt) ? "text-[#0a1f44] font-semibold" : "text-gray-600"}>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StateSelector({ label, selected, onChange }: { label: string; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wide">{label}</label>
      <div className="mb-2 flex gap-2">
        <button type="button" onClick={() => onChange(allStates)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">Select All</button>
        <button type="button" onClick={() => onChange([])} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">Clear</button>
        <span className="ml-auto text-xs text-gray-400 self-center">{selected.length} selected</span>
      </div>
      <div className="grid max-h-32 grid-cols-6 gap-1.5 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
        {allStates.map((s) => (
          <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={selected.includes(s)} onChange={() => onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s])} className="accent-[#0a1f44]" />
            <span className="text-gray-600">{s}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function AddressFields({ address, onChange, inputClass }: { address: AssetAddress; onChange: (a: AssetAddress) => void; inputClass: string }) {
  function upd(field: keyof AssetAddress, value: string) { onChange({ ...address, [field]: value }); }
  return (
    <div className="md:col-span-2">
      <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-bold mb-3">Property Address</div>
      <div className="grid gap-3">
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-3"><label className="text-xs text-gray-500 mb-1 block font-medium">Street Address</label><Input value={address.street} onChange={(e) => upd("street", e.target.value)} placeholder="123 Main St" className={inputClass} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Unit #</label><Input value={address.unit} onChange={(e) => upd("unit", e.target.value)} placeholder="4B" className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium">City</label><Input value={address.city} onChange={(e) => upd("city", e.target.value)} placeholder="Miami" className={inputClass} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block font-medium">State</label><Input value={address.state} onChange={(e) => upd("state", e.target.value)} placeholder="FL" className={inputClass} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Zip</label><Input value={address.zip} onChange={(e) => upd("zip", e.target.value)} placeholder="33101" className={inputClass} /></div>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Form ───────────────────────────────────────────────────────────────

function AssetForm({ asset, capitalType, onUpdate, tenantDatabase, onTenantAdd, inputClass, selectTriggerClass }: { asset: AssetData; capitalType: string; onUpdate: (updated: AssetData) => void; tenantDatabase: string[]; onTenantAdd: (name: string) => void; inputClass: string; selectTriggerClass: string }) {
  const m = calcMetrics(asset, capitalType);
  function upd(field: keyof AssetData, value: any) { onUpdate({ ...asset, [field]: value }); }
  const showUnits = unitAssets.includes(asset.assetType);
  const showRetail = retailAssets.includes(asset.assetType);
  const showAcres = asset.assetType === "Land";
  const netIncome = parseCurrency(asset.currentNetIncome);
  const propVal = parseCurrency(asset.propertyValue);
  const capRate = netIncome > 0 && propVal > 0 ? (netIncome / propVal) * 100 : 0;
  const metricBoxes: [string, string][] = [["Senior LTV", formatPercent(m.seniorLtv)]];
  if (m.isAcqNonConst && parseCurrency(asset.purchasePrice) > 0) metricBoxes.push([m.isNewDev || m.isConstruction ? "LTC" : "Senior LTC", formatPercent(m.seniorLtc)]);
  if (m.isRefinance && (asset.refinanceType === "Cash Out to Borrower" || asset.refinanceType === "Cash Out-Value Add")) {
    metricBoxes.push(["Net Cash Out", m.cashOut > 0 ? formatCurrencyInput(String(m.cashOut)) : "—"]);
  }
  metricBoxes.push([m.isSubCap ? "Subordinated LTV - Last Dollar" : "Subordinated Last $ LTV", m.isSubCap ? formatPercent(m.autoLtv) : "N/A"]);
  metricBoxes.push(["Total Capital", formatCurrencyInput(String(m.totalCap || 0))]);
  metricBoxes.push(["Equity %", formatPercent(m.equityPct)]);
  metricBoxes.push(["Cap Rate", capRate > 0 ? formatPercent(capRate) : "—"]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AddressFields address={asset.address || blankAddress()} onChange={(a) => upd("address", a)} inputClass={inputClass} />
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Ownership Status</label><Select value={asset.ownershipStatus} onValueChange={(v) => upd("ownershipStatus", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{ownershipStatuses.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="text-xs text-gray-500 font-medium uppercase">Deal Type</label>
          <div className="relative group">
            <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold cursor-help">i</div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-[#0a1f44] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg">
              Most transactions are considered "Investment"
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0a1f44]" />
            </div>
          </div>
        </div>
        <Select value={asset.dealType} onValueChange={(v) => upd("dealType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{dealTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
      </div>
      {asset.ownershipStatus === "Refinance" && (<div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Refinance Type</label><Select value={asset.refinanceType} onValueChange={(v) => upd("refinanceType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{refinanceTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>)}
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Asset Type</label><Select value={asset.assetType} onValueChange={(v) => upd("assetType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{assetTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      {showUnits && (<><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Units</label><Input value={asset.numUnits} onChange={(e) => upd("numUnits", e.target.value)} placeholder="e.g. 120" className={inputClass} /></div><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Buildings</label><Input value={asset.numBuildings} onChange={(e) => upd("numBuildings", e.target.value)} placeholder="e.g. 4" className={inputClass} /></div></>)}
      {showAcres && (<div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Acres</label><Input value={asset.numAcres} onChange={(e) => upd("numAcres", e.target.value)} placeholder="e.g. 12.5" className={inputClass} /></div>)}
      {showRetail && (
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3"><label className="text-xs text-gray-500 font-bold uppercase">Retail Units</label><button onClick={() => onUpdate({ ...asset, retailUnits: [...asset.retailUnits, { id: asset.retailUnits.length + 1, tenant: "", rent: "", sqft: "" }] })} className="flex items-center gap-1 px-3 py-1 text-xs bg-[#0a1f44] text-white rounded-lg"><Plus className="h-3 w-3" /> Add Unit</button></div>
          <div className="space-y-3">{asset.retailUnits.map((unit, idx) => (<div key={unit.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-[#0a1f44]">Unit {idx + 1}</span>{asset.retailUnits.length > 1 && <button onClick={() => onUpdate({ ...asset, retailUnits: asset.retailUnits.filter((u) => u.id !== unit.id) })} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}</div><div className="grid gap-2 md:grid-cols-3"><div><label className="text-xs text-gray-400 mb-1 block">Tenant Name</label><input list={`t-${unit.id}`} value={unit.tenant} onChange={(e) => { const units = asset.retailUnits.map((u) => u.id === unit.id ? { ...u, tenant: e.target.value } : u); onUpdate({ ...asset, retailUnits: units }); if (e.target.value.trim().length > 2) onTenantAdd(e.target.value.trim()); }} placeholder="Tenant name" className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#0a1f44]" /><datalist id={`t-${unit.id}`}>{tenantDatabase.map((t) => <option key={t} value={t} />)}</datalist></div><div><label className="text-xs text-gray-400 mb-1 block">Monthly Rent</label><Input value={unit.rent} onChange={(e) => { const units = asset.retailUnits.map((u) => u.id === unit.id ? { ...u, rent: formatCurrencyInput(e.target.value) } : u); onUpdate({ ...asset, retailUnits: units }); }} placeholder="$0" className={inputClass} /></div><div><label className="text-xs text-gray-400 mb-1 block">Square Footage</label><Input value={unit.sqft} onChange={(e) => { const units = asset.retailUnits.map((u) => u.id === unit.id ? { ...u, sqft: e.target.value } : u); onUpdate({ ...asset, retailUnits: units }); }} placeholder="e.g. 2,400" className={inputClass} /></div></div></div>))}</div>
        </div>
      )}
      {m.isRefinance && (<div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Loan Amount</label><Input value={asset.currentLoanAmount} onChange={(e) => upd("currentLoanAmount", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>)}
      {m.isRefinance && (asset.refinanceType === "Cash Out to Borrower" || asset.refinanceType === "Cash Out-Value Add") && asset.currentLoanAmount && asset.loanAmount && (
        <div className="md:col-span-2">
          <div className={`rounded-xl border p-4 ${m.cashOut > 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${m.cashOut > 0 ? "text-emerald-700" : "text-red-600"}`}>Net Cash Out to Borrower</div>
                <div className="text-xs text-gray-500">New Loan ({asset.loanAmount}) − Current Loan ({asset.currentLoanAmount})</div>
              </div>
              <div className={`text-2xl font-bold ${m.cashOut > 0 ? "text-emerald-700" : "text-red-600"}`}>
                {m.cashOut > 0 ? formatCurrencyInput(String(m.cashOut)) : "Negative / No Cash Out"}
              </div>
            </div>
          </div>
        </div>
      )}
      {m.isAcqNonConst && (<div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Price</label><Input value={asset.purchasePrice} onChange={(e) => upd("purchasePrice", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>)}

      {/* New Development + Refinance extra fields */}
      {m.isRefinance && asset.dealType === "New Development" && (() => {
        const purchasePrice = parseCurrency(asset.purchasePrice);
        const curLoan       = parseCurrency(asset.currentLoanAmount);
        const hardCosts     = parseCurrency(asset.hardCosts || "");
        const softCosts     = parseCurrency(asset.softCosts || "");
        const closingCosts  = parseCurrency(asset.originationClosingCosts || "");
        const carryCosts    = parseCurrency(asset.carryingCosts || "");
        const addlEquity    = parseCurrency(asset.additionalEquity || "");
        const curPropVal    = parseCurrency(asset.currentPropertyValue || "");
        const arv           = parseCurrency(asset.propertyValue || "");
        // Total project cost minus equity contributions
        const totalProjectCost = purchasePrice + hardCosts + softCosts + closingCosts + carryCosts;
        const netCost          = Math.max(0, totalProjectCost - addlEquity);
        const suggestedLoan    = netCost;
        const curLoanAmt       = parseCurrency(asset.loanAmount || "");
        // LTC = (Total Costs − Equity) ÷ Total Costs
        const ltc = totalProjectCost > 0 ? (netCost / totalProjectCost) * 100 : 0;
        const ltv = arv > 0 && curLoanAmt > 0 ? (curLoanAmt / arv) * 100 : 0;
        const curEquity = curPropVal > 0 ? curPropVal - curLoan : null;

        return (
          <div className="md:col-span-2 rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-5 space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold">New Development — Project Details</div>

            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Price</label><Input value={asset.purchasePrice} onChange={(e) => upd("purchasePrice", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Year</label><Input value={asset.purchaseYear || ""} onChange={(e) => upd("purchaseYear", e.target.value)} placeholder="Optional" className={inputClass} /></div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">Are all units fully entitled?</label>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => upd("fullyEntitled", opt)}
                    className={`p-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${asset.fullyEntitled === opt ? (opt === "yes" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-400 bg-red-50 text-red-600") : "border-gray-200 text-gray-500 hover:border-[#0a1f44]/30"}`}>
                    {opt === "yes" ? "✓ Yes" : "✕ No"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {([
                ["Total Hard Costs", "hardCosts"],
                ["Total Soft Costs", "softCosts"],
                ["Total Closing Costs", "originationClosingCosts"],
                ["Total Carry Costs", "carryingCosts"],
              ] as [string, keyof AssetData][]).map(([label, field]) => (
                <div key={field}><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{label}</label><Input value={String(asset[field] || "")} onChange={(e) => upd(field, formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Property Value</label><Input value={asset.currentPropertyValue || ""} onChange={(e) => upd("currentPropertyValue", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Additional Equity Contributions</label>
                <Input value={asset.additionalEquity || ""} onChange={(e) => {
                  const val = formatCurrencyInput(e.target.value);
                  upd("additionalEquity", val);
                }} placeholder="$0" className={inputClass} />
                <div className="text-xs text-gray-400 mt-1">Subtracted from total project cost</div>
              </div>
            </div>

            {/* Current Equity */}
            {curPropVal > 0 && curLoan > 0 && (
              <div className={`rounded-xl border p-4 ${curEquity! >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${curEquity! >= 0 ? "text-emerald-700" : "text-red-600"}`}>Current Equity in Property</div>
                    <div className="text-xs text-gray-500">Current Value ({formatCurrencyInput(String(curPropVal))}) − Current Indebtedness ({formatCurrencyInput(String(curLoan))})</div>
                  </div>
                  <div className={`text-2xl font-bold ${curEquity! >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {curEquity! >= 0 ? formatCurrencyInput(String(curEquity!)) : `(${formatCurrencyInput(String(Math.abs(curEquity!)))})`}
                  </div>
                </div>
              </div>
            )}

            {/* Suggested loan breakdown */}
            {totalProjectCost > 0 && (
              <div className="rounded-xl border-2 border-[#0a1f44]/20 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-[#c9a84c] mb-3">Total New Development Loan Calculation</div>
                <div className="space-y-1.5 mb-3">
                  {[
                    ["Purchase Price", purchasePrice],
                    ["Total Hard Costs", hardCosts],
                    ["Total Soft Costs", softCosts],
                    ["Total Closing Costs", closingCosts],
                    ["Total Carry Costs", carryCosts],
                  ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                    <div key={String(label)} className="flex justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-[#0a1f44]">+ {formatCurrencyInput(String(val))}</span>
                    </div>
                  ))}
                  {addlEquity > 0 && (
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span className="font-medium">Additional Equity (deducted)</span>
                      <span className="font-bold">− {formatCurrencyInput(String(addlEquity))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#0a1f44] pt-2 border-t border-gray-200">
                    <span>Suggested Loan Amount</span>
                    <span className="text-[#c9a84c]">{formatCurrencyInput(String(suggestedLoan))}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => upd("loanAmount", formatCurrencyInput(String(suggestedLoan)))}
                  className="w-full py-2 text-xs font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 mb-3"
                >
                  Use This Amount ↓
                </button>
                {/* LTC / LTV */}
                {totalProjectCost > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    {ltc > 0 && <div className="rounded-lg bg-gray-50 p-2 text-center"><div className="text-xs text-gray-400 mb-0.5">LTC</div><div className="text-sm font-bold text-[#0a1f44]">{ltc.toFixed(1)}%</div><div className="text-xs text-gray-400">(Costs − Equity) ÷ Costs</div></div>}
                    {ltv > 0 && <div className="rounded-lg bg-gray-50 p-2 text-center"><div className="text-xs text-gray-400 mb-0.5">LTV (on ARV)</div><div className="text-sm font-bold text-[#0a1f44]">{ltv.toFixed(1)}%</div></div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
      {/* New Development + Acquisition extra fields */}
      {m.isAcquisition && asset.dealType === "New Development" && (() => {
        const purchasePrice = parseCurrency(asset.purchasePrice);
        const hardCosts     = parseCurrency(asset.hardCosts || "");
        const softCosts     = parseCurrency(asset.softCosts || "");
        const closingCosts  = parseCurrency(asset.originationClosingCosts || "");
        const carryCosts    = parseCurrency(asset.carryingCosts || "");
        const addlEquity    = parseCurrency(asset.additionalEquity || "");
        const arv           = parseCurrency(asset.propertyValue || "");
        const totalProjectCost = purchasePrice + hardCosts + softCosts + closingCosts + carryCosts;
        const netCost          = Math.max(0, totalProjectCost - addlEquity);
        const curLoanAmt       = parseCurrency(asset.loanAmount || "");
        // LTC = (Total Costs − Equity) ÷ Total Costs
        const ltc = totalProjectCost > 0 ? (netCost / totalProjectCost) * 100 : 0;
        const ltv = arv > 0 && curLoanAmt > 0 ? (curLoanAmt / arv) * 100 : 0;
        const suggestedLoan = netCost;

        return (
          <div className="md:col-span-2 rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-5 space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold">New Development — Project Details</div>

            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Price</label><Input value={asset.purchasePrice} onChange={(e) => upd("purchasePrice", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Year</label><Input value={asset.purchaseYear ?? String(new Date().getFullYear())} onChange={(e) => upd("purchaseYear", e.target.value)} placeholder={String(new Date().getFullYear())} className={inputClass} /></div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">Are all units fully entitled?</label>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => upd("fullyEntitled", opt)}
                    className={`p-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${asset.fullyEntitled === opt ? (opt === "yes" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-400 bg-red-50 text-red-600") : "border-gray-200 text-gray-500 hover:border-[#0a1f44]/30"}`}>
                    {opt === "yes" ? "✓ Yes" : "✕ No"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {([
                ["Total Hard Costs", "hardCosts"],
                ["Total Soft Costs", "softCosts"],
                ["Total Closing Costs", "originationClosingCosts"],
                ["Total Carry Costs", "carryingCosts"],
              ] as [string, keyof AssetData][]).map(([label, field]) => (
                <div key={field}><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{label}</label><Input value={String(asset[field] || "")} onChange={(e) => upd(field, formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
              ))}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Additional Equity Contributions</label>
              <Input value={asset.additionalEquity || ""} onChange={(e) => upd("additionalEquity", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} />
              <div className="text-xs text-gray-400 mt-1">Subtracted from total project cost</div>
            </div>

            {/* Cost breakdown + suggested loan */}
            {totalProjectCost > 0 && (
              <div className="rounded-xl border-2 border-[#0a1f44]/20 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-[#c9a84c] mb-3">Total New Development Loan Calculation</div>
                <div className="space-y-1.5 mb-3">
                  {[
                    ["Purchase Price", purchasePrice],
                    ["Total Hard Costs", hardCosts],
                    ["Total Soft Costs", softCosts],
                    ["Total Closing Costs", closingCosts],
                    ["Total Carry Costs", carryCosts],
                  ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                    <div key={String(label)} className="flex justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-[#0a1f44]">+ {formatCurrencyInput(String(val))}</span>
                    </div>
                  ))}
                  {addlEquity > 0 && (
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span className="font-medium">Additional Equity (deducted)</span>
                      <span className="font-bold">− {formatCurrencyInput(String(addlEquity))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#0a1f44] pt-2 border-t border-gray-200">
                    <span>Suggested Loan Amount</span>
                    <span className="text-[#c9a84c]">{formatCurrencyInput(String(suggestedLoan))}</span>
                  </div>
                </div>
                <button type="button" onClick={() => upd("loanAmount", formatCurrencyInput(String(suggestedLoan)))}
                  className="w-full py-2 text-xs font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 mb-3">
                  Use This Amount ↓
                </button>
                {totalProjectCost > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    {ltc > 0 && <div className="rounded-lg bg-gray-50 p-2 text-center"><div className="text-xs text-gray-400 mb-0.5">LTC</div><div className="text-sm font-bold text-[#0a1f44]">{ltc.toFixed(1)}%</div><div className="text-xs text-gray-400">(Costs − Equity) ÷ Costs</div></div>}
                    {ltv > 0 && <div className="rounded-lg bg-gray-50 p-2 text-center"><div className="text-xs text-gray-400 mb-0.5">LTV (on ARV)</div><div className="text-sm font-bold text-[#0a1f44]">{ltv.toFixed(1)}%</div></div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {m.isConstruction && (() => {
        const landCost     = parseCurrency(asset.landCost || "");
        const hardCosts    = parseCurrency(asset.hardCosts || "");
        const softCosts    = parseCurrency(asset.softCosts || "");
        const closingCosts = parseCurrency(asset.originationClosingCosts || "");
        const carryCosts   = parseCurrency(asset.carryingCosts || "");
        const addlEquity   = parseCurrency(asset.additionalEquity || "");
        const arv          = parseCurrency(asset.propertyValue || "");
        const loanAmt      = parseCurrency(asset.loanAmount || "");
        const totalProjectCost = landCost + hardCosts + softCosts + closingCosts + carryCosts;
        const netCost      = Math.max(0, totalProjectCost - addlEquity);
        // LTC = (Total Costs − Equity) ÷ Total Costs
        const ltc = totalProjectCost > 0 ? (netCost / totalProjectCost) * 100 : 0;
        const ltv = arv > 0 && loanAmt > 0 ? (loanAmt / arv) * 100 : 0;

        return (
          <div className="md:col-span-2 rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-5 space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold">Construction — Project Cost Matrix</div>

            {/* Entitlement question */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">Are all units fully entitled?</label>
              <div className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => upd("fullyEntitled", opt)}
                    className={`p-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${asset.fullyEntitled === opt ? (opt === "yes" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-400 bg-red-50 text-red-600") : "border-gray-200 text-gray-500 hover:border-[#0a1f44]/30"}`}>
                    {opt === "yes" ? "✓ Yes" : "✕ No"}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost inputs */}
            <div className="grid gap-3 md:grid-cols-2">
              {([
                ["Land / Acquisition Cost", "landCost"],
                ["Total Hard Costs", "hardCosts"],
                ["Total Soft Costs", "softCosts"],
                ["Total Closing / Origination Costs", "originationClosingCosts"],
                ["Total Carry Costs", "carryingCosts"],
              ] as [string, keyof AssetData][]).map(([label, field]) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{label}</label>
                  <Input value={String(asset[field] || "")} onChange={(e) => upd(field, formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Additional Equity Contributions</label>
                <Input value={asset.additionalEquity || ""} onChange={(e) => upd("additionalEquity", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} />
                <div className="text-xs text-gray-400 mt-1">Subtracted from total project cost</div>
              </div>
            </div>

            {/* Total Project Cost + Loan + LTC */}
            {totalProjectCost > 0 && (
              <div className="rounded-xl border-2 border-[#0a1f44] bg-[#0a1f44] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wide">Total Project Cost</span>
                  <span className="text-xl font-bold text-white">{formatCurrencyInput(String(totalProjectCost))}</span>
                </div>
              </div>
            )}

            {/* Loan amount with LTC */}
            {totalProjectCost > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Construction Loan Amount</label>
                  <Input
                    value={asset.loanAmount}
                    onChange={(e) => upd("loanAmount", formatCurrencyInput(e.target.value))}
                    placeholder={netCost > 0 ? `Suggested: ${formatCurrencyInput(String(netCost))}` : "$0"}
                    className={inputClass}
                  />
                  {netCost > 0 && !asset.loanAmount && (
                    <button type="button" onClick={() => upd("loanAmount", formatCurrencyInput(String(netCost)))}
                      className="mt-1.5 text-xs text-[#0a1f44] font-semibold hover:underline">
                      Use suggested: {formatCurrencyInput(String(netCost))}
                    </button>
                  )}
                </div>

                {/* LTC / LTV summary */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-3">Construction Stack Summary</div>
                  <div className="space-y-1.5">
                    {[
                      ["Land / Acquisition", landCost],
                      ["Hard Costs", hardCosts],
                      ["Soft Costs", softCosts],
                      ["Closing / Origination", closingCosts],
                      ["Carry Costs", carryCosts],
                    ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                      <div key={String(label)} className="flex justify-between text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-[#0a1f44]">+ {formatCurrencyInput(String(val))}</span>
                      </div>
                    ))}
                    {addlEquity > 0 && (
                      <div className="flex justify-between text-xs text-emerald-700">
                        <span className="font-medium">Additional Equity (deducted)</span>
                        <span className="font-bold">− {formatCurrencyInput(String(addlEquity))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-[#0a1f44] pt-2 border-t border-gray-200">
                      <span>Suggested Loan Amount</span>
                      <span className="text-[#c9a84c]">{formatCurrencyInput(String(netCost))}</span>
                    </div>
                  </div>

                  {/* LTC / LTV boxes */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                    {ltc > 0 && (
                      <div className="rounded-lg bg-[#0a1f44] p-3 text-center">
                        <div className="text-xs text-[#c9a84c] font-bold uppercase tracking-wide mb-0.5">LTC</div>
                        <div className="text-xl font-bold text-white">{ltc.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400 mt-0.5">(Cost − Equity) ÷ Cost</div>
                      </div>
                    )}
                    {ltv > 0 && arv > 0 && (
                      <div className="rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/30 p-3 text-center">
                        <div className="text-xs text-[#0a1f44] font-bold uppercase tracking-wide mb-0.5">LTV (on ARV)</div>
                        <div className="text-xl font-bold text-[#0a1f44]">{ltv.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">Loan ÷ ARV</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {!m.isSubCap && !(m.isConstruction && m.isAcquisition) && (
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">
            {asset.dealType === "New Development" || asset.dealType === "Construction" ? "Total Construction / Development Loan" : m.isRefinance ? "New Loan Amount" : "Loan Amount"}
          </label>
          <Input value={asset.loanAmount} onChange={(e) => upd("loanAmount", formatCurrencyInput(e.target.value))} placeholder={asset.dealType === "New Development" || asset.dealType === "Construction" ? "Auto-filled above or enter manually" : "$0"} className={inputClass} />
          {(asset.dealType === "New Development" || asset.dealType === "Construction") && <div className="text-xs text-gray-400 mt-1">Pre-filled from calculation above — edit to override.</div>}
        </div>
      )}
      {m.isSubCap && (<><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Senior Loan Amount</label><Input value={asset.seniorLoanAmount} onChange={(e) => upd("seniorLoanAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{subordinateLabel(capitalType)}</label><Input value={asset.subordinateAmount} onChange={(e) => upd("subordinateAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div><div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">Stack: Senior {asset.seniorLoanAmount || "$0"} + {subordinateLabel(capitalType)} {asset.subordinateAmount || "$0"}</div></>)}
      <div className="md:col-span-2">
        <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">States</label>
        <div className="mb-2 flex gap-2"><button onClick={() => upd("selectedStates", allStates)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">Select All</button><button onClick={() => upd("selectedStates", [])} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">Clear</button></div>
        <div className="grid max-h-32 grid-cols-6 gap-1.5 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">{allStates.map((s) => (<label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={asset.selectedStates.includes(s)} onChange={() => upd("selectedStates", asset.selectedStates.includes(s) ? asset.selectedStates.filter((x) => x !== s) : [...asset.selectedStates, s])} className="accent-[#0a1f44]" /><span className="text-gray-600">{s}</span></label>))}</div>
      </div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Property Value / ARV</label><Input value={asset.propertyValue} onChange={(e) => upd("propertyValue", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">LTV Mode</label><Select value={asset.ltvMode} onValueChange={(v) => upd("ltvMode", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">Auto Calculate</SelectItem><SelectItem value="MANUAL">Manual Entry</SelectItem></SelectContent></Select></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Net Income (Annual)</label><Input value={asset.currentNetIncome} onChange={(e) => upd("currentNetIncome", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      {m.isRefinance && (
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">ARV Net Income (Annual)</label><Input value={asset.arvNetIncome || ""} onChange={(e) => upd("arvNetIncome", formatCurrencyInput(e.target.value))} placeholder="Projected stabilized income" className={inputClass} /></div>
      )}
      {m.isRefinance && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Interest Rate (%)</label>
          <Input value={asset.currentRate || ""} onChange={(e) => upd("currentRate", e.target.value)} placeholder="e.g. 6.5" className={inputClass} />
        </div>
      )}
      {m.isRefinance ? (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <label className="text-xs text-gray-500 font-medium uppercase">DSCR</label>
            <div className="relative group">
              <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold cursor-help">i</div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#0a1f44] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg">
                DSCR is calculated based on an interest only payment
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0a1f44]" />
              </div>
            </div>
          </div>
          {(() => {
            const netIncome = parseCurrency(asset.currentNetIncome);
            const isNewDevRefi = m.isRefinance && asset.dealType === "New Development";
            const loanAmt = isNewDevRefi
              ? parseCurrency(asset.currentLoanAmount)
              : parseCurrency(asset.loanAmount) || parseCurrency(asset.seniorLoanAmount);
            const rate = parseFloat(asset.currentRate || "0") / 100;
            const autoDscr = netIncome > 0 && loanAmt > 0 && rate > 0
              ? (netIncome / (loanAmt * rate)).toFixed(2)
              : "";
            return autoDscr ? (
              <div className="rounded-xl border border-[#0a1f44]/20 bg-[#0a1f44]/5 px-3 py-2">
                <div className="text-lg font-bold text-[#0a1f44]">{autoDscr}x</div>
                <div className="text-xs text-gray-500 mt-0.5">Auto-calculated (I/O)</div>
              </div>
            ) : (
              <Input value={asset.dscr} onChange={(e) => upd("dscr", e.target.value)} placeholder="e.g. 1.25 (enter rate above to auto-calc)" className={inputClass} />
            );
          })()}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <label className="text-xs text-gray-500 font-medium uppercase">DSCR</label>
            <div className="relative group">
              <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold cursor-help">i</div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#0a1f44] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg">
                DSCR is calculated based on an interest only payment
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0a1f44]" />
              </div>
            </div>
          </div>
          <Input value={asset.dscr} onChange={(e) => upd("dscr", e.target.value)} placeholder="e.g. 1.25" className={inputClass} />
        </div>
      )}
      {asset.ltvMode === "MANUAL" && <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Manual LTV</label><Input value={asset.manualLtv} onChange={(e) => upd("manualLtv", e.target.value)} className={inputClass} /></div>}
      {asset.ltvMode === "AUTO" && <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Calculated LTV</label><div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-[#0a1f44]">{formatPercent(m.autoLtv)}</div></div>}
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Recourse</label><Select value={asset.recourseType} onValueChange={(v) => upd("recourseType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      <div className="md:col-span-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(metricBoxes.length, 4)}, 1fr)` }}>
        {metricBoxes.map(([label, val]) => (<div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">{label}</div><div className="text-sm font-bold text-[#0a1f44]">{val}</div></div>))}
      </div>
    </div>
  );
}

// ─── Add Lender Page ──────────────────────────────────────────────────────────

function AddLenderPage({ onSave, onCancel, existingLenders, inputClass, selectTriggerClass }: { onSave: (form: NewLenderForm) => void; onCancel: () => void; existingLenders: LenderRecord[]; inputClass: string; selectTriggerClass: string }) {
  const [form, setForm] = useState<NewLenderForm>(blankLenderForm());
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [matchMode, setMatchMode] = useState<Record<string, "manual" | "spreadsheet">>({ programName: "manual", contactPerson: "manual", email: "manual", phone: "manual", website: "manual" });

  function upd(field: keyof NewLenderForm, value: any) { setForm((prev) => ({ ...prev, [field]: value })); }
  function toggleAccordion(ct: string) { setOpenAccordions((prev) => ({ ...prev, [ct]: prev[ct] === false ? true : false })); }
  function isOpen(ct: string) { return openAccordions[ct] !== false; } // default open
  const spreadsheetSuggestions: Record<string, string[]> = {
    programName: [...new Set(existingLenders.map((l) => l.program))],
    contactPerson: [...new Set(existingLenders.map((l) => l.contactPerson || "").filter(Boolean))],
    email: [...new Set(existingLenders.map((l) => l.email).filter(Boolean))],
    phone: [...new Set(existingLenders.map((l) => l.phone).filter(Boolean))],
    website: [...new Set(existingLenders.map((l) => l.website || "").filter(Boolean))],
  };
  const matchableFields: [keyof NewLenderForm, string][] = [["programName", "Program Name (Lender)"], ["contactPerson", "Contact Person"], ["email", "Email Address"], ["phone", "Phone Number"], ["website", "Website"]];
  return (
    <div className="max-w-4xl">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">New Entry</div>
        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Add Lender</h2>
        <div className="space-y-6">
          <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-4">Lender Information</div>
            <div className="grid gap-4 md:grid-cols-2">
              {matchableFields.map(([field, label]) => (
                <div key={String(field)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wide">{label}</label>
                    <button type="button" onClick={() => setMatchMode((prev) => ({ ...prev, [String(field)]: prev[String(field)] === "manual" ? "spreadsheet" : "manual" }))} className={`text-xs px-2 py-0.5 rounded-full border transition-all ${matchMode[String(field)] === "spreadsheet" ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-white text-gray-500 border-gray-200"}`}>
                      {matchMode[String(field)] === "spreadsheet" ? "📋 Spreadsheet" : "✏️ Manual"}
                    </button>
                  </div>
                  {matchMode[String(field)] === "spreadsheet" ? (
                    <Select value={String(form[field])} onValueChange={(v) => upd(field, v)}><SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select from spreadsheet..." /></SelectTrigger><SelectContent>{(spreadsheetSuggestions[String(field)] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                  ) : (
                    <Input value={String(form[field])} onChange={(e) => upd(field, e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} className={inputClass} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CheckboxGroup label="Capital Type" options={capitalTypes} selected={form.capitalTypes} onChange={(v) => upd("capitalTypes", v)} />
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Recourse</label><Select value={form.recourse} onValueChange={(v) => upd("recourse", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Status</label><Select value={form.status} onValueChange={(v) => upd("status", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          {/* Loan parameters — single type = flat form, multiple types = accordion per type */}
          {form.capitalTypes.length <= 1 ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Minimum Loan Size</label><Input value={form.minLoan} onChange={(e) => upd("minLoan", formatCurrencyInput(e.target.value))} placeholder="$1,000,000" className={inputClass} /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Maximum Loan Size</label><Input value={form.maxLoan} onChange={(e) => upd("maxLoan", formatCurrencyInput(e.target.value))} placeholder="$25,000,000" className={inputClass} /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Max LTV</label><Input value={form.maxLtv} onChange={(e) => upd("maxLtv", e.target.value)} placeholder="75%" className={inputClass} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {form.capitalTypes.includes("C&I") ? (
                  <>
                    <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Property Types</label><Input value={Array.isArray(form.propertyTypes) ? form.propertyTypes.join(", ") : ""} onChange={(e) => upd("propertyTypes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. Office, Manufacturing" className={inputClass} /></div>
                    <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Loan Terms</label><Input value={Array.isArray(form.loanTerms) ? form.loanTerms.join(", ") : ""} onChange={(e) => upd("loanTerms", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. 12-36 months" className={inputClass} /></div>
                  </>
                ) : (
                  <>
                    <DropdownCheckbox label="Property Types" options={lenderPropertyTypeOptions} selected={Array.isArray(form.propertyTypes) ? form.propertyTypes : []} onChange={(v) => upd("propertyTypes", v)} />
                    <DropdownCheckbox label="Loan Terms" options={loanTermOptions} selected={Array.isArray(form.loanTerms) ? form.loanTerms : []} onChange={(v) => upd("loanTerms", v)} />
                  </>
                )}
              </div>
            </>
          ) : (
            /* Multiple capital types — accordion per type */
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-3">Program Parameters Per Capital Type</div>
              <p className="text-xs text-gray-500 mb-4">This lender offers multiple capital types — enter the specific parameters for each one below.</p>
              <div className="space-y-3">
                {form.capitalTypes.map((ct) => {
                  const prog = form.capitalTypePrograms.find((p) => p.capitalType === ct) || { capitalType: ct, minLoan: "", maxLoan: "", maxLtv: "", loanTerms: [], propertyTypes: [] };
                  function updProg(field: keyof CapitalTypeProgram, value: any) {
                    const existing = form.capitalTypePrograms.filter((p) => p.capitalType !== ct);
                    upd("capitalTypePrograms", [...existing, { ...prog, [field]: value }]);
                  }
                  const open = isOpen(ct);
                  return (
                    <div key={ct} className="rounded-xl border border-[#0a1f44]/20">
                      <button type="button" onClick={() => toggleAccordion(ct)} className="w-full flex items-center justify-between px-4 py-3 bg-[#0a1f44]/5 hover:bg-[#0a1f44]/10 transition-all rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                          <span className="text-sm font-bold text-[#0a1f44]">{ct}</span>
                          {prog.minLoan && prog.maxLoan && <span className="text-xs text-gray-400 ml-2">{prog.minLoan} – {prog.maxLoan}</span>}
                        </div>
                        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
                      </button>
                      {open && (
                        <div className="p-4 space-y-4 bg-white rounded-b-xl">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Min Loan</label><Input value={prog.minLoan} onChange={(e) => updProg("minLoan", formatCurrencyInput(e.target.value))} placeholder="$1,000,000" className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max Loan</label><Input value={prog.maxLoan} onChange={(e) => updProg("maxLoan", formatCurrencyInput(e.target.value))} placeholder="$25,000,000" className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max LTV</label><Input value={prog.maxLtv} onChange={(e) => updProg("maxLtv", e.target.value)} placeholder="75%" className={inputClass} /></div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {ct === "C&I" ? (
                              <>
                                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Types</label><Input value={prog.propertyTypes.join(", ")} onChange={(e) => updProg("propertyTypes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. Office, Manufacturing" className={inputClass} /></div>
                                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Loan Terms</label><Input value={prog.loanTerms.join(", ")} onChange={(e) => updProg("loanTerms", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. 12-36 months" className={inputClass} /></div>
                              </>
                            ) : (
                              <>
                                <div className="relative z-50"><DropdownCheckbox label="Property Types" options={lenderPropertyTypeOptions} selected={prog.propertyTypes} onChange={(v) => updProg("propertyTypes", v)} /></div>
                                <div className="relative z-50"><DropdownCheckbox label="Loan Terms" options={loanTermOptions} selected={prog.loanTerms} onChange={(v) => updProg("loanTerms", v)} /></div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <CheckboxGroup label="Type of Lender" options={typeOfLenderOptions} selected={form.typeOfLenders} onChange={(v) => upd("typeOfLenders", v)} />
          <CheckboxGroup label="Type of Loans" options={typeOfLoanOptions} selected={form.typeOfLoans} onChange={(v) => upd("typeOfLoans", v)} />
          <CheckboxGroup label="Program" options={programTypeOptions} selected={form.programTypes} onChange={(v) => upd("programTypes", v)} />
          <StateSelector label="Target States" selected={form.targetStates} onChange={(v) => upd("targetStates", v)} />
          <StateSelector label="Sponsor States" selected={form.sponsorStates} onChange={(v) => upd("sponsorStates", v)} />
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} placeholder="Add any notes about this lender — deal history, preferences, spreadsheet notes, etc." rows={4} className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none" />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => onSave(form)} className="px-6 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Save Lender</button>
            <button onClick={() => setForm(blankLenderForm())} className="px-4 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Reset</button>
            <button onClick={onCancel} className="px-4 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Deal Team Tab ────────────────────────────────────────────────────────────

function DealTeamTab({ teamMembers, setTeamMembers, currentUserId, isAdmin, inputClass, selectTriggerClass, cardClass }: { teamMembers: TeamMember[]; setTeamMembers: (m: TeamMember[]) => void; currentUserId: number; isAdmin: boolean; inputClass: string; selectTriggerClass: string; cardClass: string }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({ name: "", email: "", phone: "", photo: "", geographicMarket: "", specialtyAreas: [], title: "" });

  function saveEdit(updated: TeamMember) { setTeamMembers(teamMembers.map((m) => m.id === updated.id ? updated : m)); setEditingId(null); }
  function deleteMember(id: number) { if (window.confirm("Remove this team member?")) setTeamMembers(teamMembers.filter((m) => m.id !== id)); }
  function addMember() {
    if (!newMember.name || !newMember.email) return;
    setTeamMembers([...teamMembers, { id: Date.now(), name: newMember.name!, email: newMember.email!, phone: newMember.phone || "", photo: newMember.photo || "", geographicMarket: newMember.geographicMarket || "", specialtyAreas: newMember.specialtyAreas || [], title: newMember.title || "" }]);
    setNewMember({ name: "", email: "", phone: "", photo: "", geographicMarket: "", specialtyAreas: [], title: "" });
  }

  return (
    <div className="space-y-6">
      <div className={cardClass + " p-6"}>
        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">CapMoon</div>
        <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-6">Deal Team</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {teamMembers.map((member) => {
            const canEdit = isAdmin || member.id === teamMembers.find((m) => m.id === currentUserId)?.id;
            const isEditing = editingId === member.id;
            return (
              <div key={member.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="bg-[#0a1f44] p-5 flex items-center gap-4">
                  <img src={member.photo || "/logo1.JPEG"} alt={member.name} className="h-16 w-16 rounded-xl object-cover border-2 border-[#c9a84c]/30 flex-shrink-0" />
                  <div>
                    <div className="font-display text-xl font-bold text-white">{member.name}</div>
                    <div className="text-xs text-[#c9a84c] font-medium mt-0.5">{member.title}</div>
                    <a href={`mailto:${member.email}`} className="text-xs text-gray-400 mt-1 hover:underline">{member.email}</a>
                  </div>
                </div>
                <div className="p-5">
                  {!isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><div className="text-xs text-gray-400 mb-0.5">Phone</div><div className="text-sm font-medium text-[#0a1f44]">{member.phone || "—"}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">Market</div><div className="text-sm font-medium text-[#0a1f44]">{member.geographicMarket || "—"}</div></div>
                      </div>
                      {member.specialtyAreas.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 mb-2">Specialty Areas</div>
                          <div className="flex flex-wrap gap-1.5">{member.specialtyAreas.map((s) => <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-[#0a1f44]/10 text-[#0a1f44] border border-[#0a1f44]/20 font-medium">{s}</span>)}</div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        {(isAdmin || member.id === currentUserId) && <button onClick={() => setEditingId(member.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium"><Edit2 className="h-3 w-3" /> Edit</button>}
                        {isAdmin && <button onClick={() => deleteMember(member.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="h-3 w-3" /> Remove</button>}
                      </div>
                    </div>
                  ) : (
                    <EditMemberForm member={member} onSave={saveEdit} onCancel={() => setEditingId(null)} isAdmin={isAdmin} inputClass={inputClass} selectTriggerClass={selectTriggerClass} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <div className={cardClass + " p-6"}>
          <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-bold mb-1">Admin</div>
          <h3 className="font-display text-xl font-bold text-[#0a1f44] mb-4">Add Team Member</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Full Name</label><Input value={newMember.name || ""} onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))} placeholder="John Smith" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Email (cannot be changed later)</label><Input value={newMember.email || ""} onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))} placeholder="john@capmoon.com" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Title</label><Input value={newMember.title || ""} onChange={(e) => setNewMember((p) => ({ ...p, title: e.target.value }))} placeholder="Vice President of Capital Advisory" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Phone</label><Input value={newMember.phone || ""} onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))} placeholder="305-000-0000" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Geographic Market</label><Input value={newMember.geographicMarket || ""} onChange={(e) => setNewMember((p) => ({ ...p, geographicMarket: e.target.value }))} placeholder="Southeast, Florida" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Photo URL</label><Input value={newMember.photo || ""} onChange={(e) => setNewMember((p) => ({ ...p, photo: e.target.value }))} placeholder="/photo.jpg" className={inputClass} /></div>
            <div className="md:col-span-2">
              <CheckboxGroup label="Specialty Areas (Capital Types)" options={capitalTypes} selected={newMember.specialtyAreas || []} onChange={(v) => setNewMember((p) => ({ ...p, specialtyAreas: v }))} />
            </div>
          </div>
          <button onClick={addMember} className="mt-4 px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Add Team Member</button>
        </div>
      )}
    </div>
  );
}

function EditMemberForm({ member, onSave, onCancel, isAdmin, inputClass, selectTriggerClass }: { member: TeamMember; onSave: (m: TeamMember) => void; onCancel: () => void; isAdmin: boolean; inputClass: string; selectTriggerClass: string }) {
  const [form, setForm] = useState<TeamMember>({ ...member });
  function upd(field: keyof TeamMember, value: any) { setForm((p) => ({ ...p, [field]: value })); }
  return (
    <div className="space-y-3">
      {isAdmin && <div><label className="text-xs text-gray-400 mb-1 block">Name</label><Input value={form.name} onChange={(e) => upd("name", e.target.value)} className={inputClass} /></div>}
      <div><label className="text-xs text-gray-400 mb-1 block">Email <span className="text-gray-300">(locked)</span></label><div className="px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded-xl border border-gray-200">{form.email}</div></div>
      {isAdmin && <div><label className="text-xs text-gray-400 mb-1 block">Title</label><Input value={form.title} onChange={(e) => upd("title", e.target.value)} className={inputClass} /></div>}
      <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} className={inputClass} /></div>
      <div><label className="text-xs text-gray-400 mb-1 block">Photo URL (e.g. /photo.jpg)</label><Input value={form.photo} onChange={(e) => upd("photo", e.target.value)} placeholder="/photo.jpg" className={inputClass} /></div>
      <div><label className="text-xs text-gray-400 mb-1 block">Geographic Market</label><Input value={form.geographicMarket} onChange={(e) => upd("geographicMarket", e.target.value)} className={inputClass} /></div>
      <CheckboxGroup label="Specialty Areas" options={capitalTypes} selected={form.specialtyAreas} onChange={(v) => upd("specialtyAreas", v)} />
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)} className="px-4 py-2 text-xs font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Save</button>
        <button onClick={onCancel} className="px-3 py-2 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}

// ─── Deal Matcher ─────────────────────────────────────────────────────────────

function DealMatcher({ lenderRecords, capitalSeekerMode = false, onSubmitDeal, seekerName, teamMembers, prefillDeal, onPrefillConsumed, inputClass, selectTriggerClass, cardClass }: { lenderRecords: LenderRecord[]; capitalSeekerMode?: boolean; onSubmitDeal?: (assets: AssetData[], capitalType: string, assetMode: string, collateralMode: string) => void; seekerName?: string; teamMembers: TeamMember[]; prefillDeal?: SubmittedDeal | null; onPrefillConsumed?: () => void; inputClass: string; selectTriggerClass: string; cardClass: string }) {
  const [matcherStep, setMatcherStep] = useState<MatcherStep>("ai-prompt");
  const [marketScope, setMarketScope] = useState("US");
  const [capitalType, setCapitalType] = useState("Senior");
  const [assetMode, setAssetMode] = useState<"single" | "multiple">("single");
  const [assetCount, setAssetCount] = useState("2");
  const [collateralMode, setCollateralMode] = useState<"crossed" | "separate" | "">(""); 
  const [assets, setAssets] = useState<AssetData[]>([blankAsset(1)]);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [tenantDatabase, setTenantDatabase] = useState<string[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsed, setAiParsed] = useState(false);
  const [aiError, setAiError] = useState("");
  const [assignedAdvisors, setAssignedAdvisors] = useState<TeamMember[]>([]);
  const [prefillBanner, setPrefillBanner] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState<number[]>([]);
  const [additionalSearch, setAdditionalSearch] = useState("");
  const [additionalSelected, setAdditionalSelected] = useState<number[]>([]);
  // Hybrid/Stretch Senior state
  const [hybridCount, setHybridCount] = useState("1");
  const [hybridProperties, setHybridProperties] = useState<HybridProperty[]>([]);
  const [hybridIndex, setHybridIndex] = useState(0);

  function blankHybridProperty(id: number): HybridProperty {
    return {
      id, ownershipStatus: "Acquisition", assetType: "Apartments", dealType: "Investment",
      purchasePrice: "", currentValue: "",
      hardCosts: "", softCosts: "", closingCosts: "", carryingCosts: "", entitlementCosts: "",
      seniorLoan: "",
      subLayers: [{ id: 1, type: "Mezzanine", amount: "" }],
      borrowerEquity: "", currentLoan: "",
      address: blankAddress(),
      numUnits: "", numBuildings: "", numAcres: "",
      currentNetIncome: "", dscr: "", arvValue: "",
      selectedStates: [], recourseType: "CASE BY CASE", notes: "",
    };
  }
  function updHybrid(field: keyof HybridProperty, value: string) {
    setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, [field]: value } : p));
  }

  // Pre-fill from submitted deal
  React.useEffect(() => {
    if (!prefillDeal) return;
    setCapitalType(prefillDeal.capitalType);
    setAssetMode(prefillDeal.assetMode as "single" | "multiple");
    setCollateralMode(prefillDeal.collateralMode as "crossed" | "separate" | "");
    setAssets(prefillDeal.assets.length > 0 ? prefillDeal.assets : [blankAsset(1)]);
    setCurrentAssetIndex(0);
    setPrefillBanner(`Pre-filled from ${prefillDeal.seekerName}'s deal — submitted ${prefillDeal.submittedAt}`);
    setMatcherStep("asset-form");
    if (onPrefillConsumed) onPrefillConsumed();
  }, [prefillDeal]);

  function addTenant(name: string) { setTenantDatabase((prev) => prev.includes(name) ? prev : [...prev, name]); }
  function updateAsset(updated: AssetData) { setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a)); }

  async function handleAiSubmit() {
    if (!aiDescription.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const response = await fetch("/api/parse-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription, capitalType }),
      });
      if (!response.ok) {
        const errText = await response.text();
        setAiError(`Server error (${response.status}): ${errText.slice(0, 100)}. Please use manual entry.`);
        setAiLoading(false); return;
      }
      const parsed = await response.json();
      if (!parsed || Object.keys(parsed).length === 0) {
        setAiError("AI returned no data. Please use manual entry below.");
        setAiLoading(false); return;
      }
      setAssets([{ ...blankAsset(1), ...parsed }]);
      setAiParsed(true); setAssetMode("single"); setMatcherStep("asset-form");
    } catch (err: any) {
      setAiError(`Connection error: ${err?.message || "unknown"}. Please use manual entry.`);
    }
    setAiLoading(false);
  }

  function handleAssetModeSelect(mode: "single" | "multiple") {
    setAssetMode(mode);
    if (mode === "single") { setAssets([blankAsset(1)]); setCurrentAssetIndex(0); setMatcherStep("asset-form"); }
    else { setMatcherStep("asset-count"); }
  }
  function handleAssetCountConfirm() {
    const count = Math.max(2, Math.min(20, parseInt(assetCount) || 2));
    setAssets(Array.from({ length: count }, (_, i) => blankAsset(i + 1)));
    setCurrentAssetIndex(0); setMatcherStep("asset-form");
  }
  function handleNextAsset() { if (currentAssetIndex < assets.length - 1) { setCurrentAssetIndex((i) => i + 1); } else { setMatcherStep("review"); } }
  function handlePrevAsset() { if (currentAssetIndex > 0) { setCurrentAssetIndex((i) => i - 1); } else { setMatcherStep(assetMode === "multiple" ? "asset-count" : "start"); } }
  function handleBackFromStart() { if (prefillBanner && !capitalSeekerMode && typeof (window as any).__setActiveTab === 'function') { (window as any).__setActiveTab('submitted-deals'); } else { setMatcherStep('ai-prompt'); } }
  function resetMatcher() { setMatcherStep("ai-prompt"); setAssetMode("single"); setCollateralMode(""); setAssets([blankAsset(1)]); setCurrentAssetIndex(0); setAiDescription(""); setAiParsed(false); setAiError(""); setAssignedAdvisors([]); setPrefillBanner(""); setHybridProperties([]); setHybridIndex(0); setHybridCount("1"); }

  const matchResults = useMemo(() => {
    if (matcherStep !== "results" || marketScope === "INTERNATIONAL" || capitalSeekerMode) return [];
    if (collateralMode === "crossed" || assetMode === "single") {
      const totalLoan = assets.reduce((sum, a) => sum + calcMetrics(a, capitalType).effectiveAmt, 0);
      const primary = assets[0];
      const stateSet = [...new Set(assets.flatMap((a) => a.selectedStates))];
      return lenderRecords.map((l) => {
        let score = 0; const nr = normalizeRecourse(l.recourse);
        // Loan size — partial credit if within 2x range
        if (totalLoan > 0) {
          const min = parseCurrency(l.minLoan), max = parseCurrency(l.maxLoan);
          if (totalLoan >= min && totalLoan <= max) score += 30;
          else if (totalLoan >= min * 0.5 && totalLoan <= max * 2) score += 15;
        } else { score += 15; } // no loan amount entered, give partial
        if (l.assets.includes(primary.assetType)) score += 22;
        else if (l.assets.length === 0) score += 8;
        if (l.type && l.type.split(",").map((s: string) => s.trim()).includes(capitalType)) score += 25;
        else if (!l.type) score += 8;
        if (stateSet.length === 0 || stateSet.some((s) => l.states.includes(s))) score += 15;
        if (nr === primary.recourseType || nr === "CASE BY CASE" || !primary.recourseType) score += 8;
        if (l.maxLtv) {
          const lenderMaxLtv = parseFloat(l.maxLtv.replace(/[^0-9.]/g, ""));
          const dealLtv = calcMetrics(primary, capitalType).seniorLtv;
          if (dealLtv > 0 && lenderMaxLtv > 0) { if (dealLtv <= lenderMaxLtv) score += 5; else score -= 10; }
        }
        return { ...l, score, nr };
      }).filter((l) => l.score > 25).sort((a, b) => b.score - a.score).slice(0, 6);
    }
    return assets.flatMap((asset) => {
      const m = calcMetrics(asset, capitalType);
      return lenderRecords.map((l) => {
        let score = 0; const nr = normalizeRecourse(l.recourse);
        if (m.effectiveAmt > 0) {
          const min = parseCurrency(l.minLoan), max = parseCurrency(l.maxLoan);
          if (m.effectiveAmt >= min && m.effectiveAmt <= max) score += 30;
          else if (m.effectiveAmt >= min * 0.5 && m.effectiveAmt <= max * 2) score += 15;
        } else { score += 15; }
        if (l.assets.includes(asset.assetType)) score += 22;
        else if (l.assets.length === 0) score += 8;
        if (l.type && l.type.split(",").map((s: string) => s.trim()).includes(capitalType)) score += 25;
        else if (!l.type) score += 8;
        if (asset.selectedStates.length === 0 || asset.selectedStates.some((s) => l.states.includes(s))) score += 15;
        if (nr === asset.recourseType || nr === "CASE BY CASE" || !asset.recourseType) score += 8;
        if (l.maxLtv) {
          const lenderMaxLtv = parseFloat(l.maxLtv.replace(/[^0-9.]/g, ""));
          if (m.seniorLtv > 0 && lenderMaxLtv > 0) { if (m.seniorLtv <= lenderMaxLtv) score += 5; else score -= 10; }
        }
        return { ...l, score, nr, assetId: asset.id };
      }).filter((l) => l.score > 25).sort((a, b) => b.score - a.score).slice(0, 4);
    });
  }, [matcherStep, assets, capitalType, marketScope, collateralMode, assetMode, lenderRecords, capitalSeekerMode]);

  const progressSteps = capitalType === "Stretch Senior/Hybrid"
    ? ["AI Search", "Setup", "Property Count", "Capital Stack", "Review", "Results"].filter(Boolean) as string[]
    : ["AI Search", "Setup", assetMode === "multiple" ? "Asset Count" : null, "Asset Details", "Review", "Results"].filter(Boolean) as string[];
  const currentStepLabel = matcherStep === "ai-prompt" ? "AI Search" : matcherStep === "start" ? "Setup" : matcherStep === "hybrid-count" ? "Property Count" : matcherStep === "hybrid-form" ? "Capital Stack" : matcherStep === "asset-count" ? "Asset Count" : matcherStep === "asset-form" ? "Asset Details" : matcherStep === "review" ? "Review" : "Results";
  const currentStepIdx = progressSteps.indexOf(currentStepLabel);

  return (
    <div>
      {matcherStep !== "ai-prompt" && (
        <div className="flex items-center gap-2 mb-6">
          {progressSteps.map((step, idx) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx <= currentStepIdx ? "bg-[#0a1f44] text-white" : "bg-gray-200 text-gray-500"}`}>{idx + 1}</div>
                <span className="text-xs text-gray-500 font-medium hidden sm:block">{step}</span>
              </div>
              {idx < progressSteps.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            </React.Fragment>
          ))}
          <button onClick={resetMatcher} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Start Over</button>
        </div>
      )}

      {matcherStep === "ai-prompt" && (
        <div className="max-w-2xl">
          <div className={cardClass + " p-8"}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#0a1f44] flex items-center justify-center"><Sparkles className="h-5 w-5 text-[#c9a84c]" /></div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">AI-Powered</div>
                <h2 className="font-display text-3xl font-bold text-[#0a1f44]">Describe Your Deal</h2>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">{capitalSeekerMode ? "Tell us about your deal and we'll connect you with the right advisor." : "Tell us about your deal and our AI will find the best matching lenders."}</p>
            <div className="mb-5"><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Describe Your Deal</label>
              <textarea value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAiSubmit(); }} placeholder={'e.g. "Bridge loan for a 150-unit apartment complex in Miami FL. Purchase price $28M, looking for $18M senior financing at 65% LTV."'} rows={4} className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none" />
              <div className="text-xs text-gray-400 mt-1">Press Cmd+Enter to submit</div>
            </div>
            {aiError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{aiError}</div>}
            <div className="flex gap-3">
              <button onClick={handleAiSubmit} disabled={aiLoading || !aiDescription.trim()} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-40 disabled:cursor-not-allowed">
                {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> {capitalSeekerMode ? "Find My Financing" : "Find Matching Lenders"}</>}
              </button>
            </div>
            <div className="flex items-center gap-4 my-6"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400 font-medium">or</span><div className="flex-1 h-px bg-gray-200" /></div>
            <button onClick={() => setMatcherStep("start")} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-[#0a1f44]/30 hover:text-[#0a1f44] transition-all"><Edit2 className="h-4 w-4" /> Enter deal parameters manually</button>
            <div className="mt-6">
              <div className="text-xs text-gray-400 font-medium mb-3">Example searches:</div>
              <div className="space-y-2">
                {["Bridge loan for 200-unit apartments in Florida, $15M, 70% LTV", "Construction financing for mixed-use development in New York, $40M", "Refinance retail center in Texas, $8M, cash-out, non-recourse"].map((ex) => (
                  <button key={ex} onClick={() => setAiDescription(ex)} className="w-full text-left px-3 py-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-[#0a1f44]/5 hover:border-[#0a1f44]/20 hover:text-[#0a1f44] transition-all">"{ex}"</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {matcherStep === "start" && (
        <div className="max-w-2xl">
          <div className={cardClass + " p-8"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Deal Matcher</div>
            <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Let's get started</h2>
            <div className="grid gap-5 md:grid-cols-2 mb-8">
              <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Market</label><Select value={marketScope} onValueChange={setMarketScope}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{marketOptions.map((i) => <SelectItem key={i} value={i}>{i === "US" ? "US" : "International"}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {marketScope === "INTERNATIONAL" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 mb-4">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>
            ) : capitalType === "Stretch Senior/Hybrid" ? (
              <div>
                <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-4 mb-5">
                  <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-1">Stretch Senior / Hybrid Capital Stack</div>
                  <p className="text-xs text-gray-600">This option lets you build a full capital stack combining Senior, Mezzanine, Preferred Equity, and/or JV Equity across one or more properties.</p>
                </div>
                <button
                  onClick={() => setMatcherStep("hybrid-count")}
                  className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80"
                >
                  Continue → Build Capital Stack
                </button>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">Single or multiple assets?</label>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button onClick={() => handleAssetModeSelect("single")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "single" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}><div className="text-sm font-bold text-[#0a1f44]">Single Asset</div><div className="text-xs text-gray-500 mt-1">One property</div></button>
                  <button onClick={() => handleAssetModeSelect("multiple")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "multiple" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}><div className="text-sm font-bold text-[#0a1f44]">Multiple Assets</div><div className="text-xs text-gray-500 mt-1">Portfolio of assets</div></button>
                </div>
                <button onClick={() => setMatcherStep("ai-prompt")} className="flex items-center gap-2 text-xs text-[#c9a84c] font-medium hover:underline"><Sparkles className="h-3.5 w-3.5" /> Switch to AI search</button>
              </div>
            )}
          </div>
        </div>
      )}

      {matcherStep === "asset-count" && (
        <div className="max-w-2xl">
          <div className={cardClass + " p-8"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Multiple Assets</div>
            <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Portfolio Setup</h2>
            <div className="space-y-6">
              <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">How many assets?</label><Input value={assetCount} onChange={(e) => setAssetCount(e.target.value)} type="number" min="2" max="20" className={inputClass + " max-w-xs"} /></div>
              <div>
                <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">How should they be treated?</label>
                <Select value={collateralMode} onValueChange={(v) => setCollateralMode(v as "crossed" | "separate")}><SelectTrigger className={selectTriggerClass + " max-w-xs"}><SelectValue placeholder="Select treatment..." /></SelectTrigger><SelectContent><SelectItem value="crossed">Crossed Collateral</SelectItem><SelectItem value="separate">Treated Separately</SelectItem></SelectContent></Select>
              </div>
              <div className="flex gap-3">
                <button onClick={prefillBanner ? handleBackFromStart : () => setMatcherStep("ai-prompt")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> {prefillBanner ? "Back to Deals" : "Previous"}</button>
                <button onClick={handleAssetCountConfirm} disabled={!collateralMode} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-40 disabled:cursor-not-allowed">Continue <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hybrid: how many properties */}
      {matcherStep === "hybrid-count" && (
        <div className="max-w-2xl">
          <div className={cardClass + " p-8"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Stretch Senior / Hybrid</div>
            <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">How many properties?</h2>
            <p className="text-sm text-gray-500 mb-6">We'll build a capital stack for each one.</p>
            <div className="mb-6">
              <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Number of Properties</label>
              <Input value={hybridCount} onChange={(e) => setHybridCount(e.target.value)} type="number" min="1" max="20" className={inputClass + " max-w-xs"} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMatcherStep("start")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Back</button>
              <button
                onClick={() => {
                  const count = Math.max(1, Math.min(20, parseInt(hybridCount) || 1));
                  setHybridProperties(Array.from({ length: count }, (_, i) => blankHybridProperty(i + 1)));
                  setHybridIndex(0);
                  setMatcherStep("hybrid-form");
                }}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hybrid: property capital stack builder */}
      {matcherStep === "hybrid-form" && hybridProperties.length > 0 && (() => {
        const prop = hybridProperties[hybridIndex];
        const isAcq = prop.ownershipStatus === "Acquisition";
        const isProjectDeal = isAcq && ["Value add", "Construction", "New Development"].includes(prop.dealType);
        const subLayers = prop.subLayers || [];
        const borrowerEquity = parseCurrency(prop.borrowerEquity);
        const showUnits = unitAssets.includes(prop.assetType);
        const showAcres = prop.assetType === "Land";

        // Project cost math (for value add / construction / new dev acquisitions)
        const purchasePrice = parseCurrency(prop.purchasePrice);
        const hardCosts = parseCurrency(prop.hardCosts || "");
        const softCosts = parseCurrency(prop.softCosts || "");
        const closingCosts = parseCurrency(prop.closingCosts || "");
        const carryingCosts = parseCurrency(prop.carryingCosts || "");
        const entitlementCosts = parseCurrency(prop.entitlementCosts || "");
        const totalProjectCost = purchasePrice + hardCosts + softCosts + closingCosts + carryingCosts + entitlementCosts;

        // Base value for LTV: project cost for project deals, property value otherwise
        const baseValue = isProjectDeal ? totalProjectCost : parseCurrency(isAcq ? prop.purchasePrice : prop.currentValue);
        // Senior loan is always manually entered now
        const seniorLoan = parseCurrency(prop.seniorLoan);

        // Last dollar LTV: always divide by totalProjectCost for project deals
        // Formula: (Senior + Layer1 + Layer2...) / Total Project Cost
        const ltcBasis = isProjectDeal ? totalProjectCost : baseValue;
        let runningDebt = seniorLoan;
        const seniorLtv = ltcBasis > 0 ? (seniorLoan / ltcBasis) * 100 : 0;
        const layerLtvs = subLayers.map(layer => {
          runningDebt += parseCurrency(layer.amount);
          return ltcBasis > 0 ? (runningDebt / ltcBasis) * 100 : 0;
        });
        const totalDebt = seniorLoan + subLayers.reduce((s, l) => s + parseCurrency(l.amount), 0);
        // For project deals: stack balances when Senior + Layers + Equity = Total Project Cost
        // Total Debt = Total Project Cost - Borrower Equity
        const expectedDebt = isProjectDeal && totalProjectCost > 0 ? totalProjectCost - borrowerEquity : 0;
        const totalStack = totalDebt + borrowerEquity;
        const stackDiff = ltcBasis > 0 ? totalStack - ltcBasis : 0;
        const stackBalanced = Math.abs(stackDiff) < 1000;

        return (
          <div className="max-w-3xl">
            <div className={cardClass + " p-8"}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">
                    Property {hybridIndex + 1} of {hybridProperties.length}
                  </div>
                  <h2 className="font-display text-3xl font-bold text-[#0a1f44]">Capital Stack Builder</h2>
                </div>
                <button onClick={resetMatcher} className="text-xs text-gray-400 hover:text-gray-600 underline">Start Over</button>
              </div>

              <div className="space-y-5 mt-6">
                {/* Acquisition or Refinance */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Acquisition or Refinance?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Acquisition", "Refinance"] as const).map((opt) => (
                      <button key={opt} onClick={() => updHybrid("ownershipStatus", opt)} className={`p-3 rounded-xl border-2 text-left transition-all ${prop.ownershipStatus === opt ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}>
                        <div className="text-sm font-bold text-[#0a1f44]">{opt}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type of property */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Type of Property</label>
                  <Select value={prop.assetType} onValueChange={(v) => updHybrid("assetType", v)}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>{assetTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Deal Type */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-xs text-gray-500 font-bold uppercase">Deal Type</label>
                    <div className="relative group">
                      <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold cursor-help">i</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-[#0a1f44] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg">
                        Most transactions are considered "Investment"
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0a1f44]" />
                      </div>
                    </div>
                  </div>
                  <Select value={prop.dealType} onValueChange={(v) => updHybrid("dealType", v)}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>{dealTypes.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Capital Stack */}
                <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-4">Capital Stack</div>
                  <div className="space-y-3">

                    {isProjectDeal ? (
                      /* Project Deal: Purchase Price + Costs → Total Project Cost → Senior + Sub layers */
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Price</label>
                          <Input value={prop.purchasePrice} onChange={(e) => updHybrid("purchasePrice", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} />
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                          <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Project Costs</div>
                          {([
                            ["Hard Costs", "hardCosts"],
                            ["Soft Costs", "softCosts"],
                            ["Closing Costs", "closingCosts"],
                            ["Carrying Costs", "carryingCosts"],
                            ["Entitlement Costs", "entitlementCosts"],
                          ] as [string, keyof HybridProperty][]).map(([label, field]) => (
                            <div key={field} className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 w-36 shrink-0">{label}</label>
                              <Input value={String(prop[field] || "")} onChange={(e) => updHybrid(field, formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass + " flex-1"} />
                            </div>
                          ))}
                        </div>
                        {/* Total Project Cost — standalone, no "senior basis" label */}
                        {totalProjectCost > 0 && (
                          <div className="rounded-xl border-2 border-[#0a1f44] bg-[#0a1f44] p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wide">Total Project Cost</span>
                              <span className="text-xl font-bold text-white">{formatCurrencyInput(String(totalProjectCost))}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard deal: base value input */
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{isAcq ? "Purchase Price" : "Current Property Value / ARV"}</label>
                        <Input value={isAcq ? prop.purchasePrice : prop.currentValue} onChange={(e) => updHybrid(isAcq ? "purchasePrice" : "currentValue", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} />
                      </div>
                    )}

                    {/* Senior Loan — always manually entered, shows % of project cost or base value */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <label className="text-xs text-blue-700 mb-1 block font-bold uppercase">Senior Loan Amount</label>
                      <Input value={prop.seniorLoan} onChange={(e) => updHybrid("seniorLoan", formatCurrencyInput(e.target.value))} placeholder="$0" className="bg-white border-blue-200 text-gray-800 rounded-xl" />
                      {(() => {
                        const seniorAmt = parseCurrency(prop.seniorLoan);
                        const pct = ltcBasis > 0 && seniorAmt > 0 ? (seniorAmt / ltcBasis) * 100 : 0;
                        return pct > 0 ? (
                          <div className="text-xs text-blue-600 mt-1.5 font-semibold">
                            {pct.toFixed(1)}% of {isProjectDeal ? "Total Project Cost" : "Purchase Price"}
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Sub-capital layers */}
                    {subLayers.map((layer, lidx) => (
                      <div key={layer.id} className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Select value={layer.type} onValueChange={(v) => {
                              const updated = subLayers.map((l, i) => i === lidx ? { ...l, type: v } : l);
                              setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, subLayers: updated } : p));
                            }}>
                              <SelectTrigger className="bg-white border-purple-200 text-gray-800 rounded-xl h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                              <SelectContent>{["Mezzanine", "Preferred Equity", "JV Equity", "Stretch Senior"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                            </Select>
                            <span className="text-xs text-purple-500 font-medium">Layer {lidx + 1}</span>
                          </div>
                          {subLayers.length > 1 && (
                            <button onClick={() => {
                              const updated = subLayers.filter((_, i) => i !== lidx);
                              setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, subLayers: updated } : p));
                            }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          )}
                        </div>
                        <Input value={layer.amount} onChange={(e) => {
                          const updated = subLayers.map((l, i) => i === lidx ? { ...l, amount: formatCurrencyInput(e.target.value) } : l);
                          setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, subLayers: updated } : p));
                        }} placeholder="$0" className="bg-white border-purple-200 text-gray-800 rounded-xl" />
                        {layerLtvs[lidx] > 0 && (
                          <div className="text-xs text-purple-600 mt-1.5 font-semibold">
                            Last Dollar LTV: {layerLtvs[lidx].toFixed(1)}% of {isProjectDeal ? "Total Project Cost" : "Purchase Price"}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add sub-layer button */}
                    <button
                      onClick={() => {
                        const newLayer: HybridSubLayer = { id: Date.now(), type: "Preferred Equity", amount: "" };
                        setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, subLayers: [...p.subLayers, newLayer] } : p));
                      }}
                      className="w-full py-2 text-xs font-semibold border-2 border-dashed border-purple-300 text-purple-500 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
                    >
                      + Add Another Subordinate Layer
                    </button>

                    {/* Borrower equity — auto-suggested as Total Project Cost - Total Debt */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <label className="text-xs text-emerald-700 mb-1 block font-bold uppercase">Borrower Equity / Cash</label>
                      {(() => {
                        const seniorAmt = parseCurrency(prop.seniorLoan);
                        const layersTotal = subLayers.reduce((s, l) => s + parseCurrency(l.amount), 0);
                        const currentDebt = seniorAmt + layersTotal;
                        const suggestedEquity = ltcBasis > 0 && currentDebt < ltcBasis ? ltcBasis - currentDebt : 0;
                        return (
                          <>
                            <Input
                              value={prop.borrowerEquity}
                              onChange={(e) => updHybrid("borrowerEquity", formatCurrencyInput(e.target.value))}
                              placeholder={suggestedEquity > 0 ? `Suggested: ${formatCurrencyInput(String(suggestedEquity))}` : "$0"}
                              className="bg-white border-emerald-200 text-gray-800 rounded-xl"
                            />
                            {suggestedEquity > 0 && !prop.borrowerEquity && (
                              <button
                                type="button"
                                onClick={() => updHybrid("borrowerEquity", formatCurrencyInput(String(suggestedEquity)))}
                                className="mt-2 text-xs text-emerald-700 font-semibold hover:underline"
                              >
                                Use suggested: {formatCurrencyInput(String(suggestedEquity))}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Stack summary */}
                    {(baseValue > 0 || totalProjectCost > 0) && (() => {
                      const seniorAmt = parseCurrency(prop.seniorLoan);
                      const basis = ltcBasis;
                      const seniorPct = basis > 0 && seniorAmt > 0 ? (seniorAmt / basis) * 100 : 0;
                      let rd = seniorAmt;
                      const layerPcts = subLayers.map(layer => {
                        rd += parseCurrency(layer.amount);
                        return basis > 0 ? (rd / basis) * 100 : 0;
                      });
                      const td = seniorAmt + subLayers.reduce((s, l) => s + parseCurrency(l.amount), 0);
                      const eq = parseCurrency(prop.borrowerEquity);
                      const totalStackAmt = td + eq;
                      const diff = basis > 0 ? totalStackAmt - basis : 0;
                      const balanced = Math.abs(diff) < 1000;
                      // For project deals: expected debt = total project cost - equity
                      const expectedTotalDebt = isProjectDeal && basis > 0 ? basis - eq : 0;
                      return (
                        <div className={`rounded-xl border p-4 ${balanced ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                          <div className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-600">Stack Summary</div>
                          <div className="space-y-1">
                            {isProjectDeal && <div className="flex justify-between text-xs font-semibold border-b border-gray-200 pb-1 mb-1"><span className="text-gray-600">Total Project Cost</span><span className="text-[#0a1f44]">{formatCurrencyInput(String(totalProjectCost))}</span></div>}
                            {!isProjectDeal && <div className="flex justify-between text-xs"><span className="text-gray-500">{isAcq ? "Purchase Price" : "Property Value"}</span><span className="font-bold text-[#0a1f44]">{formatCurrencyInput(String(basis))}</span></div>}
                            <div className="flex justify-between text-xs"><span className="text-blue-600">Senior {seniorPct > 0 ? `(${seniorPct.toFixed(1)}% of cost)` : ""}</span><span className="font-bold text-[#0a1f44]">{prop.seniorLoan || "—"}</span></div>
                            {subLayers.map((layer, lidx) => (
                              <div key={layer.id} className="flex justify-between text-xs">
                                <span className="text-purple-600">{layer.type} {layerPcts[lidx] > 0 ? `(${layerPcts[lidx].toFixed(1)}% last $ of cost)` : ""}</span>
                                <span className="font-bold text-[#0a1f44]">{layer.amount || "—"}</span>
                              </div>
                            ))}
                            {isProjectDeal && eq > 0 && (
                              <div className="flex justify-between text-xs text-emerald-700">
                                <span className="font-medium">Borrower Equity (deducted)</span>
                                <span className="font-bold">− {formatCurrencyInput(String(eq))}</span>
                              </div>
                            )}
                            {!isProjectDeal && eq > 0 && (
                              <div className="flex justify-between text-xs"><span className="text-emerald-600">Borrower Equity</span><span className="font-bold text-[#0a1f44]">{prop.borrowerEquity}</span></div>
                            )}
                            <div className="flex justify-between text-xs pt-1 border-t border-gray-200 mt-1 font-bold">
                              <span className="text-gray-700">Total Debt</span>
                              <span className="text-[#0a1f44]">{formatCurrencyInput(String(td))}</span>
                            </div>
                            {/* Gap / Surplus shown directly under Total Debt */}
                            {!balanced && (
                              <div className={`flex justify-between text-xs font-bold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                <span>{diff > 0 ? "Surplus" : "Gap"}</span>
                                <span>{formatCurrencyInput(String(Math.abs(diff)))}</span>
                              </div>
                            )}
                            {balanced && (
                              <div className="text-xs font-bold text-emerald-600 text-center pt-1">✓ Stack Balances</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Full property details */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-4">Property Details</div>
                  <div className="space-y-4">
                    <AddressFields address={prop.address || blankAddress()} onChange={(a) => setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, address: a } : p))} inputClass={inputClass} />

                    {/* Recourse only — deal type already shown above */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Recourse</label>
                      <Select value={prop.recourseType} onValueChange={(v) => updHybrid("recourseType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
                    </div>

                    {showUnits && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Units</label><Input value={prop.numUnits} onChange={(e) => updHybrid("numUnits", e.target.value)} placeholder="e.g. 120" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Buildings</label><Input value={prop.numBuildings} onChange={(e) => updHybrid("numBuildings", e.target.value)} placeholder="e.g. 4" className={inputClass} /></div>
                      </div>
                    )}
                    {showAcres && <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Acres</label><Input value={prop.numAcres} onChange={(e) => updHybrid("numAcres", e.target.value)} placeholder="e.g. 12.5" className={inputClass} /></div>}

                    {isAcq ? (
                      /* Acquisition: ARV Net Income + Cap Rate → ARV Value */
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">ARV Net Income (Estimated)</label><Input value={prop.currentNetIncome} onChange={(e) => { const v = formatCurrencyInput(e.target.value); updHybrid("currentNetIncome", v); }} placeholder="$0" className={inputClass} /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Cap Rate % (Estimated)</label><Input value={prop.dscr} onChange={(e) => updHybrid("dscr", e.target.value)} placeholder="e.g. 5.5" className={inputClass} /></div>
                        </div>
                        {/* ARV Value — auto-calc or manual */}
                        {(() => {
                          const arvNetIncome = parseCurrency(prop.currentNetIncome);
                          const capRate = parseFloat(prop.dscr || "0") / 100;
                          const autoArv = arvNetIncome > 0 && capRate > 0 ? arvNetIncome / capRate : 0;
                          const displayArv = parseCurrency(prop.arvValue || "") || autoArv;
                          return (
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">ARV Value</label>
                              <Input
                                value={prop.arvValue || (autoArv > 0 ? formatCurrencyInput(String(Math.round(autoArv))) : "")}
                                onChange={(e) => updHybrid("arvValue", formatCurrencyInput(e.target.value))}
                                placeholder={autoArv > 0 ? `Auto: ${formatCurrencyInput(String(Math.round(autoArv)))}` : "Enter manually or fill fields above"}
                                className={inputClass}
                              />
                              {autoArv > 0 && !prop.arvValue && <div className="text-xs text-gray-400 mt-1">Auto-calculated from Net Income ÷ Cap Rate</div>}
                            </div>
                          );
                        })()}

                        {/* Total ARV LTV metric boxes */}
                        {(() => {
                          const arvNetIncome = parseCurrency(prop.currentNetIncome);
                          const capRate = parseFloat(prop.dscr || "0") / 100;
                          const autoArv = arvNetIncome > 0 && capRate > 0 ? arvNetIncome / capRate : 0;
                          const arvVal = parseCurrency(prop.arvValue || "") || autoArv;
                          const totalDebtNow = (isProjectDeal ? totalProjectCost : parseCurrency(prop.seniorLoan)) + subLayers.reduce((s, l) => s + parseCurrency(l.amount), 0);
                          const totalArvLtv = arvVal > 0 && totalDebtNow > 0 ? (totalDebtNow / arvVal) * 100 : 0;
                          const seniorArvLtv = arvVal > 0 ? ((isProjectDeal ? totalProjectCost : parseCurrency(prop.seniorLoan)) / arvVal) * 100 : 0;
                          if (arvVal === 0) return null;
                          return (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#0a1f44] p-4 text-center">
                                <div className="text-xs text-[#c9a84c] font-bold uppercase tracking-wide mb-1">Total ARV LTV</div>
                                <div className="text-2xl font-bold text-white">{totalArvLtv.toFixed(1)}%</div>
                                <div className="text-xs text-gray-400 mt-1">Total Debt ÷ ARV</div>
                              </div>
                              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4 text-center">
                                <div className="text-xs text-[#0a1f44] font-bold uppercase tracking-wide mb-1">Senior ARV LTV</div>
                                <div className="text-2xl font-bold text-[#0a1f44]">{seniorArvLtv.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500 mt-1">Senior ÷ ARV</div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      /* Refinance: keep current net income + DSCR */
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Net Income (Annual)</label><Input value={prop.currentNetIncome} onChange={(e) => updHybrid("currentNetIncome", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">DSCR</label><Input value={prop.dscr} onChange={(e) => updHybrid("dscr", e.target.value)} placeholder="e.g. 1.25" className={inputClass} /></div>
                      </div>
                    )}

                    {/* Target States */}
                    <div>
                      <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">Target States</label>
                      <div className="mb-2 flex gap-2">
                        <button type="button" onClick={() => setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, selectedStates: allStates } : p))} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">All States</button>
                        <button type="button" onClick={() => setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, selectedStates: [] } : p))} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">Clear</button>
                      </div>
                      <div className="grid max-h-32 grid-cols-6 gap-1.5 overflow-auto rounded-xl border border-gray-200 bg-white p-3">
                        {allStates.map(s => (
                          <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={(prop.selectedStates || []).includes(s)} onChange={() => {
                              const cur = prop.selectedStates || [];
                              const updated = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
                              setHybridProperties(prev => prev.map((p, i) => i === hybridIndex ? { ...p, selectedStates: updated } : p));
                            }} className="accent-[#0a1f44]" />
                            <span className="text-gray-600">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Additional Notes</label>
                      <textarea value={prop.notes} onChange={(e) => updHybrid("notes", e.target.value)} placeholder="Any additional context about this property or deal..." rows={2} className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => { if (hybridIndex > 0) setHybridIndex(i => i - 1); else setMatcherStep("hybrid-count"); }} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Previous</button>
                <button onClick={() => { if (hybridIndex < hybridProperties.length - 1) setHybridIndex(i => i + 1); else setMatcherStep("review"); }} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
                  {hybridIndex < hybridProperties.length - 1 ? <>Next Property <ChevronRight className="h-4 w-4" /></> : <>Review & Confirm <CheckCircle className="h-4 w-4" /></>}
                </button>
              </div>
              {hybridProperties.length > 1 && (
                <div className="flex gap-2 mt-4 justify-center">
                  {hybridProperties.map((_, idx) => (
                    <button key={idx} onClick={() => setHybridIndex(idx)} className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${idx === hybridIndex ? "bg-[#0a1f44] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{idx + 1}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {matcherStep === "asset-form" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className={cardClass + " p-6"}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">{assets.length > 1 ? `Asset ${currentAssetIndex + 1} of ${assets.length}` : "Asset Details"}</div>
                <h2 className="font-display text-2xl font-bold text-[#0a1f44]">{assets.length > 1 ? `Asset ${currentAssetIndex + 1}` : "Deal Details"}</h2>
              </div>
              {aiParsed && (<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20"><Sparkles className="h-3 w-3 text-[#c9a84c]" /><span className="text-xs font-semibold text-[#0a1f44]">AI-filled</span></div>)}
            </div>
            {aiParsed && (<div className="mb-4 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs text-gray-600">Parameters filled by AI. Review and edit any field below.</span></div><button onClick={() => setAiParsed(false)} className="text-xs text-gray-400 hover:text-gray-600 underline">Dismiss</button></div>)}
            {prefillBanner && (<div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-blue-500" /><span className="text-xs text-blue-700 font-medium">{prefillBanner}</span></div><button onClick={() => setPrefillBanner("")} className="text-xs text-blue-400 hover:text-blue-600 underline">Dismiss</button></div>)}
            <AssetForm asset={assets[currentAssetIndex]} capitalType={capitalType} onUpdate={updateAsset} tenantDatabase={tenantDatabase} onTenantAdd={addTenant} inputClass={inputClass} selectTriggerClass={selectTriggerClass} />
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <button onClick={handlePrevAsset} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Previous</button>
              <button onClick={handleNextAsset} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
                {currentAssetIndex < assets.length - 1 ? (<>Next Asset <ChevronRight className="h-4 w-4" /></>) : (<>Review & Confirm <CheckCircle className="h-4 w-4" /></>)}
              </button>
            </div>
          </div>
          {assets.length > 1 && (
            <div className={cardClass + " p-6"}>
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Portfolio</div>
              <h2 className="font-display text-xl font-bold text-[#0a1f44] mb-4">Assets Overview</h2>
              <div className="space-y-3">
                {assets.map((a, idx) => (
                  <div key={a.id} className={`rounded-xl border p-3 cursor-pointer transition-all ${idx === currentAssetIndex ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 bg-gray-50 hover:border-[#0a1f44]/30"}`} onClick={() => setCurrentAssetIndex(idx)}>
                    <div className="flex items-center justify-between">
                      <div><div className="text-xs font-bold text-[#0a1f44]">Asset {idx + 1}</div><div className="text-xs text-gray-500 mt-0.5">{a.assetType} · {a.ownershipStatus}</div>{a.address?.city && <div className="text-xs text-gray-400 mt-0.5">{a.address.city}, {a.address.state}</div>}{a.loanAmount && <div className="text-xs font-semibold text-[#c9a84c] mt-1">{a.loanAmount}</div>}</div>
                      {idx < currentAssetIndex && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      {idx === currentAssetIndex && <div className="w-2 h-2 rounded-full bg-[#0a1f44]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {matcherStep === "review" && (
        <div className="max-w-4xl">
          <div className={cardClass + " p-8"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Final Review</div>
            <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Review & Confirm</h2>

            {/* Hybrid review */}
            {capitalType === "Stretch Senior/Hybrid" && hybridProperties.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 mb-8">
                {hybridProperties.map((prop, idx) => {
                  const baseVal = parseCurrency(prop.ownershipStatus === "Acquisition" ? prop.purchasePrice : prop.currentValue);
                  const seniorLoan = parseCurrency(prop.seniorLoan);
                  const subLayers = prop.subLayers || [];
                  let runningDebt = seniorLoan;
                  const totalDebt = seniorLoan + subLayers.reduce((s, l) => s + parseCurrency(l.amount), 0);
                  const totalLtv = baseVal > 0 ? (totalDebt / baseVal) * 100 : 0;
                  return (
                    <div key={prop.id} className="rounded-xl border-2 border-gray-200 p-5 hover:border-[#0a1f44]/30 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Property {idx + 1}</div>
                          <div className="text-base font-bold text-[#0a1f44]">{prop.assetType}</div>
                          <div className="text-xs text-gray-500">{prop.ownershipStatus} · {prop.dealType}</div>
                          {prop.address?.city && <div className="text-xs text-gray-400 mt-0.5">{prop.address.city}, {prop.address.state}</div>}
                        </div>
                        <button onClick={() => { setHybridIndex(idx); setMatcherStep("hybrid-form"); }} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10"><Edit2 className="h-3 w-3" /> Edit</button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-gray-400">{prop.ownershipStatus === "Acquisition" ? "Purchase Price" : "Property Value"}</span><span className="font-bold text-[#0a1f44]">{prop.ownershipStatus === "Acquisition" ? prop.purchasePrice || "—" : prop.currentValue || "—"}</span></div>
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-500 font-medium">Senior ({baseVal > 0 ? ((seniorLoan/baseVal)*100).toFixed(1) : 0}% LTV)</span>
                          <span className="font-bold text-[#0a1f44]">{prop.seniorLoan || "—"}</span>
                        </div>
                        {subLayers.map((layer) => {
                          runningDebt += parseCurrency(layer.amount);
                          const lastDollarLtv = baseVal > 0 ? (runningDebt / baseVal) * 100 : 0;
                          return (
                            <div key={layer.id} className="flex justify-between text-xs">
                              <span className="text-purple-500 font-medium">{layer.type} ({lastDollarLtv.toFixed(1)}% last $)</span>
                              <span className="font-bold text-[#0a1f44]">{layer.amount || "—"}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-xs"><span className="text-emerald-600 font-medium">Borrower Equity</span><span className="font-bold text-[#0a1f44]">{prop.borrowerEquity || "—"}</span></div>
                        {totalLtv > 0 && <div className="flex justify-between text-xs pt-1 border-t border-gray-100"><span className="text-gray-400">Total LTV</span><span className="font-bold text-[#0a1f44]">{totalLtv.toFixed(1)}%</span></div>}
                        {prop.currentNetIncome && <div className="flex justify-between text-xs"><span className="text-gray-400">Net Income</span><span className="font-bold text-[#0a1f44]">{prop.currentNetIncome}</span></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 mb-8">
                {assets.map((asset, idx) => {
                  const m = calcMetrics(asset, capitalType);
                  return (
                    <div key={asset.id} className="rounded-xl border-2 border-gray-200 p-5 hover:border-[#0a1f44]/30 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div><div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Asset {idx + 1}</div><div className="text-base font-bold text-[#0a1f44]">{asset.assetType}</div><div className="text-xs text-gray-500">{asset.ownershipStatus} · {asset.dealType}</div>{asset.address?.city && <div className="text-xs text-gray-400 mt-0.5">{asset.address.street ? `${asset.address.street}, ` : ""}{asset.address.city}, {asset.address.state} {asset.address.zip}</div>}</div>
                        <button onClick={() => { setCurrentAssetIndex(idx); setMatcherStep("asset-form"); }} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium"><Edit2 className="h-3 w-3" /> Edit</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[["Loan Amount", asset.loanAmount || "—"], ["Property Value", asset.propertyValue || "—"], ["Senior LTV", formatPercent(m.seniorLtv)], ["States", asset.selectedStates.length > 0 ? asset.selectedStates.slice(0, 3).join(", ") + (asset.selectedStates.length > 3 ? `+${asset.selectedStates.length - 3}` : "") : "None"]].map(([label, val]) => (
                          <div key={String(label)} className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-400 mb-0.5">{label}</div><div className="text-xs font-bold text-[#0a1f44]">{val}</div></div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Editable summary fields */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-6 space-y-4">
              <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Quick Edit — Final Details</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Borrower Name</label>
                  <input value={seekerName || ""} readOnly
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Loan Amount</label>
                  <input value={assets[0]?.loanAmount || ""} onChange={e => setAssets(prev => prev.map((a,i) => i===0 ? {...a, loanAmount: e.target.value} : a))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Value</label>
                  <input value={assets[0]?.propertyValue || ""} onChange={e => setAssets(prev => prev.map((a,i) => i===0 ? {...a, propertyValue: e.target.value} : a))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">DSCR</label>
                  <input value={assets[0]?.dscr || ""} onChange={e => setAssets(prev => prev.map((a,i) => i===0 ? {...a, dscr: e.target.value} : a))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Net Income (NOI)</label>
                  <input value={assets[0]?.currentNetIncome || ""} onChange={e => setAssets(prev => prev.map((a,i) => i===0 ? {...a, currentNetIncome: e.target.value} : a))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Capital Type</label>
                  <div className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-600">{capitalType}</div></div>
              </div>

            </div>

            <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#0a1f44]">
                  {capitalType === "Stretch Senior/Hybrid" ? `${hybridProperties.length} propert${hybridProperties.length > 1 ? "ies" : "y"}` : `${assets.length} asset${assets.length > 1 ? "s" : ""}`} · {capitalType}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{collateralMode === "crossed" ? "Crossed Collateral" : collateralMode === "separate" ? "Treated Separately" : "Single asset"}</div>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => {
                if (capitalType === "Stretch Senior/Hybrid") { setHybridIndex(hybridProperties.length - 1); setMatcherStep("hybrid-form"); }
                else { setCurrentAssetIndex(0); setMatcherStep("asset-form"); }
              }} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Back</button>
              <button onClick={() => {
                if (capitalSeekerMode && onSubmitDeal) {
                  const advisors = assignAdvisors(capitalType, teamMembers);
                  setAssignedAdvisors(advisors);
                  onSubmitDeal(assets, capitalType, assetMode, collateralMode);
                }
                setMatcherStep("results");
              }} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
                {capitalSeekerMode ? "Submit Deal" : "Run Lender Match"} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {matcherStep === "results" && (
        <div>
          {capitalSeekerMode ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <div className={cardClass + " p-10 text-center"}>
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-5"><CheckCircle className="h-8 w-8 text-emerald-500" /></div>
                <div className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Deal Submitted!</div>
                <p className="text-gray-500 text-sm mb-6">Thank you{seekerName ? `, ${seekerName}` : ""}. Your deal has been received and a CapMoon capital advisor will review it and be in touch shortly.</p>
                <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 mb-6 text-left">
                  <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Deal Summary</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Capital Type: <span className="font-semibold text-[#0a1f44]">{capitalType}</span></div>
                    <div>Assets: <span className="font-semibold text-[#0a1f44]">{assets.length} asset{assets.length > 1 ? "s" : ""}</span></div>
                    {assets[0]?.loanAmount && <div>Loan Amount: <span className="font-semibold text-[#0a1f44]">{assets[0].loanAmount}</span></div>}
                    {assets[0]?.assetType && <div>Asset Type: <span className="font-semibold text-[#0a1f44]">{assets[0].assetType}</span></div>}
                    {assets[0]?.address?.city && <div>Location: <span className="font-semibold text-[#0a1f44]">{assets[0].address.city}, {assets[0].address.state}</span></div>}
                  </div>
                </div>
                {/* Deal Team Box */}
                <div className="rounded-2xl bg-[#0a1f44] p-6 mb-6 text-left">
                  <div className="text-xs uppercase tracking-[0.25em] text-[#c9a84c] font-bold mb-4">Your Deal Team</div>
                  <div className="space-y-4">
                    {(assignedAdvisors.length > 0 ? assignedAdvisors : teamMembers).map((advisor, idx) => (
                      <div key={advisor.id} className={`flex items-center gap-4 ${idx > 0 ? "border-t border-[#c9a84c]/10 pt-4" : ""}`}>
                        <img src={advisor.photo || "/logo1.JPEG"} alt={advisor.name} className="h-16 w-16 rounded-xl object-cover border-2 border-[#c9a84c]/30 flex-shrink-0" />
                        <div>
                          <div className="font-display text-lg font-bold text-white">{advisor.name}</div>
                          <div className="text-xs text-[#c9a84c] font-medium mt-0.5">{advisor.title}</div>
                          <div className="mt-2 space-y-1">
                            <a href={`mailto:${advisor.email}`} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors"><span className="text-[#c9a84c]">✉</span> {advisor.email}</a>
                            <a href={`tel:${advisor.phone.replace(/-/g, "")}`} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors"><span className="text-[#c9a84c]">📱</span> {advisor.phone} (Mobile)</a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={resetMatcher} className="px-6 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Submit Another Deal</button>
              </div>
            </motion.div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">Match Results</div>
                  <h2 className="font-display text-3xl font-bold text-[#0a1f44]">Ranked Output</h2>
                  <p className="text-sm text-gray-500 mt-1">{collateralMode === "crossed" ? "Combined portfolio" : collateralMode === "separate" ? "Individual asset matching" : "Single asset"}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMatcherStep("review")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Back</button>
                  <button onClick={resetMatcher} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">New Deal</button>
                </div>
              </div>
              {matchResults.length === 0 ? (
                <div className={cardClass + " p-8 text-center"}><div className="text-lg font-bold text-[#0a1f44] mb-2">No matches found</div><div className="text-sm text-gray-500">Try adjusting your deal criteria or add more lenders.</div></div>
              ) : collateralMode === "separate" && assetMode === "multiple" ? (
                assets.map((asset) => {
                  const assetMatches = matchResults.filter((r: any) => r.assetId === asset.id);
                  return (
                    <div key={asset.id} className="mb-6">
                      <div className="text-sm font-bold text-[#0a1f44] mb-3 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#0a1f44] text-white flex items-center justify-center text-xs font-bold">{asset.id}</div>Asset {asset.id} — {asset.assetType}{asset.address?.city ? ` · ${asset.address.city}, ${asset.address.state}` : ""}</div>
                      {assetMatches.length === 0 ? (<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">No matches for this asset.</div>) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {assetMatches.map((match: any) => {
                            const ml = matchLabel(match.score);
                            return (
                              <div key={String(match.id) + "-" + asset.id} className={`rounded-xl border bg-white p-4 hover:shadow-sm transition-all ${ml.border}`}>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div><div className="text-sm font-bold text-[#0a1f44]">{match.lender}</div><div className="text-xs text-gray-500 mt-0.5">{match.program}</div></div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-lg font-bold text-[#0a1f44]">{match.score}</div>
                                    <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 ${ml.bg} ${ml.color} ${ml.border}`}>{ml.label}</div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">{[["Capital", match.type], ["Contact", match.email || "—"]].map(([label, val]) => (<div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2"><div className="text-xs uppercase text-[#0a1f44] font-bold mb-0.5">{label}</div><div className="text-xs text-gray-600 break-all">{val}</div></div>))}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {matchResults.map((match: any, idx: number) => {
                    const ml = matchLabel(match.score);
                    return (
                      <div key={match.id} className={`rounded-xl border bg-white p-5 hover:shadow-sm transition-all ${ml.border} ${!capitalSeekerMode ? "cursor-pointer" : ""}`} onClick={() => !capitalSeekerMode && setSelectedMatchIds && setSelectedMatchIds((p: number[]) => p.includes(match.id) ? p.filter((x: number) => x !== match.id) : [...p, match.id])}>
                      {!capitalSeekerMode && (
                        <div className="flex items-center justify-between mb-2">
                          <input type="checkbox" checked={selectedMatchIds?.includes(match.id) ?? true}
                            onChange={() => setSelectedMatchIds && setSelectedMatchIds((p: number[]) => p.includes(match.id) ? p.filter((x: number) => x !== match.id) : [...p, match.id])}
                            className="accent-[#0a1f44] w-4 h-4" onClick={e => e.stopPropagation()} />
                          <span className="text-xs text-gray-400">{selectedMatchIds?.includes(match.id) ?? true ? "Selected" : "Deselected"}</span>
                        </div>
                      )}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full border inline-block mb-2 ${ml.bg} ${ml.color} ${ml.border}`}>{ml.label}</div>
                            <div className="text-base font-bold text-[#0a1f44]">{match.lender}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{match.program}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-400 mb-0.5">Score</div>
                            <div className="text-2xl font-bold text-[#0a1f44]">{match.score}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">{[["Capital", match.type], ["Range", `${match.minLoan}–${match.maxLoan}`], ["Recourse", match.nr], ["Contact", match.email || "—"]].map(([label, val]) => (<div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2"><div className="text-xs uppercase text-[#0a1f44] font-bold mb-0.5">{label}</div><div className="text-xs text-gray-600 break-all">{val}</div></div>))}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Login Wall ───────────────────────────────────────────────────────────────

function LoginWall({ onLogin, users, onRegisterCapitalSeeker }: { onLogin: (session: AuthSession) => void; users: AppUser[]; onRegisterCapitalSeeker: (user: AppUser) => void }) {
  const [mode, setMode] = useState<"" | "client" | "capital-choice" | "capital-register" | "capital-verify" | "capital-login">(""); 
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [error, setError] = useState("");
  // Registration fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  // Verification
  const [verifyCode, setVerifyCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);

  function handleClientLogin() {
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) { setError("Username not found."); return; }
    if (user.password !== password) { setError("Incorrect password. If you forgot it, please contact your admin."); return; }
    setError(""); onLogin({ user });
  }

  function handleCapitalLogin() {
    const user = users.find((u) => u.role === "capital-seeker" && u.username.toLowerCase() === username.toLowerCase());
    if (!user) { setError("Account not found. Please register first."); return; }
    if (user.password !== password) { setError("Incorrect password."); return; }
    setError(""); onLogin({ user });
  }

  function handleRegisterSubmit() {
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword.trim()) { setError("Please fill in all fields."); return; }
    if (regPassword !== regPassword2) { setError("Passwords do not match."); return; }
    if (users.find((u) => u.username.toLowerCase() === regEmail.toLowerCase())) { setError("An account with this email already exists. Please log in."); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const newUser: AppUser = { id: Date.now(), username: regEmail, password: regPassword, role: "capital-seeker", name: regName, blockedLenderIds: [], phone: regPhone, email: regEmail };
    setGeneratedCode(code);
    setPendingUser(newUser);
    setError("");
    setMode("capital-verify");
  }

  function handleVerifySubmit() {
    if (verifyCode.trim() !== generatedCode) { setError("Incorrect code. Please try again."); return; }
    if (!pendingUser) return;
    onRegisterCapitalSeeker(pendingUser);
    setError("");
    onLogin({ user: pendingUser });
  }

  const sidebarNav = [["Overview", Gauge], ["Lender Programs", Landmark], ["Add Lender", Plus], ["Deal Matcher", Filter], ["Deal Team", Users], ["Upload Center", FileSpreadsheet]];

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">
      {/* Locked sidebar preview */}
      <div className="hidden lg:flex flex-col w-[260px] bg-[#0a1f44] border-r border-[#c9a84c]/10 relative flex-shrink-0">
        <div className="px-6 py-8 border-b border-[#c9a84c]/20">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
            <div><div className="font-display text-2xl font-bold text-white">CapMoon</div><div className="text-xs text-gray-400 tracking-wide">Lender Intelligence Platform</div></div>
          </div>
          <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-3">Investment Banking</div>
        </div>
        <nav className="space-y-1 p-4 flex-1 opacity-40 pointer-events-none select-none">
          {sidebarNav.map(([label, Icon]: any) => (
            <div key={String(label)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-gray-300 border border-transparent">
              <Icon className="h-4 w-4 flex-shrink-0" /><span className="text-sm font-medium tracking-wide">{label}</span>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-[#c9a84c]/20 opacity-40">
          <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
            <p className="text-xs text-gray-300 leading-relaxed">Spreadsheet-driven criteria plus dashboard lenders.</p>
          </div>
        </div>
        <div className="absolute inset-0 bg-[#0a1f44]/60 backdrop-blur-[2px] flex items-center justify-center">
          <div className="text-center"><Lock className="h-8 w-8 text-[#c9a84c] mx-auto mb-2" /><div className="text-xs text-gray-300 font-medium">Login Required</div></div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo1.JPEG" alt="CapMoon" className="h-16 w-16 object-contain rounded-full mx-auto mb-4" />
            <div className="font-display text-4xl font-bold text-[#0a1f44] mb-1">CapMoon</div>
            <div className="text-sm text-gray-500">Premier Capital Search Platform</div>
          </div>

          {/* Main choice */}
          {mode === "" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <button onClick={() => setMode("client")} className="w-full p-6 rounded-2xl border-2 border-[#0a1f44] bg-[#0a1f44] text-white text-left hover:bg-[#0a1f44]/90 transition-all group">
                <div className="flex items-center justify-between"><div><div className="text-lg font-bold mb-1">CapMoon Client Login</div><div className="text-sm text-gray-300">Access the full lender intelligence dashboard</div></div><ChevronRight className="h-5 w-5 text-[#c9a84c] group-hover:translate-x-1 transition-transform" /></div>
              </button>
              <button onClick={() => setMode("capital-choice")} className="w-full p-6 rounded-2xl border-2 border-[#c9a84c]/30 bg-white text-left hover:border-[#c9a84c] transition-all group">
                <div className="flex items-center justify-between"><div><div className="text-lg font-bold text-[#0a1f44] mb-1">I Am Looking for Capital</div><div className="text-sm text-gray-500">Submit your deal for lender matching</div></div><ChevronRight className="h-5 w-5 text-[#c9a84c] group-hover:translate-x-1 transition-transform" /></div>
              </button>
            </motion.div>
          )}

          {/* Client login */}
          {mode === "client" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <button onClick={() => { setMode(""); setError(""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"><ChevronLeft className="h-3 w-3" /> Back</button>
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Secure Access</div>
              <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-6">Client Login</h2>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Username / Email</label><Input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleClientLogin()} placeholder="your@email.com" className="bg-white border-gray-300 text-gray-800 rounded-xl" /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Password</label>
                  <div className="relative"><Input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleClientLogin()} placeholder="••••••••" className="bg-white border-gray-300 text-gray-800 rounded-xl pr-10" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <button onClick={handleClientLogin} className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Sign In</button>
              </div>
            </motion.div>
          )}

          {/* Capital seeker — register or login choice */}
          {mode === "capital-choice" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <button onClick={() => { setMode(""); setError(""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"><ChevronLeft className="h-3 w-3" /> Back</button>
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Capital Search Portal</div>
              <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-2">Looking for Capital?</h2>
              <p className="text-sm text-gray-500 mb-6">Create an account to submit your deal and track its progress.</p>
              <div className="space-y-3">
                <button onClick={() => { setMode("capital-register"); setError(""); }} className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Create New Account</button>
                <button onClick={() => { setMode("capital-login"); setError(""); setUsername(""); setPassword(""); }} className="w-full py-3 text-sm font-medium border-2 border-gray-200 text-gray-600 rounded-xl hover:border-[#0a1f44]/30 hover:text-[#0a1f44]">I Already Have an Account</button>
              </div>
            </motion.div>
          )}

          {/* Capital seeker — login */}
          {mode === "capital-login" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <button onClick={() => { setMode("capital-choice"); setError(""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"><ChevronLeft className="h-3 w-3" /> Back</button>
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Capital Search Portal</div>
              <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-6">Sign In</h2>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Email Address</label><Input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCapitalLogin()} placeholder="your@email.com" className="bg-white border-gray-300 text-gray-800 rounded-xl" /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Password</label>
                  <div className="relative"><Input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCapitalLogin()} placeholder="••••••••" className="bg-white border-gray-300 text-gray-800 rounded-xl pr-10" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <button onClick={handleCapitalLogin} className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Sign In</button>
                <button onClick={() => { setMode("capital-register"); setError(""); }} className="w-full text-xs text-gray-400 hover:text-[#0a1f44] text-center">Don't have an account? Register here</button>
              </div>
            </motion.div>
          )}

          {/* Capital seeker — register */}
          {mode === "capital-register" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <button onClick={() => { setMode("capital-choice"); setError(""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"><ChevronLeft className="h-3 w-3" /> Back</button>
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Create Account</div>
              <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-6">Register</h2>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Full Name</label><Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="John Smith" className="bg-white border-gray-300 text-gray-800 rounded-xl" /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Email Address</label><Input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="john@example.com" className="bg-white border-gray-300 text-gray-800 rounded-xl" /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Phone Number</label><Input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="(305) 000-0000" className="bg-white border-gray-300 text-gray-800 rounded-xl" /></div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Password</label>
                  <div className="relative"><Input type={showPass ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" className="bg-white border-gray-300 text-gray-800 rounded-xl pr-10" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Confirm Password</label>
                  <div className="relative"><Input type={showPass2 ? "text" : "password"} value={regPassword2} onChange={(e) => setRegPassword2(e.target.value)} placeholder="••••••••" className="bg-white border-gray-300 text-gray-800 rounded-xl pr-10" /><button type="button" onClick={() => setShowPass2(!showPass2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <button onClick={handleRegisterSubmit} className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Create Account & Verify</button>
              </div>
            </motion.div>
          )}

          {/* Verification */}
          {mode === "capital-verify" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#0a1f44]/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-7 w-7 text-[#0a1f44]" />
                </div>
                <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Verification</div>
                <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-2">Check Your Email</h2>
                <p className="text-sm text-gray-500">We've sent a 6-digit verification code to <span className="font-semibold text-[#0a1f44]">{regEmail}</span></p>
              </div>
              {/* Simulated code display */}
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-4 mb-5 text-center">
                <div className="text-xs text-gray-500 mb-1">📧 Simulated email code:</div>
                <div className="font-display text-3xl font-bold text-[#0a1f44] tracking-[0.4em]">{generatedCode}</div>
                <div className="text-xs text-gray-400 mt-1">(In production this would be sent to your email)</div>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Enter 6-Digit Code</label><Input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleVerifySubmit()} placeholder="000000" maxLength={6} className="bg-white border-gray-300 text-gray-800 rounded-xl text-center text-lg tracking-[0.3em] font-bold" /></div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <button onClick={handleVerifySubmit} className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Verify & Enter Portal</button>
                <button onClick={() => { setMode("capital-register"); setError(""); setVerifyCode(""); }} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center">Go back and try again</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Capital Seeker Portal ────────────────────────────────────────────────────

function CapitalSeekerPortal({ lenderRecords, onLogout, onSubmitDeal, session, teamMembers, submittedDeals }: { lenderRecords: LenderRecord[]; onLogout: () => void; onSubmitDeal: (deal: SubmittedDeal) => void; session: AuthSession; teamMembers: TeamMember[]; submittedDeals: SubmittedDeal[] }) {
  const [activeTab, setActiveTab] = useState("matcher");
  const inputClass = "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-[#0a1f44] focus:ring-0";
  const selectTriggerClass = "bg-white border-gray-300 text-gray-800 rounded-xl focus:border-[#0a1f44]";
  const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";
  const myDeals = submittedDeals.filter((d) => d.seekerName === session?.user.name);

  async function handleSubmit(assets: AssetData[], capitalType: string, assetMode: string, collateralMode: string) {
    const advisors = assignAdvisors(capitalType, teamMembers);
    // Generate deal number
  let dealNumber = "";
  try {
    const dnRes = await fetch("/api/deal-number", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advisorEmail: session?.user.username, dealerName: session?.user.name, assetType: assets[0]?.assetType }) });
    const dnData = await dnRes.json();
    dealNumber = dnData.dealNumber || "";
  } catch(e) { console.error("Deal number error:", e); }

  const deal: SubmittedDeal = { id: Date.now(), submittedAt: new Date().toLocaleString(), seekerName: session?.user.name || "Guest", seekerEmail: session?.user.email || session?.user.username || "", seekerPhone: (session?.user as any).phone || "", assets, capitalType, assetMode, collateralMode, status: "pending", assignedAdvisorIds: advisors.map((a) => a.id), dealNumber };
    onSubmitDeal(deal);
    // Push to Pipedrive
    const advisor = advisors[0];
    if (advisor) {
      fetch("/api/pipedrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_deal",
          deal,
          seeker: { name: session?.user.name || "Guest", email: session?.user.email || session?.user.username || "", phone: session?.user.phone || "" },
          advisorName: advisor.name,
          advisorEmail: advisor.email,
        }),
      }).catch(e => console.error("Pipedrive sync failed:", e));
    }
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap'); * { font-family: 'Montserrat', sans-serif; } .font-display { font-family: 'Cormorant Garamond', serif; } [data-radix-select-content] { background: white !important; border: 1px solid #e5e7eb !important; color: #1f2937 !important; } [data-radix-select-item] { color: #1f2937 !important; } [data-radix-select-item]:hover, [data-radix-select-item][data-highlighted] { background: #f3f4f6 !important; color: #0a1f44 !important; }`}</style>
      <div className="min-h-screen bg-[#f0f2f5] text-gray-800">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:flex flex-col border-r border-[#c9a84c]/10 bg-[#0a1f44]">
            <div className="px-6 py-8 border-b border-[#c9a84c]/20">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
                <div><div className="font-display text-2xl font-bold text-white">CapMoon</div><div className="text-xs text-gray-400 tracking-wide">Capital Search Portal</div></div>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-3">Find Capital</div>
            </div>
            <nav className="space-y-1 p-4 flex-1">
              {([["matcher", "Deal Matcher", Filter], ["my-deals", "My Deals", FileSpreadsheet], ["uploads", "Upload Center", Upload]] as [string, string, any][]).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${activeTab === key ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30" : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  <Icon className="h-4 w-4" /><span className="text-sm font-medium">{label}</span>
                  {activeTab === key && <div className="ml-auto w-1 h-4 bg-[#c9a84c] rounded-full" />}
                </button>
              ))}
            </nav>
            <div className="p-4 space-y-3 border-t border-[#c9a84c]/20">
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
                <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
                <p className="text-xs text-gray-300 leading-relaxed">Tell us about your deal and we'll find the best advisors for you.</p>
              </div>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><LogOut className="h-3.5 w-3.5" /> Exit Portal</button>
            </div>
          </aside>
          <main className="p-6 md:p-8 overflow-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="mb-8">
                <div className="text-xs uppercase tracking-[0.28em] text-[#0a1f44] font-bold">Capital Search</div>
                <h1 className="font-display text-4xl font-bold text-[#0a1f44] mt-1">Find Your Lender</h1>
                <p className="mt-1 text-sm text-gray-500">CapMoon's Premier Capital Search Dashboard</p>
              </div>
              {activeTab === "matcher" && <DealMatcher lenderRecords={lenderRecords} capitalSeekerMode={true} onSubmitDeal={handleSubmit} seekerName={session?.user.name} teamMembers={teamMembers} inputClass={inputClass} selectTriggerClass={selectTriggerClass} cardClass={cardClass} />}
              {activeTab === "my-deals" && (
                <div className={cardClass + " p-6"}>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Your History</div>
                  <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">My Deals</h2>
                  {myDeals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                      <div className="text-sm font-bold text-[#0a1f44] mb-1">No deals submitted yet</div>
                      <div className="text-xs text-gray-400 mb-4">Submit a deal in the Deal Matcher tab to get started.</div>
                      <button onClick={() => setActiveTab("matcher")} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Go to Deal Matcher</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myDeals.map((deal) => (
                        <div key={deal.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Deal #{deal.id}</div>
                              <div className="text-xs text-gray-500">Submitted: {deal.submittedAt}</div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${deal.status === "pending" ? "bg-amber-50 text-amber-600 border border-amber-200" : deal.status === "assigned" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                              {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                            {[["Capital Type", deal.capitalType], ["Assets", `${deal.assets.length} asset${deal.assets.length > 1 ? "s" : ""}`], ["Loan Amount", deal.assets[0]?.loanAmount || "—"]].map(([label, val]) => (
                              <div key={String(label)} className="rounded-lg bg-white border border-gray-200 p-2.5">
                                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                                <div className="text-sm font-bold text-[#0a1f44]">{val}</div>
                              </div>
                            ))}
                          </div>
                          {deal.assets[0]?.address?.city && <div className="text-xs text-gray-500 mb-3">{deal.assets[0].address.city}, {deal.assets[0].address.state}</div>}
                          <div className="text-xs text-gray-500 mt-2">A CapMoon advisor will be in touch with you shortly regarding this deal.</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "uploads" && (
                <div className={cardClass + " p-6"}>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Documents</div>
                  <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Upload Center</h2>
                  <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center hover:border-[#0a1f44]/40 transition-all">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f44]/10 border border-[#0a1f44]/20 text-[#0a1f44] mb-4"><Upload className="h-6 w-6" /></div>
                    <div className="text-base font-bold text-[#0a1f44] mb-1">Upload Deal Documents</div>
                    <div className="text-sm text-gray-500 mb-5">Upload financials, rent rolls, or supporting documents.</div>
                    <button className="px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Select Files</button>
                  </div>
                </div>
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Main Portal (Admin + Advisor) ────────────────────────────────────────────

// ─── Deal Memo Tab ────────────────────────────────────────────────────────────

const MEMO_SECTIONS = ["Executive Summary", "Property Overview", "Capital Stack", "Market Overview", "Sponsor / Borrower Profile", "Financial Summary", "Lender Match Results"];

function DealMemoTab({ submittedDeals, teamMembers, lenderRecords, cardClass, inputClass, selectTriggerClass }: {
  submittedDeals: SubmittedDeal[]; teamMembers: TeamMember[]; lenderRecords: LenderRecord[];
  cardClass: string; inputClass: string; selectTriggerClass: string;
}) {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [memoSearch, setMemoSearch] = useState("");
  const [memoFilterCapital, setMemoFilterCapital] = useState("All");
  const [memoFilterAdvisor, setMemoFilterAdvisor] = useState("All");
  const [memoFilterStatus, setMemoFilterStatus] = useState("All");
  const [memoFilterAsset, setMemoFilterAsset] = useState("All");
  const [memoFields, setMemoFields] = useState<Record<string, string>>({});
  const [activeSections, setActiveSections] = useState<Record<string, boolean>>(Object.fromEntries(MEMO_SECTIONS.map(s => [s, true])));
  const [photos, setPhotos] = useState<{ id: number; name: string; url: string; caption: string }[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [exporting, setExporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedDeal = submittedDeals.find(d => d.id === selectedDealId);
  const asset = selectedDeal?.assets?.[0];
  const advisors = selectedDeal ? teamMembers.filter(m => selectedDeal.assignedAdvisorIds.includes(m.id)) : [];

  // Auto-populate memo fields when deal is selected
  React.useEffect(() => {
    if (!selectedDeal || !asset) return;
    setMemoFields({
      dealTitle: `${selectedDeal.seekerName} — ${asset.assetType} ${asset.dealType}`,
      borrowerName: selectedDeal.seekerName,
      propertyAddress: asset.address ? `${asset.address.street}, ${asset.address.city}, ${asset.address.state} ${asset.address.zip}` : "",
      assetType: asset.assetType || "",
      dealType: asset.dealType || "",
      capitalType: selectedDeal.capitalType || "",
      loanAmount: asset.loanAmount || "",
      propertyValue: asset.propertyValue || "",
      purchasePrice: asset.purchasePrice || "",
      ltv: asset.manualLtv || "",
      dscr: asset.dscr || "",
      currentNetIncome: asset.currentNetIncome || "",
      numUnits: asset.numUnits || "",
      recourse: asset.recourseType || "",
      states: (asset.selectedStates || []).join(", "),
      advisorName: advisors.map(a => a.name).join(", "),
      advisorEmail: advisors.map(a => a.email).join(", "),
      advisorPhone: advisors.map(a => a.phone).join(", "),
      executiveSummary: `${selectedDeal.seekerName} is seeking ${asset.loanAmount || "TBD"} in ${selectedDeal.capitalType} financing for a ${asset.dealType?.toLowerCase() || ""} ${asset.assetType?.toLowerCase() || ""} located at ${asset.address?.city || ""}, ${asset.address?.state || ""}.`,
      propertyOverview: `The subject property is a ${asset.numUnits ? asset.numUnits + "-unit " : ""}${asset.assetType?.toLowerCase() || ""} located at ${asset.address?.street || ""}, ${asset.address?.city || ""}, ${asset.address?.state || ""}. The deal is structured as a ${asset.dealType?.toLowerCase() || ""} with a ${asset.ownershipStatus?.toLowerCase() || ""}.`,
      capitalStackSection: `Loan Amount: ${asset.loanAmount || "TBD"}\nProperty Value / ARV: ${asset.propertyValue || "TBD"}\nCapital Type: ${selectedDeal.capitalType}\nLTV: ${asset.manualLtv || "TBD"}\nDSCR: ${asset.dscr || "TBD"}\nRecourse: ${asset.recourseType || "TBD"}`,
      sponsorProfile: `Borrower: ${selectedDeal.seekerName}\nCapital Requested: ${asset.loanAmount || "TBD"}\nProperty Type Experience: ${asset.assetType || "TBD"}`,
      financialSummary: `Net Operating Income: ${asset.currentNetIncome || "TBD"}\nLoan Amount: ${asset.loanAmount || "TBD"}\nProperty Value: ${asset.propertyValue || "TBD"}\nDSCR: ${asset.dscr || "TBD"}`,
    });
    // Pre-load deal photos if available
    if (selectedDeal.photos && selectedDeal.photos.length > 0) {
      setPhotos(selectedDeal.photos.map(p => ({ ...p, name: p.caption || "photo" })));
    }
    setMarketData(null);
    // Auto-fetch market data if we have a zip
    if (asset.address?.zip || asset.address?.city) {
      fetchMarketData(asset);
    }
  }, [selectedDealId]);

  async function fetchMarketData(assetData: AssetData) {
    setMarketLoading(true);
    setMarketError("");
    try {
      const zip = assetData.address?.zip || "";
      const city = assetData.address?.city || "";
      const state = assetData.address?.state || "";
      const assetType = assetData.assetType || "";
      const res = await fetch(`/api/market-data?zip=${zip}&city=${encodeURIComponent(city)}&state=${state}&assetType=${encodeURIComponent(assetType)}`);
      const data = await res.json();
      setMarketData(data);
      // Populate market overview field
      if (data.summary) {
        setMemoFields(prev => ({ ...prev, marketOverview: data.summary }));
      }
    } catch (e) {
      setMarketError("Could not load market data. You can enter it manually.");
    }
    setMarketLoading(false);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name,
          url: ev.target?.result as string,
          caption: "",
        }]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleExportWord() {
    if (!selectedDeal) return;
    setExporting(true);
    try {
      const res = await fetch("/api/deal-memo-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal: selectedDeal, memoFields, activeSections, marketData }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (memoFields.dealTitle || "DealMemo").replace(/[^a-zA-Z0-9]/g, "_") + ".doc";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else { alert("Word export failed. Please try again."); }
    } catch (e) { alert("Word export failed. Please try again."); }
    setExporting(false);
  }

  async function handleExportPDF() {
    if (!selectedDeal) return;
    setExporting(true);
    try {
      const res = await fetch("/api/deal-memo-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal: selectedDeal, memoFields, photos, activeSections, marketData }),
      });
      if (res.ok) {
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } catch (e) {
      alert("PDF export failed. Please try again.");
    }
    setExporting(false);
  }

  function upd(field: string, value: string) {
    setMemoFields(prev => ({ ...prev, [field]: value }));
  }

  const sectionFieldMap: Record<string, string> = {
    "Executive Summary": "executiveSummary",
    "Property Overview": "propertyOverview",
    "Capital Stack": "capitalStackSection",
    "Market Overview": "marketOverview",
    "Sponsor / Borrower Profile": "sponsorProfile",
    "Financial Summary": "financialSummary",
    "Lender Match Results": "lenderMatchResults",
  };

  return (
    <div className="space-y-6">
      <div className={cardClass + " p-6"}>
        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Admin</div>
        <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-1">Deal Memos</h2>
        <p className="text-sm text-gray-500 mb-6">Build professional deal memos from submitted deals. Add photos, market data, and export to PDF.</p>

        {/* Search + Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input value={memoSearch} onChange={e => setMemoSearch(e.target.value)}
              placeholder="Search by borrower, address, city, asset type, loan amount..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={memoFilterCapital} onChange={e => setMemoFilterCapital(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
              <option value="All">All Capital Types</option>
              {["Senior","Mezzanine","Preferred Equity","JV Equity","Bridge","Construction","Stretch Senior/Hybrid"].map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>
            <select value={memoFilterAsset} onChange={e => setMemoFilterAsset(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
              <option value="All">All Asset Types</option>
              {["Apartments","Office","Hotel/Hospitality","Retail-Multi Tenant","Light Industrial","Self-storage","Mixed-use","Medical Office"].map(at => <option key={at} value={at}>{at}</option>)}
            </select>
            <select value={memoFilterAdvisor} onChange={e => setMemoFilterAdvisor(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
              <option value="All">All Advisors</option>
              {teamMembers.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
            </select>
            <select value={memoFilterStatus} onChange={e => setMemoFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="closed">Closed</option>
            </select>
            {(memoSearch || memoFilterCapital !== "All" || memoFilterAsset !== "All" || memoFilterAdvisor !== "All" || memoFilterStatus !== "All") && (
              <button type="button" onClick={() => { setMemoSearch(""); setMemoFilterCapital("All"); setMemoFilterAsset("All"); setMemoFilterAdvisor("All"); setMemoFilterStatus("All"); }}
                className="px-3 py-2 text-xs text-red-400 border border-red-200 rounded-xl hover:bg-red-50">Clear ✕</button>
            )}
          </div>
        </div>

        {/* Deal card grid */}
        <div className="mb-2">
          <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">Select a Submitted Deal</label>
          {(() => {
            const filteredMemoDeals = submittedDeals.filter(d => {
              const asset = d.assets?.[0];
              const q = memoSearch.toLowerCase();
              if (q && ![d.seekerName, asset?.assetType, asset?.loanAmount, asset?.address?.city, asset?.address?.street, asset?.address?.state, asset?.dealType]
                .some(v => v?.toLowerCase().includes(q))) return false;
              if (memoFilterCapital !== "All" && d.capitalType !== memoFilterCapital) return false;
              if (memoFilterAsset !== "All" && asset?.assetType !== memoFilterAsset) return false;
              if (memoFilterAdvisor !== "All" && !d.assignedAdvisorIds.includes(parseInt(memoFilterAdvisor))) return false;
              if (memoFilterStatus !== "All" && d.status !== memoFilterStatus) return false;
              return true;
            });
            return filteredMemoDeals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No deals match your filters</div>
            ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {filteredMemoDeals.map(d => {
              const asset = d.assets?.[0];
              const isSelected = selectedDealId === d.id;
              const photo = d.photos?.[0]?.url || null;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDealId(d.id)}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all ${isSelected ? "border-[#c9a84c] shadow-md" : "border-gray-200 hover:border-[#0a1f44]/30"}`}
                >
                  {/* Photo or placeholder */}
                  <div className="h-28 relative" style={{ background: photo ? `url('${photo}') center/cover no-repeat` : "#0a1f44" }}>
                    {!photo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-white/20" />
                      </div>
                    )}
                    {/* Capital type badge */}
                    <div className="absolute top-2 left-2">
                      <div className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#c9a84c] text-[#0a1f44]">{d.capitalType}</div>
                    </div>
                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#c9a84c] flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-[#0a1f44]" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 bg-white">
                    <div className="font-bold text-[#0a1f44] text-sm truncate">{d.seekerName}</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{asset?.assetType || "CRE"} · {asset?.address?.city || ""}{asset?.address?.state ? `, ${asset.address.state}` : ""}</div>
                    <div className="text-sm font-bold text-[#c9a84c] mt-1.5">{asset?.loanAmount || "TBD"}</div>
                  </div>
                </button>
              );
            })}
          </div>
            );
          })()}
        </div>

        {!selectedDeal && submittedDeals.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-400">
            No submitted deals yet
          </div>
        )}

        {!selectedDeal && submittedDeals.length > 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400">
            Select a deal above to start building the memo
          </div>
        )}
      </div>

      {selectedDeal && (
        <>
          {/* Header info */}
          <div className={cardClass + " p-6"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Memo Header</div>
            <h3 className="font-display text-xl font-bold text-[#0a1f44] mb-4">Deal Information</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Deal Title</label><Input value={memoFields.dealTitle || ""} onChange={e => upd("dealTitle", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Borrower Name</label><Input value={memoFields.borrowerName || ""} onChange={e => upd("borrowerName", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Address</label><Input value={memoFields.propertyAddress || ""} onChange={e => upd("propertyAddress", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Asset Type</label><Input value={memoFields.assetType || ""} onChange={e => upd("assetType", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Capital Type</label><Input value={memoFields.capitalType || ""} onChange={e => upd("capitalType", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Loan Amount</label><Input value={memoFields.loanAmount || ""} onChange={e => upd("loanAmount", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Value / ARV</label><Input value={memoFields.propertyValue || ""} onChange={e => upd("propertyValue", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">LTV</label><Input value={memoFields.ltv || ""} onChange={e => upd("ltv", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">DSCR</label><Input value={memoFields.dscr || ""} onChange={e => upd("dscr", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Net Operating Income</label><Input value={memoFields.currentNetIncome || ""} onChange={e => upd("currentNetIncome", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Number of Units</label><Input value={memoFields.numUnits || ""} onChange={e => upd("numUnits", e.target.value)} className={inputClass} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Recourse</label><Input value={memoFields.recourse || ""} onChange={e => upd("recourse", e.target.value)} className={inputClass} /></div>
            </div>
          </div>

          {/* Market Data */}
          <div className={cardClass + " p-6"}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Auto-Populated</div>
                <h3 className="font-display text-xl font-bold text-[#0a1f44]">Market Data</h3>
                <p className="text-xs text-gray-500 mt-0.5">Based on {asset?.address?.city}, {asset?.address?.state} — {asset?.assetType}</p>
              </div>
              <button onClick={() => asset && fetchMarketData(asset)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-[#0a1f44]/20 text-[#0a1f44] rounded-xl hover:bg-[#0a1f44]/5">
                {marketLoading ? "Loading..." : "Refresh Data"}
              </button>
            </div>

            {marketLoading && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center text-sm text-gray-400 animate-pulse">Loading market data...</div>
            )}

            {marketError && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-4">{marketError}</div>
            )}

            {marketData && !marketLoading && (
              <div className="space-y-4">
                {/* Demographics */}
                {marketData.demographics && (
                  <div>
                    <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Demographics — {asset?.address?.zip || asset?.address?.city}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        ["Population", marketData.demographics.population],
                        ["Median Income", marketData.demographics.medianIncome],
                        ["Median Rent", marketData.demographics.medianRent],
                        ["Median Age", marketData.demographics.medianAge],
                      ].map(([label, val]) => val ? (
                        <div key={String(label)} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                          <div className="text-sm font-bold text-[#0a1f44]">{val}</div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}

                {/* Property type specific data */}
                {marketData.propertyData && (
                  <div>
                    <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">{asset?.assetType} Market Data</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(marketData.propertyData).map(([key, val]) => (
                        <div key={key} className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-3">
                          <div className="text-xs text-gray-400 mb-0.5">{key}</div>
                          <div className="text-sm font-bold text-[#0a1f44]">{String(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Memo Sections */}
          <div className={cardClass + " p-6"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Content</div>
            <h3 className="font-display text-xl font-bold text-[#0a1f44] mb-4">Memo Sections</h3>
            <p className="text-xs text-gray-500 mb-5">Toggle sections on/off. All content is pre-filled and fully editable.</p>
            <div className="space-y-4">
              {MEMO_SECTIONS.map(section => (
                <div key={section} className={`rounded-xl border ${activeSections[section] ? "border-[#0a1f44]/20" : "border-gray-100 opacity-50"} overflow-hidden`}>
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer" onClick={() => setActiveSections(prev => ({ ...prev, [section]: !prev[section] }))}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${activeSections[section] ? "border-[#0a1f44] bg-[#0a1f44]" : "border-gray-300"}`}>
                        {activeSections[section] && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <span className="text-sm font-bold text-[#0a1f44]">{section}</span>
                    </div>
                    <span className="text-xs text-gray-400">{activeSections[section] ? "Included" : "Excluded"}</span>
                  </div>
                  {activeSections[section] && (
                    <div className="p-4">
                      {section === "Market Overview" && marketLoading ? (
                        <div className="text-xs text-gray-400 animate-pulse">Fetching market data...</div>
                      ) : (
                        <textarea
                          value={memoFields[sectionFieldMap[section]] || ""}
                          onChange={e => upd(sectionFieldMap[section], e.target.value)}
                          rows={section === "Capital Stack" ? 8 : 5}
                          className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none"
                          placeholder={`Enter ${section.toLowerCase()} content...`}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div className={cardClass + " p-6"}>
            <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Media</div>
            <h3 className="font-display text-xl font-bold text-[#0a1f44] mb-4">Property Photos</h3>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-2 border-dashed border-[#0a1f44]/20 text-[#0a1f44] rounded-xl hover:bg-[#0a1f44]/5 mb-4 w-full justify-center">
              <Plus className="h-4 w-4" /> Upload Photos
            </button>
            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="rounded-xl border border-gray-200 overflow-hidden">
                    <img src={photo.url} alt={photo.name} className="w-full h-32 object-cover" />
                    <div className="p-2">
                      <input
                        value={photo.caption}
                        onChange={e => setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption: e.target.value } : p))}
                        placeholder="Add caption..."
                        className="w-full text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0a1f44]"
                      />
                      <button onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))} className="mt-1 text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div className={cardClass + " p-6"}>
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Export</div>
                <h3 className="font-display text-xl font-bold text-[#0a1f44]">Generate Deal Memo PDF</h3>
                <p className="text-sm text-gray-500 mt-0.5">{photos.length} photo{photos.length !== 1 ? "s" : ""} · {Object.values(activeSections).filter(Boolean).length} sections included</p>
              </div>
<div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#c9a84c] text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/80 disabled:opacity-50"
                >
                  {exporting ? "Generating..." : "🖨 Print / Save PDF"}
                </button>
                <button
                  onClick={handleExportWord}
                  disabled={exporting}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-semibold border-2 border-[#0a1f44] text-[#0a1f44] rounded-xl hover:bg-[#0a1f44]/5 disabled:opacity-50"
                >
                  📄 Download Word (.doc)
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MainPortal({ session, onLogout, submittedDeals, setSubmittedDeals, users, setUsers, teamMembers, setTeamMembers, deleteRequests, setDeleteRequests, lenderChangeRequests, setLenderChangeRequests }: {
  session: AuthSession; onLogout: () => void;
  submittedDeals: SubmittedDeal[]; setSubmittedDeals: (d: SubmittedDeal[]) => void;
  users: AppUser[]; setUsers: (u: AppUser[]) => void;
  teamMembers: TeamMember[]; setTeamMembers: (m: TeamMember[]) => void;
  deleteRequests: DeleteRequest[]; setDeleteRequests: (r: DeleteRequest[]) => void;
  lenderChangeRequests: LenderChangeRequest[]; setLenderChangeRequests: (r: LenderChangeRequest[]) => void;
}) {
  const isAdmin = session?.user.role === "admin";
  const isStaff = session?.user.role === "staff";
  const isLender = session?.user.role === "lender";
  const [activeTab, setActiveTab] = useState("overview");
  React.useEffect(() => { (window as any).__setActiveTab = setActiveTab; }, [setActiveTab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<number|null>(null);
  const [userEditForm, setUserEditForm] = useState({name:"",username:"",phone:"",password:""});
  const [dealSearch, setDealSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCapital, setFilterCapital] = useState("All");
  const [filterAdvisor, setFilterAdvisor] = useState("All");
  const [filterClient, setFilterClient] = useState("All");
  const [showMyDeals, setShowMyDeals] = useState(true);
  const [showAdvisorDeals, setShowAdvisorDeals] = useState(true);
  const [showClientDeals, setShowClientDeals] = useState(true);
  const [prefillDeal, setPrefillDeal] = useState<SubmittedDeal | null>(null);
  const [lenderRecords, setLenderRecords] = useState<LenderRecord[]>(seedLenders);
  const [lendersLoaded, setLendersLoaded] = useState(false);

  // Lenders save explicitly via saveLendersToDb — no auto-save to avoid race conditions

  // Load dashboard lenders from DB on mount and merge with seed lenders
  React.useEffect(() => {
    async function loadDashboardLenders() {
      try {
        const res = await fetch("/api/data?type=lenders");
        const dbLenders: LenderRecord[] = await res.json();
        if (Array.isArray(dbLenders) && dbLenders.length > 0) {
          // DB lenders override seed lenders with the same ID
          const dbIds = new Set(dbLenders.map(l => l.id));
          const deletedIds = new Set(dbLenders.filter(l => l.source === 'Deleted').map(l => l.originalId || l.id));
          const seedOnly = seedLenders.filter(l => !dbIds.has(l.id) && !deletedIds.has(l.id));
          setLenderRecords([...seedOnly, ...dbLenders.filter(l => l.source !== 'Deleted')]);
        }
      } catch (e) { console.error("Failed to load dashboard lenders:", e); }
      setLendersLoaded(true);
    }
    loadDashboardLenders();
  }, []);

  // Save all non-seed lenders to DB (dashboard-added AND edited seed lenders)
  async function saveLendersToDb(records: LenderRecord[]) {
    const toSave = records.filter(l => l.source === "Dashboard");
    if (toSave.length === 0) return;
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lenders", data: toSave }) });
    } catch (e) { console.error("Failed to save lenders:", e); }
  }
  const [search, setSearch] = useState("");
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchMessage, setAiSearchMessage] = useState("");
  const [aiLenderFilters, setAiLenderFilters] = useState<any>(null);

  async function runAiLenderSearch(query: string) {
    if (!query.trim()) { setAiLenderFilters(null); setAiSearchMessage(""); return; }
    setAiSearchLoading(true);
    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: "lenders" }),
      });
      const data = await res.json();
      setAiLenderFilters(data.filters);
      setAiSearchMessage(data.message || "");
    } catch(e) {
      setAiSearchMessage("AI search unavailable — using keyword search");
      setAiLenderFilters({ keywords: [query] });
    }
    setAiSearchLoading(false);
  }

  function exportLendersToExcel(records: LenderRecord[]) {
    // Build CSV content (universal, no library needed)
    const headers = ["Lender Name", "Program", "Capital Type", "Min Loan", "Max Loan", "Max LTV", "Min DSCR", "States", "Property Types", "Loan Terms", "Contact Person", "Email", "Phone", "Recourse", "Status", "Notes"];
    const rows = records.map(l => [
      l.lender || "",
      l.program || "",
      l.type || "",
      l.minLoan || "",
      l.maxLoan || "",
      l.maxLtv || "",
      l.minDscr || "",
      (l.states || []).join("; "),
      (l.assets || []).join("; "),
      l.loanTerms || "",
      l.contactPerson || "",
      l.email || "",
      l.phone || "",
      l.recourse || "",
      l.status || "",
      (l.notes || "").replace(/,/g, ";"),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CapMoon_Lenders_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("All");
  const [selectedCapitalFilter, setSelectedCapitalFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [selectedLetter, setSelectedLetter] = useState("All");
  const [filterMinLoan, setFilterMinLoan] = useState("");
  const [filterMaxLoan, setFilterMaxLoan] = useState("");
  const [filterMaxLtv, setFilterMaxLtv] = useState("");
  const [filterPropertyTypes, setFilterPropertyTypes] = useState<string[]>([]);
  const [filterStates, setFilterStates] = useState<string[]>([]);
  const [filterLenderTypes, setFilterLenderTypes] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingLenderId, setEditingLenderId] = useState<number | null>(null);
  const [viewingLenderId, setViewingLenderId] = useState<number | null>(null);
  const [newUserForm, setNewUserForm] = useState({ name: "", username: "", password: "", role: "capital-seeker" as AppUser["role"],
    emailPrefs: { dealSubmitted: true, lenderResponded: true, documentRequested: true, statusChanged: true, dealAssigned: true } });

  const inputClass = "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-[#0a1f44] focus:ring-0";
  const selectTriggerClass = "bg-white border-gray-300 text-gray-800 rounded-xl focus:border-[#0a1f44]";
  const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";

  const pendingDeleteCount = deleteRequests.filter((r) => r.status === "pending").length;
  const pendingLenderChangeCount = lenderChangeRequests.filter((r) => r.status === "pending").length;

  function handleDeleteLender(id: number) {
    const lender = lenderRecords.find((l) => l.id === id);
    if (!lender) return;
    if (isAdmin) {
      if (window.confirm(`Delete ${lender.lender}? This cannot be undone.`)) {
        setLenderRecords((prev) => {
        const deleted = prev.find(l => l.id === id);
        const next = prev.filter((l) => l.id !== id);
        const toSave = next.filter(l => l.source === 'Dashboard');
        if (deleted) toSave.push({...deleted, source: 'Deleted', originalId: deleted.id});
        if (toSave.length > 0) fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"lenders",data:toSave})}).catch(console.error);
        return next;
      });
        setEditingLenderId(null);
      }
    } else {
      setDeleteRequests([...deleteRequests, { id: Date.now(), lenderId: id, lenderName: lender.lender, requestedBy: session?.user.name || "Advisor", requestedAt: new Date().toLocaleString(), status: "pending" }]);
      alert(`Delete request for "${lender.lender}" has been sent to admin for approval.`);
    }
  }

  function handleDeleteRequestAction(reqId: number, action: "approved" | "denied") {
    const req = deleteRequests.find((r) => r.id === reqId);
    if (!req) return;
    if (action === "approved") setLenderRecords((prev) => { const next = prev.filter((l) => l.id !== req.lenderId); saveLendersToDb(next); fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"delete-lender",data:{id:req.lenderId}})}).catch(console.error); return next; });
    setDeleteRequests(deleteRequests.map((r) => r.id === reqId ? { ...r, status: action } : r));
  }

  function updateLenderField(id: number, field: keyof LenderRecord, value: string) {
    // Just update local state — Save Changes button triggers the DB save
    setLenderRecords((prev) => prev.map((l) => l.id === id ? { ...l, source: "Dashboard", [field]: value } : l));
  }
  function toggleLenderStatus(id: number) {
    setLenderRecords((prev) => prev.map((l) => l.id !== id ? l : { ...l, source: "Dashboard", status: l.status === "Inactive" ? "Active" : "Inactive" }));
  }
  function submitLenderEditRequest(lender: LenderRecord) {
    const req: LenderChangeRequest = {
      id: Date.now(), changeType: "edit", lenderId: lender.id, lenderName: lender.lender,
      proposedData: { ...lender }, requestedBy: session?.user.name || "Advisor",
      requestedById: session?.user.id || 0, requestedAt: new Date().toLocaleString(), status: "pending",
    };
    const next = [...lenderChangeRequests, req];
    setLenderChangeRequests(next);
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lender-changes", data: next }) }).catch(e => console.error("Save failed:", e));
    alert(`Your edit request for "${lender.lender}" has been submitted for admin approval.`);
    setEditingLenderId(null);
  }
  function handleSaveLender(form: NewLenderForm) {
    if (!form.programName.trim()) { alert("Please enter a program/lender name."); return; }
    if (form.capitalTypes.length === 0) { alert("Please select at least one Capital Type."); return; }
    const isMulti = form.capitalTypes.length > 1;
    const primaryType = form.capitalTypes[0];
    const primaryProg = isMulti ? form.capitalTypePrograms.find(p => p.capitalType === primaryType) : null;
    const newLender: LenderRecord = {
      id: Date.now(),
      source: "Dashboard", spreadsheetRow: "—",
      program: form.programName, lender: form.programName,
      type: form.capitalTypes.join(", "),
      minLoan: isMulti ? (primaryProg?.minLoan || "") : form.minLoan,
      maxLoan: isMulti ? (primaryProg?.maxLoan || "") : form.maxLoan,
      maxLtv: isMulti ? (primaryProg?.maxLtv || "") : form.maxLtv,
      minDscr: "1.20x",
      states: form.targetStates.length > 0 ? form.targetStates : allStates,
      assets: isMulti ? (primaryProg?.propertyTypes || []) : form.propertyTypes,
      status: form.status, email: form.email, phone: form.phone,
      recourse: form.recourse, contactPerson: form.contactPerson,
      website: form.website, sponsorStates: form.sponsorStates,
      loanTerms: isMulti ? (primaryProg?.loanTerms.join(", ") || "") : form.loanTerms.join(", "),
      typeOfLoans: form.typeOfLoans, programTypes: form.programTypes,
      typeOfLenders: form.typeOfLenders, notes: form.notes,
    };
    if (isAdmin) {
      // Admin: apply immediately
      setLenderRecords((prev) => { const next = [...prev, newLender]; saveLendersToDb(next); return next; });
      setActiveTab("lenders");
    } else {
      // Advisor: submit for approval
      const req: LenderChangeRequest = {
        id: Date.now(), changeType: "add", lenderName: newLender.lender,
        proposedData: newLender, requestedBy: session?.user.name || "Advisor",
        requestedById: session?.user.id || 0, requestedAt: new Date().toLocaleString(), status: "pending",
      };
      const next = [...lenderChangeRequests, req];
      setLenderChangeRequests(next);
      fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lender-changes", data: next }) }).catch(e => console.error(e));
      alert(`Your request to add "${newLender.lender}" has been submitted for admin approval.`);
      setActiveTab("lenders");
    }
  }
  function addUser() {
    if (!newUserForm.name.trim() || !newUserForm.username.trim() || !newUserForm.password.trim()) return;
    setUsers([...users, { id: users.length + 1, ...newUserForm, blockedLenderIds: [] }]);
    setNewUserForm({ name: "", username: "", password: "", role: "capital-seeker", emailPrefs: { dealSubmitted: true, lenderResponded: true, documentRequested: true, statusChanged: true, dealAssigned: true } });
  }
  function toggleBlockedLender(userId: number, lenderId: number) {
    setUsers(users.map((u) => u.id !== userId ? u : { ...u, blockedLenderIds: u.blockedLenderIds.includes(lenderId) ? u.blockedLenderIds.filter((id) => id !== lenderId) : [...u.blockedLenderIds, lenderId] }));
  }

  const filteredLenders = useMemo(() => {
    const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return lenderRecords.filter((l) => {
      if (selectedSourceFilter !== "All" && l.source !== selectedSourceFilter) return false;
      if (selectedCapitalFilter !== "All" && !l.type?.split(",").map((s: string) => s.trim()).includes(selectedCapitalFilter)) return false;
      if (selectedStatusFilter !== "All" && l.status !== selectedStatusFilter) return false;
      if (selectedLetter !== "All" && l.lender[0]?.toUpperCase() !== selectedLetter) return false;
      if (filterMinLoan) { const min = parseInt(filterMinLoan.replace(/[^0-9]/g,"")); const lMax = parseInt((l.maxLoan||"").replace(/[^0-9]/g,"")); if (lMax>0&&lMax<min) return false; }
      if (filterMaxLoan) { const max = parseInt(filterMaxLoan.replace(/[^0-9]/g,"")); const lMin = parseInt((l.minLoan||"").replace(/[^0-9]/g,"")); if (lMin>0&&lMin>max) return false; }
      if (filterMaxLtv) { const ltv=parseFloat(filterMaxLtv); const lLtv=parseFloat((l.maxLtv||"").replace(/[^0-9.]/g,"")); if (lLtv>0&&lLtv<ltv) return false; }
      if (filterPropertyTypes.length>0) { const lProps=l.assets||[]; if (!filterPropertyTypes.some(pt=>lProps.includes(pt))) return false; }
      if (filterStates.length>0) { const lSt=l.states||[]; if (!filterStates.some(s=>lSt.includes(s)||lSt.includes("All States"))) return false; }
      if (filterLenderTypes.length>0) { const lTypes=l.typeOfLenders||[]; if (!filterLenderTypes.some(t=>lTypes.includes(t))) return false; }
      // AI search filters
      if (aiLenderFilters) {
        const f = aiLenderFilters;
        if (f.capitalTypes?.length > 0 && !f.capitalTypes.some((ct: string) => l.type?.includes(ct))) return false;
        if (f.states?.length > 0 && !(l.states || []).some((s: string) => f.states.includes(s) || l.states?.includes("All States"))) return false;
        if (f.propertyTypes?.length > 0 && !(l.assets || []).some((a: string) => f.propertyTypes.includes(a))) return false;
        if (f.lenderTypes?.length > 0 && !(l.typeOfLenders || []).some((t: string) => f.lenderTypes.includes(t))) return false;
        if (f.minLoanMin) { const lMax = parseInt((l.maxLoan||"").replace(/[^0-9]/g,"")); if (lMax > 0 && lMax < f.minLoanMin) return false; }
        if (f.maxLoanMax) { const lMin = parseInt((l.minLoan||"").replace(/[^0-9]/g,"")); if (lMin > 0 && lMin > f.maxLoanMax) return false; }
        if (f.minLtv) { const lLtv = parseFloat((l.maxLtv||"").replace(/[^0-9.]/g,"")); if (lLtv > 0 && lLtv < f.minLtv) return false; }
        if (f.keywords?.length > 0) {
          const hay = [l.lender, l.type, l.notes, (l.assets||[]).join(" "), (l.states||[]).join(" ")].join(" ").toLowerCase();
          if (!f.keywords.every((kw: string) => hay.includes(kw.toLowerCase()))) return false;
        }
      }
      if (terms.length === 0) return true;
      const searchable = [
        l.lender, l.program, l.type, l.contactPerson, l.email, l.phone, l.notes,
        l.recourse, l.minLoan, l.maxLoan, l.maxLtv, l.loanTerms,
        ...(l.assets || []), ...(l.states || []),
        ...(l.typeOfLoans || []), ...(l.typeOfLenders || []),
        ...(l.programTypes || []), ...(l.sponsorStates || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return terms.every(term => searchable.includes(term));
    });
  }, [lenderRecords, selectedSourceFilter, selectedCapitalFilter, selectedStatusFilter, selectedLetter, search, filterMinLoan, filterMaxLoan, filterMaxLtv, filterPropertyTypes, filterStates, filterLenderTypes, aiLenderFilters]);
  const sortedLenders = useMemo(() => [...filteredLenders].sort((a, b) => a.lender.localeCompare(b.lender)), [filteredLenders]);

  const spreadsheetCount = lenderRecords.filter((l) => l.source === "Spreadsheet").length;
  const dashboardCount = lenderRecords.filter((l) => l.source === "Dashboard").length;

  const navItems: [string, string, any, string?][] = [
    ["overview", "Overview", Gauge],
    ["lenders", "Lender Programs", Landmark],
    ["add-lender", "Add Lender", Plus, "sub"],
    ["matcher", "Deal Matcher", Filter],
    ["deal-team", "Deal Team", Users],
    ["submitted-deals", "Submitted Deals", FileSpreadsheet],
    ["uploads", "Upload Center", Upload],
    ...(isAdmin ? [["user-management", "Admin Portal", Settings] as [string, string, any]] : []),
    ...(isAdmin ? [["deal-memos", "Deal Memos", FileText] as [string, string, any]] : []),
    ...(isAdmin && pendingDeleteCount > 0 ? [["delete-queue", `Delete Requests (${pendingDeleteCount})`, Bell] as [string, string, any]] : []),
    ...(isAdmin && pendingLenderChangeCount > 0 ? [["lender-changes", `Lender Changes (${pendingLenderChangeCount})`, Bell] as [string, string, any]] : []),
  ];

  // ── SectionHeader component (extracted for React hooks compliance) ──
                      function SectionHeader({ title, count, color, show, onToggle, children }: { title: string; count: number; color: string; show: boolean; onToggle: () => void; children?: React.ReactNode }) {
                        return (
                          <div className="mb-6">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <button type="button" onClick={onToggle} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-[#0a1f44]/20 transition-all">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                <span className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">{title}</span>
                                <span className="text-xs text-gray-400">({count})</span>
                                <span className="text-xs text-gray-300 ml-1">{show ? "▲" : "▼"}</span>
                              </button>
                              {children}
                            </div>
                          </div>
                        );
                      }

  // ── UserCard component (extracted for React hooks compliance) ──
                      function UserCard({ user, users, setUsers, lenderRecords }: { user: AppUser; users: AppUser[]; setUsers: (u: AppUser[]) => void; lenderRecords: LenderRecord[] }) {
                        const [expanded, setExpanded] = React.useState(false);
                        const [editing, setEditing] = React.useState(false);
                        const [editForm, setEditForm] = React.useState<{name:string;username:string;phone:string;password:string}>({ name: user.name || "", username: user.username || "", phone: (user as any).phone || "", password: "" });
                        const [confirmDelete, setConfirmDelete] = React.useState(false);
                        const isBlocked = (user as any).blocked === true;
                        function persist(updated: AppUser[]) {
                          setUsers(updated);
                          fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "users", data: updated }) }).catch(console.error);
                        }
                        function saveEdits() {
                          persist(users.map(u => u.id === user.id ? { ...u, name: editForm.name || u.name, username: editForm.username || u.username, phone: editForm.phone, ...(editForm.password ? { password: editForm.password } : {}) } : u));
                          setEditing(false);
                        }
                        return (
                          <div data-user-card={(user.name || "") + " " + user.username + " " + user.role}
                            className={"rounded-xl border bg-white " + (isBlocked ? "border-red-200 bg-red-50/30" : "border-gray-200")}>
                            <button type="button" onClick={() => setExpanded(p => !p)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold " + (isBlocked ? "bg-red-100 text-red-500" : "bg-[#0a1f44]/10 text-[#0a1f44]")}>
                                  {(user.name || user.username || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-[#0a1f44]">{user.name || user.username}</div>
                                  <div className="text-xs text-gray-400">{user.username}{isBlocked && <span className="ml-2 text-red-400 font-semibold">· Blocked</span>}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {user.id === 1 && <span className="px-2 py-0.5 text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full font-bold">Master Admin</span>}
                                <span className="text-gray-300 text-xs">{expanded ? "▲" : "▼"}</span>
                              </div>
                            </button>
                            {expanded && (
                              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">Profile</div>
                                    <button type="button" onClick={() => setEditing(p => !p)} className="text-xs text-[#0a1f44] border border-[#0a1f44]/20 px-2 py-1 rounded-lg hover:bg-[#0a1f44]/5">{editing ? "Cancel" : "Edit"}</button>
                                  </div>
                                  {editing ? (
                                    <div className="space-y-2">
                                      <div className="grid gap-2 md:grid-cols-2">
                                        <div><label className="text-xs text-gray-400 mb-1 block">Full Name</label><input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                        <div><label className="text-xs text-gray-400 mb-1 block">Email</label><input value={editForm.username} onChange={e => setEditForm(p => ({...p, username: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                        <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                        <div><label className="text-xs text-gray-400 mb-1 block">New Password</label><input type="password" value={editForm.password} onChange={e => setEditForm(p => ({...p, password: e.target.value}))} placeholder="leave blank to keep" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                      </div>
                                      <button type="button" onClick={saveEdits} className="px-4 py-2 text-sm font-bold bg-[#0a1f44] text-white rounded-xl">Save Changes</button>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 space-y-0.5">
                                      {(user as any).phone && <div>📞 {(user as any).phone}</div>}
                                      <div>🔑 Password: ••••••••</div>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Email Notifications</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {([["Deal Submitted","dealSubmitted"],["Lender Responded","lenderResponded"],["Doc Requested","documentRequested"],["Status Changed","statusChanged"],["Deal Assigned","dealAssigned"]] as [string,string][]).map(([label, key]) => {
                                      const prefs: any = (user as any).emailPrefs || {};
                                      const enabled = prefs[key] !== false;
                                      return <button key={key} type="button" onClick={() => persist(users.map(u => u.id === user.id ? { ...u, emailPrefs: { ...prefs, [key]: !enabled } } as AppUser : u))} className={"px-2 py-0.5 text-xs rounded-full border font-medium " + (enabled ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-gray-100 text-gray-400 border-gray-200")}>{label}</button>;
                                    })}
                                  </div>
                                  {user.role === "lender" && <p className="text-xs text-gray-400 mt-1">Lenders always receive the initial deal request.</p>}
                                </div>
                                {user.role !== "admin" && (
                                  <div>
                                    <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Blocked Lenders</div>
                                    <DropdownCheckbox label="Blocked Lenders" options={[...lenderRecords].sort((a,b)=>a.lender.localeCompare(b.lender)).map(l=>l.lender)}
                                      selected={user.blockedLenderIds.map(id=>lenderRecords.find(l=>l.id===id)?.lender||"").filter(Boolean)}
                                      onChange={names => persist(users.map(u => u.id===user.id ? {...u, blockedLenderIds: lenderRecords.filter(l=>names.includes(l.lender)).map(l=>l.id)} : u))} />
                                  </div>
                                )}
                                {user.id !== 1 && (
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                    <button type="button" onClick={() => persist(users.map(u => u.id===user.id ? {...u, blocked: !isBlocked} as AppUser : u))}
                                      className={"px-3 py-1.5 text-xs font-semibold border rounded-lg " + (isBlocked ? "border-green-200 text-green-600 hover:bg-green-50" : "border-orange-200 text-orange-600 hover:bg-orange-50")}>
                                      {isBlocked ? "✓ Unblock" : "⊘ Block Access"}
                                    </button>
                                    {!confirmDelete
                                      ? <button type="button" onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Delete User</button>
                                      : <div className="flex items-center gap-2">
                                          <span className="text-xs text-red-500">Are you sure?</span>
                                          <button type="button" onClick={() => persist(users.filter(u => u.id !== user.id))} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg">Yes, Delete</button>
                                          <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg">Cancel</button>
                                        </div>
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap'); * { font-family: 'Montserrat', sans-serif; } .font-display { font-family: 'Cormorant Garamond', serif; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #f0f2f5; } ::-webkit-scrollbar-thumb { background: #c9a84c66; border-radius: 2px; }
        @media (max-width: 1024px) {
          .hide-on-mobile { display: none !important; }
        }
        @media (max-width: 640px) {
          .font-display { font-size: clamp(1.5rem, 6vw, 2.5rem); }
          table { font-size: 12px; }
          th, td { padding: 8px 6px !important; }
        } [data-radix-select-content] { background: white !important; border: 1px solid #e5e7eb !important; color: #1f2937 !important; } [data-radix-select-item] { color: #1f2937 !important; } [data-radix-select-item]:hover, [data-radix-select-item][data-highlighted] { background: #f3f4f6 !important; color: #0a1f44 !important; }`}</style>
      <div className="min-h-screen bg-[#f0f2f5] text-gray-800">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-[#c9a84c]/10 bg-[#0a1f44] flex flex-col">
            <div className="px-6 py-6 border-b border-[#c9a84c]/20">
              <div className="flex items-center justify-between mb-2 lg:hidden">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
                <div><div className="font-display text-2xl font-bold text-white">CapMoon</div><div className="text-xs text-gray-400 tracking-wide">Lender Intelligence Platform</div></div>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-2 mb-3">Investment Banking</div>
              {/* AutoMatch + user info moved here */}
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-3 mb-3">
                <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-3.5 w-3.5 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
                <p className="text-xs text-gray-300 leading-relaxed">Spreadsheet-driven criteria plus dashboard lenders.</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">Signed in as <span className="text-white font-medium">{session?.user.name}</span></div>
                <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><LogOut className="h-3 w-3" /> Out</button>
              </div>
            </div>
            <nav className="space-y-1 p-4 flex-1 overflow-y-auto">
              {navItems.map(([key, label, Icon, type]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${type === "sub" ? "pl-8" : ""} ${activeTab === key ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30" : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  <Icon className={`flex-shrink-0 ${type === "sub" ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                  <span className={`font-medium tracking-wide ${type === "sub" ? "text-xs" : "text-sm"}`}>{label}</span>
                  {activeTab === key && <div className="ml-auto w-1 h-4 bg-[#c9a84c] rounded-full" />}
                </button>
              ))}
            </nav>
          </aside>

          <main className="p-6 md:p-8 overflow-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-[#0a1f44] font-bold">Institutional Workflow</div>
                  <h1 className="font-display text-4xl font-bold text-[#0a1f44] mt-1">Lender Dashboard</h1>
                  <p className="mt-1 text-sm text-gray-500">CapMoon's Premier Capital Search Dashboard</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 text-sm font-medium text-[#0a1f44] border border-[#0a1f44]/30 rounded-xl hover:bg-[#0a1f44]/10">Export Lender Set</button>
                  <button onClick={() => setActiveTab("add-lender")} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80"><Plus className="h-4 w-4" /> Add Lender</button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <StatCard title="Total Lenders" value={String(lenderRecords.length)} detail="Spreadsheet + dashboard records" icon={Building2} />
                <StatCard title="Spreadsheet" value={String(spreadsheetCount)} detail="Imported criteria rows" icon={FileSpreadsheet} />
                <StatCard title="Dashboard Added" value={String(dashboardCount)} detail="Created manually" icon={Users} />
                <StatCard title="Capital Types" value={String(capitalTypes.length)} detail="Senior · Mezz · Pref · JV · LOC · Note" icon={BarChart3} />
              </div>

              {/* Overview */}
              {activeTab === "overview" && (
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Pipeline</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Snapshot</h2>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                      {[["New Deal Requests", String(submittedDeals.length), "Total submitted"], ["Pending", String(submittedDeals.filter(d => d.status === "pending").length), "Awaiting advisor"], ["Dashboard Lenders", String(dashboardCount), "Added manually"]].map(([label, value, detail]) => (
                        <div key={String(label)} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="text-xs text-gray-500 mb-1">{label}</div>
                          <div className="text-2xl font-bold text-[#0a1f44]">{value}</div>
                          <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mt-1">{detail}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><div className="text-sm font-bold text-[#0a1f44]">Platform Health</div><div className="text-xs text-gray-500 mt-0.5">Coverage across asset type, leverage, geography, and capital stack</div></div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Healthy</span>
                      </div>
                      <div className="space-y-4">
                        {[["Asset class mapping", 94], ["Loan sizing confidence", 88], ["State eligibility coverage", 91], ["Contact completeness", 84]].map(([label, val]) => (
                          <div key={String(label)}>
                            <div className="flex items-center justify-between text-xs mb-2"><span className="text-gray-600 font-medium">{label}</span><span className="text-[#c9a84c] font-bold">{val}%</span></div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#0a1f44] to-[#c9a84c] rounded-full" style={{ width: `${val}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Live Preview</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Top Lender Matches</h2>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">Run a deal in the Deal Matcher tab to see top matches here.</div>
                  </div>
                </div>
              )}

              {/* Lenders */}
              {activeTab === "lenders" && (
                <div className={cardClass + " p-6"}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">Registry</div>
                      <h2 className="font-display text-2xl font-bold text-[#0a1f44]">Lender Programs</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Click a lender name to view profile. Click Edit to modify.</p>
                    </div>
                    <button onClick={() => setActiveTab("add-lender")} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80"><Plus className="h-4 w-4" /> Add Lender</button>
                  </div>

                  {/* AI Search bar */}
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c9a84c]" />
                        <input
                          value={aiSearchQuery}
                          onChange={e => setAiSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && runAiLenderSearch(aiSearchQuery)}
                          placeholder='AI Search: "bridge lenders in Florida for apartments over $5M"'
                          className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#0a1f44]/3 border border-[#c9a84c]/30 rounded-xl focus:outline-none focus:border-[#c9a84c] text-gray-800 placeholder:text-gray-400"
                        />
                      </div>
                      <button
                        onClick={() => runAiLenderSearch(aiSearchQuery)}
                        disabled={aiSearchLoading || !aiSearchQuery.trim()}
                        className="px-4 py-2.5 text-sm font-semibold bg-[#c9a84c] text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/80 disabled:opacity-50 flex items-center gap-2"
                      >
                        {aiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {aiSearchLoading ? "Searching..." : "AI Search"}
                      </button>
                      {aiLenderFilters && (
                        <button onClick={() => { setAiLenderFilters(null); setAiSearchQuery(""); setAiSearchMessage(""); }}
                          className="px-3 py-2 text-xs text-red-400 border border-red-200 rounded-xl hover:bg-red-50">
                          Clear ✕
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => exportLendersToExcel(sortedLenders)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-[#0a1f44]/20 text-[#0a1f44] rounded-xl hover:bg-[#0a1f44]/5"
                          title="Export visible lenders to CSV/Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" /> Export
                        </button>
                      )}
                    </div>
                    {aiSearchMessage && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-lg">
                        <Sparkles className="h-3.5 w-3.5 text-[#c9a84c] flex-shrink-0" />
                        <span className="text-xs text-[#0a1f44]">{aiSearchMessage}</span>
                        <span className="text-xs text-gray-400 ml-auto">{sortedLenders.length} results</span>
                      </div>
                    )}
                  </div>

                  {/* Search + filters */}
                  <div className="grid gap-3 md:grid-cols-4 mb-3">
                    <div className="md:col-span-2 relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input value={search} onChange={(e) => { setSearch(e.target.value); setSelectedLetter("All"); }} placeholder="Search by name, state, asset type, capital type, mezzanine, Florida…" className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-[#0a1f44]" />
                    </div>
                    <Select value={selectedCapitalFilter} onValueChange={setSelectedCapitalFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Capital Types</SelectItem>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
                    <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                  </div>

                  {/* A-Z filter */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => (
                        <button
                          key={letter}
                          onClick={() => { setSelectedLetter(letter); setSearch(""); }}
                          className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${selectedLetter === letter ? "bg-[#0a1f44] text-white" : "bg-gray-100 text-gray-500 hover:bg-[#0a1f44]/10 hover:text-[#0a1f44]"}`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* Advanced Filters Panel */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setShowAdvancedFilters(p => !p)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/5">
                        <Filter className="h-3 w-3" /> Advanced Filters
                        {(filterMinLoan||filterMaxLoan||filterMaxLtv||filterPropertyTypes.length>0||filterStates.length>0||filterLenderTypes.length>0) && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#c9a84c] text-[#0a1f44] rounded-full font-bold">
                            {[filterMinLoan,filterMaxLoan,filterMaxLtv].filter(Boolean).length + filterPropertyTypes.length + filterStates.length + filterLenderTypes.length}
                          </span>
                        )}
                      </button>
                      {(filterMinLoan||filterMaxLoan||filterMaxLtv||filterPropertyTypes.length>0||filterStates.length>0||filterLenderTypes.length>0) && (
                        <button onClick={() => { setFilterMinLoan(""); setFilterMaxLoan(""); setFilterMaxLtv(""); setFilterPropertyTypes([]); setFilterStates([]); setFilterLenderTypes([]); }} className="text-xs text-red-400 hover:text-red-600">Clear Advanced ✕</button>
                      )}
                    </div>
                    {showAdvancedFilters && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Min Loan ($)</label><input value={filterMinLoan} onChange={e=>setFilterMinLoan(e.target.value)} placeholder="e.g. 1,000,000" className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max Loan ($)</label><input value={filterMaxLoan} onChange={e=>setFilterMaxLoan(e.target.value)} placeholder="e.g. 25,000,000" className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Min LTV (%)</label><input value={filterMaxLtv} onChange={e=>setFilterMaxLtv(e.target.value)} placeholder="e.g. 70" className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#0a1f44]" /></div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Types</label>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {["Apartments","Office","Retail-Multi Tenant","Light Industrial","Hotel/Hospitality-Flag Required","Self-storage","Mixed-use","Land","Medical Office"].map(pt => (
                                <button key={pt} type="button" onClick={() => setFilterPropertyTypes(p => p.includes(pt) ? p.filter(x=>x!==pt) : [...p,pt])}
                                  className={"px-2 py-0.5 text-xs rounded-full border transition-all " + (filterPropertyTypes.includes(pt) ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "border-gray-200 text-gray-500 hover:border-[#0a1f44]/30")}>
                                  {pt}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Lender Type</label>
                            <div className="flex flex-wrap gap-1">
                              {["Bridge","Conventional","Private Lender","Hard Money","Family Office","CMBS","Balance Sheet"].map(lt => (
                                <button key={lt} type="button" onClick={() => setFilterLenderTypes(p => p.includes(lt) ? p.filter(x=>x!==lt) : [...p,lt])}
                                  className={"px-2 py-0.5 text-xs rounded-full border transition-all " + (filterLenderTypes.includes(lt) ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "border-gray-200 text-gray-500 hover:border-[#0a1f44]/30")}>
                                  {lt}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">States</label>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {["FL","NY","TX","CA","GA","IL","CO","AZ","NC","NJ","MA","WA","NV","TN","OH"].map(s => (
                                <button key={s} type="button" onClick={() => setFilterStates(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s])}
                                  className={"px-2 py-0.5 text-xs rounded-full border transition-all " + (filterStates.includes(s) ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "border-gray-200 text-gray-500 hover:border-[#0a1f44]/30")}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {[`Showing: ${sortedLenders.length} of ${lenderRecords.length}`, `Spreadsheet: ${spreadsheetCount}`, `Dashboard: ${dashboardCount}`].map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full text-xs border border-[#c9a84c]/30 text-[#c9a84c] font-bold">{t}</span>
                    ))}
                    {(search || selectedLetter !== "All") && (
                      <button onClick={() => { setSearch(""); setSelectedLetter("All"); }} className="px-3 py-1 rounded-full text-xs border border-gray-200 text-gray-500 hover:bg-gray-50">Clear filters ✕</button>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-gray-200 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">
                          <TableHead className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">Lender</TableHead>
                          <TableHead className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">Program</TableHead>
                          <TableHead className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">Status</TableHead>
                          <TableHead className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedLenders.map((item) => (
                          <React.Fragment key={item.id}>
                            <TableRow className={`border-gray-100 ${viewingLenderId === item.id || editingLenderId === item.id ? "bg-[#0a1f44]/5 border-l-2 border-l-[#c9a84c]" : "hover:bg-gray-50"}`}>
                              <TableCell>
                                <button onClick={() => { setViewingLenderId(viewingLenderId === item.id ? null : item.id); setEditingLenderId(null); }} className="font-semibold text-[#0a1f44] text-sm hover:text-[#c9a84c] transition-colors text-left flex items-center gap-1.5">
                                  <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${viewingLenderId === item.id ? "rotate-90 text-[#c9a84c]" : ""}`} />
                                  {item.lender}
                                </button>
                                <div className="text-xs text-gray-400 mt-0.5 ml-5">{item.type} · {item.minLoan} – {item.maxLoan}</div>
                              </TableCell>
                              <TableCell className="text-gray-500 text-xs">{item.program}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${item.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : item.status === "Inactive" ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>{item.status}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <button onClick={() => { setEditingLenderId(editingLenderId === item.id ? null : item.id); setViewingLenderId(null); }} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${editingLenderId === item.id ? "bg-[#c9a84c]/20 text-[#0a1f44] border-[#c9a84c]/30" : "border-[#0a1f44]/20 text-[#0a1f44] hover:bg-[#0a1f44]/10"}`}>
                                  {editingLenderId === item.id ? "Close" : "Edit"}
                                </button>
                              </TableCell>
                            </TableRow>

                            {/* Profile view */}
                            {viewingLenderId === item.id && (
                              <TableRow className="border-0">
                                <TableCell colSpan={4} className="p-0">
                                  <div className="border-t border-[#0a1f44]/10 bg-white p-5">
                                    {/* Capital Type badges */}
                                    <div className="mb-4">
                                      <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Capital Type</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(item.type ? item.type.split(",").map(s => s.trim()) : []).map((t) => (
                                          <span key={t} className="px-3 py-1 rounded-full text-xs font-bold bg-[#0a1f44] text-white border border-[#0a1f44]">{t}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                      {[["Min Loan", item.minLoan || "—"], ["Max Loan", item.maxLoan || "—"], ["Max LTV", item.maxLtv || "—"], ["Recourse", item.recourse || "—"], ["Contact", item.contactPerson || "—"], ["Email", item.email || "—"], ["Phone", item.phone || "—"]].map(([label, val]) => (
                                        <div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                                          <div className="text-xs text-[#c9a84c] font-bold uppercase tracking-wide mb-0.5">{label}</div>
                                          {label === "Email" && item.email
                                            ? <a href={`mailto:${item.email}`} className="text-xs font-semibold text-[#0a1f44] break-all hover:underline">{val}</a>
                                            : label === "Phone" && item.phone
                                            ? <a href={`tel:${item.phone.replace(/[^0-9+]/g,"")}`} className="text-xs font-semibold text-[#0a1f44] break-all hover:underline">{val}</a>
                                            : <div className="text-xs font-semibold text-[#0a1f44] break-all">{val}</div>}
                                        </div>
                                      ))}
                                    </div>
                                    {item.assets && item.assets.length > 0 && (<div className="mb-3"><div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-1.5">Property Types</div><div className="flex flex-wrap gap-1.5">{item.assets.map((t) => <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">{t}</span>)}</div></div>)}
                                    {item.typeOfLoans && item.typeOfLoans.length > 0 && (<div className="mb-3"><div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-1.5">Loan Types</div><div className="flex flex-wrap gap-1.5">{item.typeOfLoans.map((t) => <span key={t} className="px-2 py-0.5 rounded-full text-xs border border-[#0a1f44]/20 text-[#0a1f44]">{t}</span>)}</div></div>)}
                                    {item.states && item.states.length > 0 && (<div className="mb-3"><div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-1.5">States ({item.states.length})</div><div className="flex flex-wrap gap-1">{item.states.length >= 50 ? <span className="px-2 py-0.5 rounded-full text-xs bg-[#0a1f44] text-white">All 50 States</span> : item.states.map((s) => <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">{s}</span>)}</div></div>)}
                                    {item.loanTerms && <div className="mb-3"><div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-1">Loan Terms</div><div className="text-xs text-gray-600">{item.loanTerms}</div></div>}
                                    {item.notes && (<div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2"><div className="text-xs font-bold text-amber-700 mb-0.5">Notes</div><div className="text-xs text-gray-700 whitespace-pre-wrap">{item.notes}</div></div>)}

                                    {/* Additional Contacts */}
                                    {item.contacts && item.contacts.length > 0 && (
                                      <div className="mt-4">
                                        <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Additional Contacts</div>
                                        <div className="space-y-2">
                                          {item.contacts.map((contact: any) => (
                                            <div key={contact.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
                                              {contact.name && <div className="text-xs font-bold text-[#0a1f44]">{contact.name}</div>}
                                              {contact.email && <a href={`mailto:${contact.email}`} className="text-xs text-gray-500 hover:underline">{contact.email}</a>}
                                              {contact.phone && <div className="text-xs text-gray-500">{contact.phone}</div>}
                                              {contact.region && <div className="text-xs text-[#c9a84c] font-medium">{contact.region}</div>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-4 flex gap-2">
                                      <button onClick={() => { setEditingLenderId(item.id); setViewingLenderId(null); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80"><Edit2 className="h-3 w-3" /> Edit Lender</button>
                                      <button onClick={() => toggleLenderStatus(item.id)} className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">{item.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                                      <button onClick={() => setViewingLenderId(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600">Close ✕</button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}

                            {/* Inline edit form */}
                            {editingLenderId === item.id && (
                              <TableRow className="border-0">
                                <TableCell colSpan={4} className="p-0">
                                  <div className="border-t border-[#0a1f44]/20 bg-gray-50 p-6">
                                    <div className="flex items-center justify-between mb-5">
                                      <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-bold mb-1">Editing</div>
                                        <div className="text-lg font-bold text-[#0a1f44]">{item.lender}</div>
                                        {!isAdmin && <div className="text-xs text-amber-600 mt-1">⚠ Changes require admin approval before going live</div>}
                                      </div>
                                      <div className="flex gap-2">
                                        {isAdmin ? (
                                          <button onClick={() => {
                                            const updated = lenderRecords.map(l => l.id === item.id ? { ...l, source: "Dashboard" } : l);
                                            setLenderRecords(updated);
                                            const toSave = updated.filter(l => l.source === "Dashboard");
                                            if (toSave.length > 0) fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lenders", data: toSave }) }).catch(console.error);
                                            setEditingLenderId(null);
                                          }} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Save Changes</button>
                                        ) : (
                                          <button onClick={() => submitLenderEditRequest(item)} className="px-4 py-2 text-sm font-semibold bg-[#c9a84c] text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/80">Submit for Approval</button>
                                        )}
                                        <button onClick={() => { setLenderRecords(prev => prev.map(l => l.id === item.id ? { ...l } : l)); setEditingLenderId(null); }} className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Discard Changes</button>
                                        <button onClick={() => toggleLenderStatus(item.id)} className="px-3 py-2 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-white">{item.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                                        <button onClick={() => handleDeleteLender(item.id)} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-xl hover:bg-red-50"><Trash2 className="h-3 w-3" />{isAdmin ? " Delete" : " Request"}</button>
                                      </div>
                                    </div>
                                    <div className="space-y-5">
                                      <div className="grid gap-3 md:grid-cols-3">
                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Lender Name</label><Input value={item.lender} onChange={(e) => updateLenderField(item.id, "lender", e.target.value)} className={inputClass} /></div>
                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Contact Person</label><Input value={item.contactPerson || ""} onChange={(e) => updateLenderField(item.id, "contactPerson", e.target.value)} className={inputClass} /></div>
                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Email</label><Input value={item.email || ""} onChange={(e) => updateLenderField(item.id, "email", e.target.value)} className={inputClass} /></div>
                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Phone</label><Input value={item.phone || ""} onChange={(e) => updateLenderField(item.id, "phone", e.target.value)} className={inputClass} /></div>
                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Website</label><Input value={item.website || ""} onChange={(e) => updateLenderField(item.id, "website", e.target.value)} className={inputClass} /></div>
                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Status</label><Select value={item.status} onValueChange={(v) => updateLenderField(item.id, "status", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
                                      </div>
                                      <CheckboxGroup
                                        label="Capital Type"
                                        options={capitalTypes}
                                        selected={item.type ? item.type.split(",").map(s => s.trim()).filter(Boolean) : []}
                                        onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, type: v.join(", ") } : l))}
                                      />
                                      {/* Loan parameters — single type = flat, multiple = accordion per type */}
                                      {(() => {
                                        const types = item.type ? item.type.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                                        const isMulti = types.length > 1;
                                        const progs: CapitalTypeProgram[] = item.capitalTypePrograms || [];
                                        function updProg(ct: string, field: keyof CapitalTypeProgram, value: any) {
                                          const existing = progs.filter(p => p.capitalType !== ct);
                                          const current = progs.find(p => p.capitalType === ct) || { capitalType: ct, minLoan: "", maxLoan: "", maxLtv: "", loanTerms: [], propertyTypes: [] };
                                          setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, capitalTypePrograms: [...existing, { ...current, [field]: value }] } : l));
                                        }
                                        if (!isMulti) return (
                                          <div className="grid gap-3 md:grid-cols-3">
                                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Min Loan</label><Input value={item.minLoan || ""} onChange={(e) => updateLenderField(item.id, "minLoan", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max Loan</label><Input value={item.maxLoan || ""} onChange={(e) => updateLenderField(item.id, "maxLoan", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max LTV</label><Input value={item.maxLtv || ""} onChange={(e) => updateLenderField(item.id, "maxLtv", e.target.value)} className={inputClass} /></div>
                                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Recourse</label><Select value={item.recourse || "CASE BY CASE"} onValueChange={(v) => updateLenderField(item.id, "recourse", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                                            {types.includes("C&I") ? (
                                              <>
                                                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Types</label><Input value={item.assets?.join(", ") || ""} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, assets: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : l))} className={inputClass} /></div>
                                                <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Loan Terms</label><Input value={item.loanTerms || ""} onChange={(e) => updateLenderField(item.id, "loanTerms", e.target.value)} className={inputClass} /></div>
                                              </>
                                            ) : (
                                              <>
                                                <DropdownCheckbox label="Property Types" options={lenderPropertyTypeOptions} selected={item.assets || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, assets: v } : l))} />
                                                <DropdownCheckbox label="Loan Terms" options={loanTermOptions} selected={item.loanTerms ? item.loanTerms.split(",").map((s: string) => s.trim()).filter(Boolean) : []} onChange={(v) => updateLenderField(item.id, "loanTerms", v.join(", "))} />
                                              </>
                                            )}
                                          </div>
                                        );
                                        return (
                                          <div>
                                            <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-3">Program Parameters Per Capital Type</div>
                                            <div className="space-y-2">
                                              {types.map((ct: string) => {
                                                const prog = progs.find(p => p.capitalType === ct) || { capitalType: ct, minLoan: item.minLoan || "", maxLoan: item.maxLoan || "", maxLtv: item.maxLtv || "", loanTerms: item.loanTerms ? item.loanTerms.split(",").map((s:string)=>s.trim()) : [], propertyTypes: item.assets || [] };
                                                return (
                                                  <div key={ct} className="rounded-xl border border-[#0a1f44]/20">
                                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1f44]/5">
                                                      <div className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                                                      <span className="text-sm font-bold text-[#0a1f44]">{ct}</span>
                                                      {prog.minLoan && prog.maxLoan && <span className="text-xs text-gray-400 ml-2">{prog.minLoan} – {prog.maxLoan}</span>}
                                                    </div>
                                                    <div className="p-4 space-y-3 bg-white">
                                                      <div className="grid gap-3 md:grid-cols-3">
                                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Min Loan</label><Input value={prog.minLoan} onChange={(e) => updProg(ct, "minLoan", formatCurrencyInput(e.target.value))} placeholder="$1,000,000" className={inputClass} /></div>
                                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max Loan</label><Input value={prog.maxLoan} onChange={(e) => updProg(ct, "maxLoan", formatCurrencyInput(e.target.value))} placeholder="$25,000,000" className={inputClass} /></div>
                                                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max LTV</label><Input value={prog.maxLtv} onChange={(e) => updProg(ct, "maxLtv", e.target.value)} placeholder="75%" className={inputClass} /></div>
                                                      </div>
                                                      <div className="grid gap-3 md:grid-cols-2">
                                                        {ct === "C&I" ? (
                                                          <>
                                                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Types</label><Input value={prog.propertyTypes.join(", ")} onChange={(e) => updProg(ct, "propertyTypes", e.target.value.split(",").map((s:string)=>s.trim()).filter(Boolean))} className={inputClass} /></div>
                                                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Loan Terms</label><Input value={prog.loanTerms.join(", ")} onChange={(e) => updProg(ct, "loanTerms", e.target.value.split(",").map((s:string)=>s.trim()).filter(Boolean))} className={inputClass} /></div>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <DropdownCheckbox label="Property Types" options={lenderPropertyTypeOptions} selected={prog.propertyTypes} onChange={(v) => updProg(ct, "propertyTypes", v)} />
                                                            <DropdownCheckbox label="Loan Terms" options={loanTermOptions} selected={prog.loanTerms} onChange={(v) => updProg(ct, "loanTerms", v)} />
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                              <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Recourse</label><Select value={item.recourse || "CASE BY CASE"} onValueChange={(v) => updateLenderField(item.id, "recourse", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      <CheckboxGroup label="Type of Lender" options={typeOfLenderOptions} selected={item.typeOfLenders || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, typeOfLenders: v } : l))} />
                                      <CheckboxGroup label="Type of Loans" options={typeOfLoanOptions} selected={item.typeOfLoans || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, typeOfLoans: v } : l))} />
                                      <CheckboxGroup label="Program" options={programTypeOptions} selected={item.programTypes || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, programTypes: v } : l))} />
                                      <StateSelector label="Target States" selected={item.states || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, states: v } : l))} />
                                      <StateSelector label="Sponsor States" selected={item.sponsorStates || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, sponsorStates: v } : l))} />
                                      <div>
                                        <div className="flex items-center justify-between mb-3">
                                          <label className="text-xs text-gray-500 font-bold uppercase tracking-wide">Additional Contacts</label>
                                          <button onClick={() => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, contacts: [...(l.contacts || []), { id: Date.now(), name: "", phone: "", email: "", region: "" }] } : l))} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80"><Plus className="h-3 w-3" /> Add Contact</button>
                                        </div>
                                        {(!item.contacts || item.contacts.length === 0) ? (
                                          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-400">No additional contacts yet.</div>
                                        ) : (
                                          <div className="space-y-3">
                                            {item.contacts.map((contact, cidx) => (
                                              <div key={contact.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                                <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-[#0a1f44]">Contact {cidx + 1}</span><button onClick={() => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, contacts: (l.contacts || []).filter((c) => c.id !== contact.id) } : l))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                                                <div className="grid gap-2 md:grid-cols-2">
                                                  <div><label className="text-xs text-gray-400 mb-1 block">Name</label><Input value={contact.name} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, name: e.target.value } : c) } : l))} className={inputClass} /></div>
                                                  <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><Input value={contact.phone} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, phone: e.target.value } : c) } : l))} className={inputClass} /></div>
                                                  <div><label className="text-xs text-gray-400 mb-1 block">Email</label><Input value={contact.email} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, email: e.target.value } : c) } : l))} className={inputClass} /></div>
                                                  <div><label className="text-xs text-gray-400 mb-1 block">Region</label><Input value={contact.region} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === item.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, region: e.target.value } : c) } : l))} className={inputClass} /></div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase tracking-wide">Notes</label>
                                        <textarea value={item.notes || ""} onChange={(e) => updateLenderField(item.id, "notes", e.target.value)} placeholder="Add any notes about this lender..." rows={3} className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none" />
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}


              {activeTab === "add-lender" && <AddLenderPage onSave={handleSaveLender} onCancel={() => setActiveTab("lenders")} existingLenders={lenderRecords} inputClass={inputClass} selectTriggerClass={selectTriggerClass} />}

              {activeTab === "matcher" && <DealMatcher lenderRecords={lenderRecords} teamMembers={teamMembers} prefillDeal={prefillDeal} onPrefillConsumed={() => setPrefillDeal(null)} inputClass={inputClass} selectTriggerClass={selectTriggerClass} cardClass={cardClass} />}

              {/* Deal Team Tab */}
              {activeTab === "deal-team" && (
                <DealTeamTab teamMembers={teamMembers} setTeamMembers={setTeamMembers} currentUserId={session?.user.teamMemberId || -1} isAdmin={isAdmin} inputClass={inputClass} selectTriggerClass={selectTriggerClass} cardClass={cardClass} />
              )}

              {/* Submitted Deals */}
              {activeTab === "submitted-deals" && (() => {
                const currentTeamMemberId = session?.user.teamMemberId;
                const isLenderRole = session?.user.role === "lender";
                const visibleDeals = isAdmin
                  ? submittedDeals
                  : isLenderRole
                  ? [] // lenders see deals via lender portal, not here
                  : submittedDeals.filter((d) =>
                      (currentTeamMemberId && d.assignedAdvisorIds.includes(currentTeamMemberId)) ||
                      (session?.user.id && (d.invitedUserIds || []).includes(session.user.id))
                    );

                function DealCard({ deal }: { deal: SubmittedDeal }) {
                  const [showInvite, setShowInvite] = React.useState(false);
                  const [showLenderResponses, setShowLenderResponses] = React.useState(false);
                  const [threadMessages, setThreadMessages] = React.useState<Record<string, any[]>>({});
                  const [threadInput, setThreadInput] = React.useState<Record<string, string>>({});
                  const [threadLoading, setThreadLoading] = React.useState<Record<string, boolean>>({});
                  const [replyOpen, setReplyOpen] = React.useState<Record<string, boolean>>({});

                  async function loadThread(token: string) {
                    const msgs = await fetch("/api/submission-messages?token=" + token).then(r => r.json());
                    if (Array.isArray(msgs)) setThreadMessages(p => ({ ...p, [token]: msgs }));
                  }

                  async function sendMessage(token: string, submissionId: number) {
                    const msg = (threadInput[token] || "").trim();
                    if (!msg) return;
                    setThreadLoading(p => ({ ...p, [token]: true }));
                    setThreadInput(p => ({ ...p, [token]: "" }));
                    await fetch("/api/submission-messages", { method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token, dealId: deal.id, senderName: session?.user.name || "Admin",
                        senderRole: session?.user.role || "admin", message: msg }) });
                    await loadThread(token);
                    setThreadLoading(p => ({ ...p, [token]: false }));
                  }
                  


                  async function updateLenderResponseStatus(token: string, newStatus: string) {
                    await fetch("/api/lender-submissions", { method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "respond", token, status: newStatus }) });
                    const updated = await fetch("/api/lender-submissions?dealId=" + deal.id).then(r => r.json());
                    if (Array.isArray(updated)) setSentLenders(updated);
                  }
                  const [inviteUserId, setInviteUserId] = React.useState("");
                  const advisors = teamMembers.filter((m) => deal.assignedAdvisorIds.includes(m.id));
                  const invitedUsers = users.filter((u) => (deal.invitedUserIds || []).includes(u.id));

                  function handleInvite() {
                    if (!inviteUserId) return;
                    const uid = parseInt(inviteUserId);
                    if ((deal.invitedUserIds || []).includes(uid)) return;
                    const updated = submittedDeals.map((d) =>
                      d.id === deal.id ? { ...d, invitedUserIds: [...(d.invitedUserIds || []), uid] } : d
                    );
                    setSubmittedDeals(updated);
                    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "deals", data: updated }) }).catch(e => console.error(e));
                    setInviteUserId(""); setShowInvite(false);
                  }

                  function removeInvite(uid: number) {
                    const updated = submittedDeals.map((d) =>
                      d.id === deal.id ? { ...d, invitedUserIds: (d.invitedUserIds || []).filter(id => id !== uid) } : d
                    );
                    setSubmittedDeals(updated);
                    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "deals", data: updated }) }).catch(e => console.error(e));
                  }

                  const [editingDeal, setEditingDeal] = React.useState(false);
                  const [editDealFields, setEditDealFields] = React.useState({
                    seekerName: deal.seekerName || "",
                    seekerEmail: deal.seekerEmail || "",
                    seekerPhone: deal.seekerPhone || "",
                    notes: deal.notes || "",
                    loanAmount: deal.assets?.[0]?.loanAmount || "",
                    propertyValue: deal.assets?.[0]?.propertyValue || "",
                    dscr: deal.assets?.[0]?.dscr || "",
                    currentNetIncome: deal.assets?.[0]?.currentNetIncome || "",
                  });

                  function saveDealEdits() {
                    const updated = {
                      ...deal,
                      seekerName: editDealFields.seekerName,
                      seekerEmail: editDealFields.seekerEmail,
                      seekerPhone: editDealFields.seekerPhone,
                      notes: editDealFields.notes,
                      assets: deal.assets.map((a, i) => i === 0 ? {
                        ...a,
                        loanAmount: editDealFields.loanAmount,
                        propertyValue: editDealFields.propertyValue,
                        dscr: editDealFields.dscr,
                        currentNetIncome: editDealFields.currentNetIncome,
                      } : a),
                    };
                    const newDeals = submittedDeals.map(d => d.id === deal.id ? updated : d);
                    setSubmittedDeals(newDeals);
                    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "deals", data: newDeals }) }).catch(console.error);
                    setEditingDeal(false);
                  }

                  const [showSendLenders, setShowSendLenders] = React.useState(false);
                  const [showDocUpload, setShowDocUpload] = React.useState(false);
                  const [showDocRequest, setShowDocRequest] = React.useState(false);
                  const [docType, setDocType] = React.useState("Rent Roll");
                  const [docLabel, setDocLabel] = React.useState("");
                  const [docFile, setDocFile] = React.useState<File|null>(null);
                  const [docUploading, setDocUploading] = React.useState(false);
                  const [dealDocs, setDealDocs] = React.useState<any[]>([]);
                  const [requestDocs, setRequestDocs] = React.useState<string[]>([]);
                  const [requestEmail, setRequestEmail] = React.useState(deal.seekerEmail || "");
                  const [requestSending, setRequestSending] = React.useState(false);
                  const [requestSent, setRequestSent] = React.useState(false);

                  React.useEffect(() => {
                    function loadDocs() {
                      fetch("/api/upload?dealId=" + deal.id)
                        .then(r => r.json()).then(d => { if (Array.isArray(d)) setDealDocs(d); }).catch(() => {});
                    }
                    loadDocs();
                  }, [deal.id]);

                  async function uploadDoc() {
                    if (!docFile) return;
                    setDocUploading(true);
                    const formData = new FormData();
                    formData.append("file", docFile);
                    formData.append("dealId", String(deal.id));
                    formData.append("dealNumber", deal.dealNumber || "");
                    formData.append("uploadedBy", session?.user.name || "Admin");
                    formData.append("uploadedByRole", session?.user.role || "admin");
                    formData.append("docType", docType);
                    formData.append("docLabel", docType === "Other" ? docLabel : docType);
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    const data = await res.json();
                    if (data.success) {
                      // Refresh docs list
                      const updated = await fetch("/api/upload?dealId=" + deal.id).then(r => r.json());
                      if (Array.isArray(updated)) setDealDocs(updated);
                      setDocFile(null); setDocType("Rent Roll"); setDocLabel("");
                      // Also show the folder panel
                      setShowDocUpload(false);
                    } else {
                      alert("Upload failed: " + (data.error || "Unknown error"));
                    }
                    setDocUploading(false);
                  }

                  async function deleteDoc(docId: number, docName: string) {
                    if (isAdmin) {
                      if (!window.confirm('Delete "' + docName + '"?')) return;
                      await fetch("/api/upload?id=" + docId, { method: "DELETE" });
                      const updated = await fetch("/api/upload?dealId=" + deal.id).then(r => r.json());
                      if (Array.isArray(updated)) setDealDocs(updated);
                    } else {
                      alert("Delete request submitted to admin for approval.");
                    }
                  }


                  const [docMenuOpenId, setDocMenuOpenId] = React.useState<number|null>(null);



                  async function sendDocRequest() {
                    if (requestDocs.length === 0) return;
                    setRequestSending(true);
                    const advisor = teamMembers.find((m: TeamMember) => deal.assignedAdvisorIds?.includes(m.id));
                    await fetch("/api/document-request", { method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ dealId: deal.id, dealNumber: deal.dealNumber, borrowerName: deal.seekerName,
                        borrowerEmail: requestEmail, requestedBy: advisor?.name || session?.user.name || "CapMoon",
                        requestedByRole: session?.user.role, documentsNeeded: requestDocs }) });
                    setRequestSending(false); setRequestSent(true);
                    setTimeout(() => { setRequestSent(false); setShowDocRequest(false); setRequestDocs([]); }, 3000);
                  }
                  const [lenderSearch, setLenderSearch] = React.useState("");
                  const [selectedLenderIds, setSelectedLenderIds] = React.useState<number[]>([]);
                  const [sendingToLenders, setSendingToLenders] = React.useState(false);
                  const [sentLenders, setSentLenders] = React.useState<any[]>([]);

                  React.useEffect(() => {
                    fetch("/api/lender-submissions?dealId=" + deal.id)
                      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSentLenders(d); })
                      .catch(() => {});
                  }, [deal.id]);

                  async function sendToLenders() {
                    setSendingToLenders(true);
                    const advisor = teamMembers.find((m: TeamMember) => deal.assignedAdvisorIds?.includes(m.id));
                    for (const lid of selectedLenderIds) {
                      const lender = lenderRecords.find((l: LenderRecord) => l.id === lid);
                      if (!lender) continue;
                      const email = lender.contacts?.[0]?.email || lender.email || "";
                      await fetch("/api/lender-submissions", { method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "send", dealId: deal.id, lenderId: lid, lenderName: lender.lender,
                          lenderEmail: email, dealTitle: (deal.assets?.[0]?.assetType || "CRE") + " - " + (deal.assets?.[0]?.loanAmount || "TBD"),
                          advisorName: advisor?.name || "CapMoon" }) });
                    }
                    const updated = await fetch("/api/lender-submissions?dealId=" + deal.id).then(r => r.json());
                    if (Array.isArray(updated)) setSentLenders(updated);
                    setSelectedLenderIds([]); setShowSendLenders(false); setSendingToLenders(false);
                  }

                  async function updateLenderSubmissionStatus(token: string, newStatus: string) {
                    await fetch("/api/lender-submissions", { method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "respond", token, status: newStatus }) });
                    const updated = await fetch("/api/lender-submissions?dealId=" + deal.id).then(r => r.json());
                    if (Array.isArray(updated)) setSentLenders(updated);
                  }

                  function updateDealStatus(status: SubmittedDeal["status"]) {
                    const updated = submittedDeals.map((d) => d.id === deal.id ? { ...d, status } : d);
                    setSubmittedDeals(updated);
                    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "deals", data: updated }) }).catch(e => console.error(e));
                  }

                  return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Deal #{deal.id}</div>
                          <div className="text-base font-bold text-[#0a1f44]">{deal.seekerName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Submitted: {deal.submittedAt}</div>
                        </div>
                        <select
                          value={deal.status}
                          onChange={(e) => updateDealStatus(e.target.value as SubmittedDeal["status"])}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${deal.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" : deal.status === "assigned" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {[["Capital Type", deal.capitalType], ["Assets", `${deal.assets.length} asset${deal.assets.length > 1 ? "s" : ""}`], ["Loan Amount", deal.assets[0]?.loanAmount || "—"], ["Asset Type", deal.assets[0]?.assetType || "—"]].map(([label, val]) => (
                          <div key={String(label)} className="rounded-lg bg-white border border-gray-200 p-3"><div className="text-xs text-gray-400 mb-1">{label}</div><div className="text-sm font-bold text-[#0a1f44]">{val}</div></div>
                        ))}
                      </div>
                      {deal.assets.map((asset, idx) => asset.address?.city ? (
                        <div key={idx} className="text-xs text-gray-500 mt-1">Asset {idx + 1}: {asset.address.street ? `${asset.address.street}, ` : ""}{asset.address.city}, {asset.address.state} {asset.address.zip}</div>
                      ) : null)}
                      {advisors.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold mb-3">Assigned Advisor{advisors.length > 1 ? "s" : ""}</div>
                          <div className="flex gap-3 flex-wrap">
                            {advisors.map((advisor) => (
                              <div key={advisor.id} className="flex items-center gap-3 bg-[#0a1f44] rounded-xl px-4 py-3">
                                <img src={advisor.photo || "/logo1.JPEG"} alt={advisor.name} className="h-10 w-10 rounded-lg object-cover border border-[#c9a84c]/30 flex-shrink-0" />
                                <div>
                                  <div className="text-xs font-bold text-white">{advisor.name}</div>
                                  <div className="text-xs text-[#c9a84c]">{advisor.title}</div>
                                  <div className="text-xs text-gray-400 mt-0.5">{advisor.phone}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {invitedUsers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold mb-2">Collaborators</div>
                          <div className="flex flex-wrap gap-2">
                            {invitedUsers.map((u) => (
                              <div key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20">
                                <span className="text-xs font-medium text-[#0a1f44]">{u.name}</span>
                                <span className="text-xs text-gray-400">· {u.role}</span>
                                {isAdmin && <button onClick={() => removeInvite(u.id)} className="ml-1 text-gray-400 hover:text-red-500 text-xs font-bold">✕</button>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                        <button onClick={() => { setPrefillDeal(deal); setActiveTab("matcher"); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
                          <Filter className="h-4 w-4" /> Resubmit to Deal Matcher
                        </button>
                        <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#c9a84c]/30 text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/10">
                          <Users className="h-4 w-4" /> Invite Collaborator
                        </button>
                        <button onClick={() => setShowLenderResponses(!showLenderResponses)} className={"flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl transition-all " + (showLenderResponses ? "border-[#0a1f44] bg-[#0a1f44] text-white" : "border-[#0a1f44]/30 text-[#0a1f44] hover:bg-[#0a1f44]/5")}>
                          <Landmark className="h-4 w-4" /> Lender Responses
                          {sentLenders.length > 0 && <span className={"ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold " + (showLenderResponses ? "bg-white text-[#0a1f44]" : "bg-[#c9a84c] text-[#0a1f44]")}>{sentLenders.length}</span>}
                        </button>
                      </div>

                      {/* Document Upload + Request */}
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => setShowDocUpload(p => !p)}
                            className={"flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-xl transition-all " + (showDocUpload ? "border-[#0a1f44] bg-[#0a1f44] text-white" : "border-gray-200 text-gray-600 hover:border-[#0a1f44]/30")}>
                            <FileSpreadsheet className="h-3.5 w-3.5" /> Upload Docs
                            {dealDocs.length > 0 && <span className={"ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold " + (showDocUpload ? "bg-white text-[#0a1f44]" : "bg-[#0a1f44] text-white")}>{dealDocs.length}</span>}
                          </button>
                          <button type="button" onClick={() => setShowDocRequest(p => !p)}
                            className={"flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-xl transition-all " + (showDocRequest ? "border-[#c9a84c] bg-[#c9a84c] text-[#0a1f44]" : "border-gray-200 text-gray-600 hover:border-[#c9a84c]/30")}>
                            <FileText className="h-3.5 w-3.5" /> Request Docs from Borrower
                          </button>
                        </div>

                        {showDocUpload && (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">Upload Document</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block font-bold">Document Type</label>
                                <select value={docType} onChange={e => setDocType(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]">
                                  {["Rent Roll","T12 Financials","Operating Statement","Tax Returns (2yr)","Bank Statements (3mo)","Purchase Contract","Appraisal","Environmental Report","Survey","Title Report","Loan Application","Personal Financial Statement","Entity Documents","Construction Budget","Proforma","Other"].map((t: string) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block font-bold">File</label>
                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                  onChange={e => setDocFile(e.target.files?.[0] || null)}
                                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl" />
                              </div>
                            </div>
                            {docType === "Other" && (
                              <input value={docLabel} onChange={e => setDocLabel(e.target.value)}
                                placeholder="Describe this document..." className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" />
                            )}
                            {docFile && (
                              <button type="button" onClick={uploadDoc} disabled={docUploading}
                                className="w-full py-2.5 text-sm font-bold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-50">
                                {docUploading ? "Uploading..." : "Upload " + (docType === "Other" ? docLabel || "Document" : docType)}
                              </button>
                            )}
                            {dealDocs.length > 0 && (
                              <div className="space-y-1.5 border-t border-gray-200 pt-3">
                                <div className="text-xs font-bold text-[#0a1f44] mb-2">Uploaded Documents</div>
                                {dealDocs.map((doc: any) => (
                                  <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                    <div>
                                      <div className="text-xs font-semibold text-[#0a1f44]">{doc.document_name}</div>
                                      <div className="text-xs text-gray-400">{doc.lender_name} · {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                                    </div>
                                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                                      className="px-2.5 py-1 text-xs font-semibold border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/5">
                                      View →
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {showDocRequest && (
                          <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 space-y-3">
                            <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">Request Documents from Borrower</div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block font-bold">Borrower Email</label>
                              <input value={requestEmail} onChange={e => setRequestEmail(e.target.value)}
                                placeholder="borrower@email.com" className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-2 block font-bold">Documents Needed</label>
                              <div className="flex flex-wrap gap-1.5">
                                {["Rent Roll","T12 Financials","Operating Statement","Tax Returns (2yr)","Bank Statements (3mo)","Purchase Contract","Appraisal","Environmental Report","Survey","Title Report","Loan Application","Personal Financial Statement","Entity Documents","Construction Budget","Proforma","Other"].map((t: string) => (
                                  <button key={t} type="button" onClick={() => setRequestDocs(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                    className={"px-2.5 py-1 text-xs rounded-full border font-medium transition-all " + (requestDocs.includes(t) ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0a1f44]/30")}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {requestDocs.length > 0 && (
                              <button type="button" onClick={sendDocRequest} disabled={requestSending || requestSent}
                                className={"w-full py-2.5 text-sm font-bold rounded-xl " + (requestSent ? "bg-green-500 text-white" : "bg-[#c9a84c] text-[#0a1f44] hover:bg-[#c9a84c]/80")}>
                                {requestSent ? "✓ Sent!" : requestSending ? "Sending..." : "Send Request (" + requestDocs.length + " docs)"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {showInvite && (
                        <div className="mt-3 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
                          <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-3">Invite a Collaborator</div>
                          <div className="flex gap-2">
                            <select value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-[#0a1f44]">
                              <option value="">Select a user...</option>
                              {users.filter((u) => u.id !== session?.user.id && !(deal.invitedUserIds || []).includes(u.id)).map((u) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                              ))}
                            </select>
                            <button onClick={handleInvite} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Invite</button>
                            <button onClick={() => setShowInvite(false)} className="px-3 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      )}

                        {/* Document Folder — always visible when docs exist */}
                        {dealDocs.length > 0 && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-[#0a1f44]/15">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#0a1f44]">
                              <div className="flex items-center gap-2">
                                <span className="text-base">📁</span>
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Deal Documents</span>
                                <span className="px-2 py-0.5 text-xs bg-[#c9a84c] text-[#0a1f44] rounded-full font-bold">{dealDocs.length}</span>
                              </div>
                              {deal.dealNumber && <span className="text-xs text-white/50">{deal.dealNumber}</span>}
                            </div>
                            <div className="bg-white divide-y divide-gray-100">
                              {dealDocs.map((doc: any) => (
                                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                                  <span className="text-xl flex-shrink-0">
                                    {(() => {
                                      const t = doc.document_type || "";
                                      if (t.includes("Rent Roll") || t.includes("Financial") || t.includes("Statement") || t.includes("Budget") || t.includes("Proforma")) return "📊";
                                      if (t.includes("Tax")) return "🧾";
                                      if (t.includes("Bank")) return "🏦";
                                      if (t.includes("Contract")) return "📝";
                                      if (t.includes("Appraisal")) return "🏠";
                                      if (t.includes("Environmental") || t.includes("Survey")) return "🗺️";
                                      if (t.includes("Title")) return "📋";
                                      if (t.includes("Entity") || t.includes("Personal")) return "👤";
                                      if (t.includes("Construction")) return "🏗️";
                                      return "📄";
                                    })()}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-[#0a1f44] truncate">{doc.document_name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{doc.lender_name} · {new Date(doc.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                                      className="px-3 py-1.5 text-xs font-bold bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80">
                                      View
                                    </a>
                                    <button type="button" onClick={() => deleteDoc(doc.id, doc.document_name)}
                                      className={"px-3 py-1.5 text-xs font-bold border rounded-lg " + (isAdmin ? "border-red-200 text-red-500 hover:bg-red-50" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
                                      {isAdmin ? "Delete" : "Remove"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Document Folder — always visible when docs exist */}
                    {showLenderResponses && (
                        <div className="mt-3 rounded-xl border border-[#0a1f44]/20 bg-white p-4">
                          <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-3">Lender Responses</div>
                          {sentLenders.length === 0 ? (
                            <div className="text-xs text-gray-400 py-4 text-center">No lenders have been sent this deal yet. Use the Send to Lenders button on a deal to get started.</div>
                          ) : (
                            <div className="space-y-2">
                              {sentLenders.map((sl: any) => (
                                <div key={sl.id} className={"rounded-lg border p-3 " + (sl.status === "declined" ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50")}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-[#0a1f44] truncate">{sl.lender_name}</div>
                                      <div className="text-xs text-gray-400 mt-0.5">Sent {new Date(sl.created_at).toLocaleDateString()}{sl.viewed_at ? " · Viewed " + new Date(sl.viewed_at).toLocaleDateString() : ""}</div>
                                      {sl.response_message && (
                                        <div className="mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 italic">
                                          "{sl.response_message}"
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                      <span className={"px-2.5 py-1 text-xs font-bold rounded-full " +
                                        (sl.status === "declined" ? "bg-red-100 text-red-600" :
                                         sl.status === "info_requested" ? "bg-blue-100 text-blue-700" :
                                         sl.status === "viewed" ? "bg-yellow-100 text-yellow-700" :
                                         "bg-gray-100 text-gray-500")}>
                                        {sl.status === "info_requested" ? "Info Requested" :
                                         sl.status === "viewed" ? "Viewed" :
                                         sl.status === "declined" ? "Declined" : "Sent"}
                                      </span>
                                      {isAdmin && (
                                        <select value={sl.status} onChange={e => updateLenderResponseStatus(sl.token, e.target.value)}
                                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 bg-white focus:outline-none focus:border-[#0a1f44]">
                                          <option value="sent">Sent</option>
                                          <option value="viewed">Viewed</option>
                                          <option value="info_requested">Info Requested</option>
                                          <option value="declined">Declined</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                  {sl.responded_at && (
                                    <div className="text-xs text-gray-400 mt-1">Responded {new Date(sl.responded_at).toLocaleDateString()}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className={cardClass + " p-6"}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">CapMoon</div>
                        <h2 className="font-display text-2xl font-bold text-[#0a1f44]">Submitted Deals</h2>
                      </div>
                      <div className="text-xs text-gray-400">{visibleDeals.length} deal{visibleDeals.length !== 1 ? "s" : ""}</div>
                    </div>

                    {(() => {
                      // Deal sections
                      const adminDeals = visibleDeals.filter(d => {
                        const sub = users.find(u => u.name === d.seekerName);
                        return sub?.role === "admin";
                      });
                      const advisorDeals = visibleDeals.filter(d => {
                        const sub = users.find(u => u.name === d.seekerName);
                        return sub?.role === "advisor" || (d.assignedAdvisorIds.length > 0 && !adminDeals.includes(d) && !(users.find(u=>u.name===d.seekerName)?.role==="capital-seeker"));
                      });
                      const clientDeals = visibleDeals.filter(d => {
                        return !adminDeals.includes(d) && !advisorDeals.includes(d);
                      });

                      // Unique advisors + clients for dropdowns
                      const advisorOptions = teamMembers.map(m => m.name);
                      const clientOptions = [...new Set(clientDeals.map(d => d.seekerName))];

                      // Apply search + filters to a deal list
                      function filterDeals(deals: SubmittedDeal[]) {
                        return deals.filter(d => {
                          const asset = d.assets?.[0];
                          const q = dealSearch.toLowerCase();
                          if (q && ![d.seekerName, d.capitalType, asset?.assetType, asset?.loanAmount,
                            asset?.address?.city, asset?.address?.state, asset?.dealType]
                            .some(v => v?.toLowerCase().includes(q))) return false;
                          if (filterStatus !== "All" && d.status !== filterStatus.toLowerCase()) return false;
                          if (filterCapital !== "All" && d.capitalType !== filterCapital) return false;
                          return true;
                        });
                      }

                      function filterAdvisorDeals(deals: SubmittedDeal[]) {
                        let filtered = filterDeals(deals);
                        if (filterAdvisor !== "All") {
                          const tm = teamMembers.find(m => m.name === filterAdvisor);
                          if (tm) filtered = filtered.filter(d => d.assignedAdvisorIds.includes(tm.id));
                        }
                        return filtered;
                      }

                      function filterClientDeals(deals: SubmittedDeal[]) {
                        let filtered = filterDeals(deals);
                        if (filterClient !== "All") filtered = filtered.filter(d => d.seekerName === filterClient);
                        return filtered;
                      }

                      const filteredAdmin = filterDeals(adminDeals);
                      const filteredAdvisor = filterAdvisorDeals(advisorDeals);
                      const filteredClient = filterClientDeals(clientDeals);
                      const totalFiltered = filteredAdmin.length + filteredAdvisor.length + filteredClient.length;


                      return (
                        <>
                          {/* Search + Global Filters */}
                          <div className="mb-6 space-y-3">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input value={dealSearch} onChange={e => setDealSearch(e.target.value)}
                                  placeholder='Search deals or try AI: "Louis deals pending in Florida"'
                                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" />
                              </div>
                              <button
                                onClick={async () => {
                                  if (!dealSearch.trim()) return;
                                  const res = await fetch("/api/ai-search", { method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ query: dealSearch, mode: "deals", teamMembers }) });
                                  const data = await res.json();
                                  if (data.filters) {
                                    const f = data.filters;
                                    if (f.status) setFilterStatus(f.status.charAt(0).toUpperCase() + f.status.slice(1));
                                    if (f.capitalType) setFilterCapital(f.capitalType);
                                    if (f.advisorName) setFilterAdvisor(f.advisorName);
                                    if (f.seekerName) setFilterClient(f.seekerName);
                                    if (f.keywords?.length > 0) setDealSearch(f.keywords.join(" "));
                                  }
                                }}
                                className="px-3 py-2 text-xs font-semibold bg-[#c9a84c] text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/80 flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Sparkles className="h-3.5 w-3.5" /> AI
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Assigned">Assigned</option>
                                <option value="Closed">Closed</option>
                              </select>
                              <select value={filterCapital} onChange={e => setFilterCapital(e.target.value)}
                                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
                                <option value="All">All Capital Types</option>
                                {capitalTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                              </select>
                              {(dealSearch || filterStatus !== "All" || filterCapital !== "All") && (
                                <button type="button" onClick={() => { setDealSearch(""); setFilterStatus("All"); setFilterCapital("All"); }}
                                  className="px-3 py-2 text-xs text-red-400 border border-red-200 rounded-xl hover:bg-red-50">
                                  Clear Filters ✕
                                </button>
                              )}
                              <div className="ml-auto text-xs text-gray-400 self-center">{totalFiltered} deal{totalFiltered !== 1 ? "s" : ""} shown</div>
                            </div>
                          </div>

                          {/* My Deals / Admin Section */}
                          {isAdmin && (
                            <div className="mb-6">
                              <SectionHeader title="My Deals" count={filteredAdmin.length} color="#0a1f44" show={showMyDeals} onToggle={() => setShowMyDeals(p => !p)} />
                              {showMyDeals && (
                                filteredAdmin.length === 0
                                  ? <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 mb-4">No deals found</div>
                                  : <div className="space-y-4 mb-4">{filteredAdmin.map(d => <DealCard key={d.id} deal={d} />)}</div>
                              )}
                            </div>
                          )}

                          {/* Advisor Deals Section */}
                          {isAdmin && (
                            <div className="mb-6">
                              <SectionHeader title="Capital Advisor Deals" count={filteredAdvisor.length} color="#c9a84c" show={showAdvisorDeals} onToggle={() => setShowAdvisorDeals(p => !p)}>
                                <select value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)}
                                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
                                  <option value="All">All Advisors</option>
                                  {advisorOptions.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                              </SectionHeader>
                              {showAdvisorDeals && (
                                filteredAdvisor.length === 0
                                  ? <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 mb-4">No deals found</div>
                                  : <div className="space-y-4 mb-4">{filteredAdvisor.map(d => <DealCard key={d.id} deal={d} />)}</div>
                              )}
                            </div>
                          )}

                          {/* Client Deals Section */}
                          <div className="mb-6">
                            <SectionHeader title="Client / Customer Deals" count={filteredClient.length} color="#10b981" show={showClientDeals} onToggle={() => setShowClientDeals(p => !p)}>
                              {clientOptions.length > 0 && (
                                <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
                                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-600">
                                  <option value="All">All Clients</option>
                                  {clientOptions.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                                </select>
                              )}
                            </SectionHeader>
                            {showClientDeals && (
                              filteredClient.length === 0
                                ? <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 mb-4">
                                    {clientDeals.length === 0 ? "No client deals yet." : "No deals match your filters."}
                                  </div>
                                : <div className="space-y-4 mb-4">{filteredClient.map(d => <DealCard key={d.id} deal={d} />)}</div>
                            )}
                          </div>

                          {/* Non-admin: just show visible deals with search */}
                          {!isAdmin && (
                            visibleDeals.length === 0
                              ? <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-400">No deals assigned to you yet.</div>
                              : <div className="space-y-4">{filterDeals(visibleDeals).map(d => <DealCard key={d.id} deal={d} />)}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Uploads */}
              {activeTab === "uploads" && (
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Admin</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Workbook Ingestion</h2>
                    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center hover:border-[#0a1f44]/40 transition-all">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f44]/10 border border-[#0a1f44]/20 text-[#0a1f44] mb-4"><Upload className="h-6 w-6" /></div>
                      <div className="text-base font-bold text-[#0a1f44] mb-1">Drop Updated Lender Workbook</div>
                      <div className="text-sm text-gray-500 mb-5">Supports .xlsx ingestion with automatic field mapping.</div>
                      <button className="px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Select Spreadsheet</button>
                    </div>
                  </div>
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Preview</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Detected Schema</h2>
                    <div className="flex flex-wrap gap-2 mb-5">{["Program Name", "Contact Person", "Email Address", "Phone Number", "Website", "Type of Lender", "Type of Loans", "Program", "Property Types", "Loan Terms", "Min Loan Size", "Max Loan Size", "Max LTV", "Target States", "Sponsor States", "Recourse", "Capital Type", "Notes", "Source Tag"].map((field) => (<span key={field} className="px-3 py-1 rounded-full text-xs border border-[#0a1f44]/20 text-[#0a1f44] font-medium">{field}</span>))}</div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">All fields above are automatically mapped when a spreadsheet is uploaded.</div>
                  </div>
                </div>
              )}

              {/* User Management (admin only) */}
              {activeTab === "user-management" && isAdmin && (
                <div className="space-y-6">
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">CapMoon</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-1">Admin Portal</h2>
                    <p className="text-sm text-gray-500 mb-5">Manage users, roles, permissions and email notifications.</p>

                    {/* Add New User */}
                    <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-5 mb-6">
                      <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-4">Add New User</div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Full Name</label><Input value={newUserForm.name} onChange={(e) => setNewUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="John Smith" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Email / Username</label><Input value={newUserForm.username} onChange={(e) => setNewUserForm((p) => ({ ...p, username: e.target.value }))} placeholder="john@capmoon.com" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Password</label><Input value={newUserForm.password} onChange={(e) => setNewUserForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Role</label>
                          <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm((p) => ({ ...p, role: v as AppUser["role"] }))}>
                            <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="advisor">Capital Advisor</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="lender">Lender</SelectItem>
                              <SelectItem value="capital-seeker">Client / Borrower</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <button onClick={addUser} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Add User</button>
                    </div>

                    {/* Search */}
                    <div className="mb-4 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        placeholder="Search users by name, email or role..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]" />
                    </div>

                    {/* Users by role group */}
                    {[
                      { key: "admin",         label: "Administrators",      color: "#0a1f44", emoji: "🔐" },
                      { key: "advisor",        label: "Capital Advisors",    color: "#c9a84c", emoji: "💼" },
                      { key: "staff",          label: "Staff",               color: "#6366f1", emoji: "👤" },
                      { key: "lender",         label: "Lenders",             color: "#10b981", emoji: "🏦" },
                      { key: "capital-seeker", label: "Clients / Borrowers", color: "#f59e0b", emoji: "🏢" },
                    ].map(group => {
                      const groupUsers = users.filter(u => u.role === group.key &&
                        (!userSearch || (u.name||"").toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())));
                      return (
                        <div key={group.key} className="mb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: group.color }} />
                            <span className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">{group.emoji} {group.label}</span>
                            <span className="text-xs text-gray-400">({groupUsers.length})</span>
                            <div className="h-px flex-1 bg-gray-200" />
                          </div>
                          {groupUsers.length === 0 ? (
                            <div className="text-xs text-gray-400 py-2 pl-2">
                              {userSearch ? "No matches" : "No " + group.label.toLowerCase() + " yet"}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {groupUsers.map(u => (
                                <div key={u.id} className={"rounded-xl border bg-white " + ((u as any).blocked ? "border-red-200" : "border-gray-200")}>
                                  <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold " + ((u as any).blocked ? "bg-red-100 text-red-500" : "bg-[#0a1f44]/10 text-[#0a1f44]")}>
                                        {(u.name || u.username || "?")[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-sm font-bold text-[#0a1f44]">{u.name || u.username}</div>
                                        <div className="text-xs text-gray-400">{u.username}{(u as any).blocked && <span className="ml-2 text-red-400">· Blocked</span>}</div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      {u.id === 1 && <span className="px-2 py-0.5 text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full font-bold">Master Admin</span>}
                                      {editingUserId === u.id ? (
                                        <button onClick={() => setEditingUserId(null)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">Close</button>
                                      ) : (
                                        <button onClick={() => { setEditingUserId(u.id); setUserEditForm({ name: u.name||"", username: u.username||"", phone: (u as any).phone||"", password: "" }); }} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/5">Edit</button>
                                      )}
                                      {u.id !== 1 && (
                                        <button onClick={() => { const upd = users.map(x => x.id===u.id ? {...x, blocked: !(x as any).blocked} as AppUser : x); setUsers(upd); fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"users",data:upd})}).catch(console.error); }}
                                          className={"px-3 py-1 text-xs border rounded-lg " + ((u as any).blocked ? "border-green-200 text-green-600 hover:bg-green-50" : "border-orange-200 text-orange-600 hover:bg-orange-50")}>
                                          {(u as any).blocked ? "Unblock" : "Block"}
                                        </button>
                                      )}
                                      {u.id !== 1 && (
                                        <button onClick={() => { if(!window.confirm("Delete " + (u.name||u.username) + "?")) return; const upd = users.filter(x => x.id!==u.id); setUsers(upd); fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"users",data:upd})}).catch(console.error); }}
                                          className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Delete</button>
                                      )}
                                    </div>
                                  </div>
                                  {editingUserId === u.id && (
                                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                                      <div className="grid gap-2 md:grid-cols-2">
                                        <div><label className="text-xs text-gray-400 mb-1 block">Full Name</label><input value={userEditForm.name} onChange={e => setUserEditForm(p=>({...p,name:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                        <div><label className="text-xs text-gray-400 mb-1 block">Email</label><input value={userEditForm.username} onChange={e => setUserEditForm(p=>({...p,username:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                        <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><input value={userEditForm.phone} onChange={e => setUserEditForm(p=>({...p,phone:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                        <div><label className="text-xs text-gray-400 mb-1 block">New Password <span className="text-gray-300">(blank = keep)</span></label><input type="password" value={userEditForm.password} onChange={e => setUserEditForm(p=>({...p,password:e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] bg-white" /></div>
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-[#0a1f44] mb-2">Email Notifications</div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {([["Deal Submitted","dealSubmitted"],["Lender Responded","lenderResponded"],["Doc Requested","documentRequested"],["Status Changed","statusChanged"],["Deal Assigned","dealAssigned"]] as [string,string][]).map(([label,key]) => {
                                            const prefs: any = (u as any).emailPrefs || {};
                                            const on = prefs[key] !== false;
                                            return <button key={key} type="button" onClick={() => { const upd = users.map(x => x.id===u.id ? {...x, emailPrefs: {...prefs, [key]: !on}} as AppUser : x); setUsers(upd); fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"users",data:upd})}).catch(console.error); }} className={"px-2 py-0.5 text-xs rounded-full border font-medium " + (on ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-gray-100 text-gray-400 border-gray-200")}>{label}</button>;
                                          })}
                                        </div>
                                        {u.role === "lender" && <p className="text-xs text-gray-400 mt-1">Lenders always receive the initial deal request.</p>}
                                      </div>
                                      {u.role !== "admin" && (
                                        <div>
                                          <div className="text-xs font-bold text-[#0a1f44] mb-2">Blocked Lenders</div>
                                          <DropdownCheckbox label="Blocked Lenders"
                                            options={[...lenderRecords].sort((a,b)=>a.lender.localeCompare(b.lender)).map(l=>l.lender)}
                                            selected={u.blockedLenderIds.map(id=>lenderRecords.find(l=>l.id===id)?.lender||"").filter(Boolean)}
                                            onChange={names => { const upd = users.map(x => x.id===u.id ? {...x, blockedLenderIds: lenderRecords.filter(l=>names.includes(l.lender)).map(l=>l.id)} : x); setUsers(upd); fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"users",data:upd})}).catch(console.error); }} />
                                        </div>
                                      )}
                                      <button onClick={() => { const upd = users.map(x => x.id===u.id ? {...x, name: userEditForm.name||x.name, username: userEditForm.username||x.username, phone: userEditForm.phone, ...(userEditForm.password?{password:userEditForm.password}:{})} as AppUser : x); setUsers(upd); fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"users",data:upd})}).catch(console.error); setEditingUserId(null); }}
                                        className="px-4 py-2 text-sm font-bold bg-[#0a1f44] text-white rounded-xl">Save Changes</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {activeTab === "delete-queue" && isAdmin && (
                <div className={cardClass + " p-6"}>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Admin Approval</div>
                  <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Lender Delete Requests</h2>
                  {deleteRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-400">No delete requests pending.</div>
                  ) : (
                    <div className="space-y-4">
                      {deleteRequests.map((req) => (
                        <div key={req.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-[#0a1f44]">{req.lenderName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Requested by <span className="font-medium">{req.requestedBy}</span> · {req.requestedAt}</div>
                          </div>
                          {req.status === "pending" ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleDeleteRequestAction(req.id, "approved")} className="px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600">Approve & Delete</button>
                              <button onClick={() => handleDeleteRequestAction(req.id, "denied")} className="px-4 py-2 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-100">Deny</button>
                            </div>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${req.status === "approved" ? "bg-red-50 text-red-500 border border-red-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>{req.status === "approved" ? "Approved & Deleted" : "Denied"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lender Change Requests (admin only) */}
              {activeTab === "lender-changes" && isAdmin && (
                <div className={cardClass + " p-6"}>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Admin Approval</div>
                  <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Lender Change Requests</h2>
                  <p className="text-sm text-gray-500 mb-5">Review and approve or deny lender additions and edits submitted by advisors.</p>
                  {lenderChangeRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-400">No lender change requests pending.</div>
                  ) : (
                    <div className="space-y-4">
                      {lenderChangeRequests.map((req) => (
                        <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${req.changeType === "add" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                                  {req.changeType === "add" ? "New Lender" : "Edit"}
                                </span>
                                <span className="text-sm font-bold text-[#0a1f44]">{req.lenderName}</span>
                              </div>
                              <div className="text-xs text-gray-500">Requested by <span className="font-medium">{req.requestedBy}</span> · {req.requestedAt}</div>
                            </div>
                            {req.status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Apply the change
                                    if (req.changeType === "add") {
                                      setLenderRecords((prev) => { const next = [...prev, req.proposedData]; saveLendersToDb(next); return next; });
                                    } else {
                                      setLenderRecords((prev) => { const next = prev.map((l) => l.id === req.lenderId ? req.proposedData : l); saveLendersToDb(next); return next; });
                                    }
                                    const updated = lenderChangeRequests.map((r) => r.id === req.id ? { ...r, status: "approved" as const } : r);
                                    setLenderChangeRequests(updated);
                                    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lender-changes", data: updated }) }).catch(e => console.error(e));
                                  }}
                                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    if (req.changeType === "edit" && req.lenderId) {
                                      fetch("/api/data?type=lenders").then(r => r.json()).then(dbL => {
                                        if (Array.isArray(dbL) && dbL.length > 0) {
                                          setLenderRecords([...seedLenders, ...dbL]);
                                        } else {
                                          setLenderRecords(seedLenders);
                                        }
                                      });
                                    }
                                    const updated = lenderChangeRequests.map((r) => r.id === req.id ? { ...r, status: "denied" as const } : r);
                                    setLenderChangeRequests(updated);
                                    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lender-changes", data: updated }) }).catch(e => console.error(e));
                                  }}
                                  className="px-4 py-2 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"
                                >
                                  Deny
                                </button>
                              </div>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${req.status === "approved" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                                {req.status === "approved" ? "✓ Approved" : "✕ Denied"}
                              </span>
                            )}
                          </div>
                          {/* Show proposed changes */}
                          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-3">Proposed Data</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {[
                                ["Lender", req.proposedData.lender],
                                ["Capital Type", req.proposedData.type],
                                ["Min Loan", req.proposedData.minLoan || "—"],
                                ["Max Loan", req.proposedData.maxLoan || "—"],
                                ["Max LTV", req.proposedData.maxLtv || "—"],
                                ["Recourse", req.proposedData.recourse || "—"],
                                ["Contact", req.proposedData.contactPerson || "—"],
                                ["Email", req.proposedData.email || "—"],
                              ].map(([label, val]) => (
                                <div key={String(label)} className="rounded-lg bg-white border border-gray-100 p-2">
                                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                                  <div className="text-xs font-semibold text-[#0a1f44] break-all">{val}</div>
                                </div>
                              ))}
                            </div>
                            {req.proposedData.assets && req.proposedData.assets.length > 0 && (
                              <div className="mt-3">
                                <div className="text-xs text-gray-400 mb-1.5">Property Types</div>
                                <div className="flex flex-wrap gap-1">{req.proposedData.assets.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">{t}</span>)}</div>
                              </div>
                            )}
                            {req.proposedData.notes && (
                              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                                <div className="text-xs font-bold text-amber-700 mb-0.5">Notes</div>
                                <div className="text-xs text-gray-700">{req.proposedData.notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Deal Memos */}
              {activeTab === "deal-memos" && isAdmin && (
                <DealMemoTab
                  submittedDeals={submittedDeals}
                  teamMembers={teamMembers}
                  lenderRecords={lenderRecords}
                  cardClass={cardClass}
                  inputClass={inputClass}
                  selectTriggerClass={selectTriggerClass}
                />
              )}

            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [session, setSession] = useState<AuthSession>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [submittedDeals, setSubmittedDeals] = useState<SubmittedDeal[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
  const [lenderChangeRequests, setLenderChangeRequests] = useState<LenderChangeRequest[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Save helper as useCallback so it's stable and available to useEffects
  const saveToDb = React.useCallback(async (type: string, data: any[]) => {
    if (!data || data.length === 0) return;
    // Deduplicate by id before saving
    const unique = Object.values(data.reduce((acc: any, item: any) => {
      const key = item.id || item.token || JSON.stringify(item);
      acc[key] = item;
      return acc;
    }, {})) as any[];
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, data: unique }) });
      const json = await res.json();
      if (!json.success) console.error("DB save returned failure:", json);
    } catch (e) { console.error("DB save failed:", e); }
  }, []);

  // Load data from DB on mount — DB is always source of truth
  React.useEffect(() => {
    async function loadData() {
      async function safeFetch(url: string) {
        try {
          const res = await fetch(url);
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        } catch (e) {
          console.error(`Failed to load ${url}:`, e);
          return [];
        }
      }
      const [dbUsers, dbDeals, dbTeam, dbDeletes, dbLcr] = await Promise.all([
        safeFetch("/api/data?type=users"),
        safeFetch("/api/data?type=deals"),
        safeFetch("/api/data?type=team"),
        safeFetch("/api/data?type=deletes"),
        safeFetch("/api/data?type=lender-changes"),
      ]);
      if (dbUsers.length > 0) setUsers(dbUsers); else setUsers(initialUsers);
      if (dbDeals.length > 0) setSubmittedDeals(dbDeals);
      if (dbTeam.length > 0) setTeamMembers(dbTeam); else setTeamMembers(initialTeamMembers);
      if (dbDeletes.length > 0) setDeleteRequests(dbDeletes);
      if (dbLcr.length > 0) setLenderChangeRequests(dbLcr);
      setDbLoaded(true);
    }
    loadData();
  }, []);

  // Auto-save — fires whenever state changes, but only after DB has loaded

  function handleSubmitDeal(deal: SubmittedDeal) {
    setSubmittedDeals((prev) => { const next = [...prev, deal]; saveToDb("deals", next); return next; });
  }
  function handleLogout() { setSession(null); }
  function handleRegisterCapitalSeeker(newUser: AppUser) {
    setUsers((prev) => { const next = [...prev, newUser]; saveToDb("users", next); return next; });
  }
  function handleSetUsers(newUsers: AppUser[]) {
    if (newUsers.length > 0) { setUsers(newUsers); saveToDb("users", newUsers); }
  }
  function handleSetTeamMembers(newTeam: TeamMember[]) {
    if (newTeam.length > 0) { setTeamMembers(newTeam); saveToDb("team", newTeam); }
  }
  function handleSetSubmittedDeals(newDeals: SubmittedDeal[]) {
    setSubmittedDeals(newDeals);
    if (newDeals.length > 0) saveToDb("deals", newDeals);
  }
  function handleSetDeleteRequests(newReqs: DeleteRequest[]) {
    setDeleteRequests(newReqs);
    if (newReqs.length > 0) saveToDb("deletes", newReqs);
  }
  function handleSetLenderChangeRequests(newReqs: LenderChangeRequest[]) {
    setLenderChangeRequests(newReqs);
    if (newReqs.length > 0) saveToDb("lender-changes", newReqs);
  }

  if (!dbLoaded) return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
      <div className="text-center">
        <img src="/logo1.JPEG" alt="CapMoon" className="h-16 w-16 object-contain rounded-full mx-auto mb-4" />
        <div className="font-display text-2xl font-bold text-[#0a1f44] mb-2">CapMoon</div>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    </div>
  );

  if (!session) return <LoginWall onLogin={setSession} users={users} onRegisterCapitalSeeker={handleRegisterCapitalSeeker} />;
  if (session.user.role === "capital-seeker") {
    return <CapitalSeekerPortal lenderRecords={seedLenders} onLogout={handleLogout} onSubmitDeal={handleSubmitDeal} session={session} teamMembers={teamMembers} submittedDeals={submittedDeals} />;
  }
  return <MainPortal session={session} onLogout={handleLogout} submittedDeals={submittedDeals} setSubmittedDeals={handleSetSubmittedDeals} users={users} setUsers={handleSetUsers} teamMembers={teamMembers} setTeamMembers={handleSetTeamMembers} deleteRequests={deleteRequests} setDeleteRequests={handleSetDeleteRequests} lenderChangeRequests={lenderChangeRequests} setLenderChangeRequests={handleSetLenderChangeRequests} />;
}