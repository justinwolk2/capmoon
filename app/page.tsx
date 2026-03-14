"use client";
import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Building2, FileSpreadsheet, Filter, Gauge, Landmark, Plus, Search, ShieldCheck, Upload, Users, Trash2, ChevronRight, ChevronLeft, CheckCircle, Edit2, Sparkles, Loader2, Lock, LogOut, Settings, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type LenderContact = { id: number; name: string; phone: string; email: string; region: string; };
type LenderRecord = {
  id: number; source: string; spreadsheetRow: string; program: string; lender: string;
  type: string; minLoan: string; maxLoan: string; maxLtv: string; minDscr: string;
  states: string[]; assets: string[]; status: string; email: string; phone: string; recourse: string;
  contactPerson?: string; website?: string; sponsorStates?: string[]; loanTerms?: string;
  typeOfLoans?: string[]; programTypes?: string[]; typeOfLenders?: string[]; contacts?: LenderContact[];
};
type RetailUnit = { id: number; tenant: string; rent: string; sqft: string; };
type AssetAddress = { street: string; unit: string; city: string; state: string; zip: string; };
type AssetData = {
  id: number; ownershipStatus: string; dealType: string; refinanceType: string; assetType: string;
  loanAmount: string; seniorLoanAmount: string; subordinateAmount: string;
  propertyValue: string; purchasePrice: string; currentLoanAmount: string;
  landCost: string; softCosts: string; originationClosingCosts: string;
  hardCosts: string; carryingCosts: string; borrowerEquity: string;
  ltvMode: string; currentNetIncome: string; manualLtv: string; dscr: string;
  selectedStates: string[]; recourseType: string;
  numUnits: string; numBuildings: string; numAcres: string; retailUnits: RetailUnit[];
  address: AssetAddress;
};
type NewLenderForm = {
  programName: string; contactPerson: string; email: string; phone: string; website: string;
  typeOfLenders: string[]; typeOfLoans: string[]; programTypes: string[]; propertyTypes: string; loanTerms: string;
  minLoan: string; maxLoan: string; maxLtv: string; targetStates: string[];
  sponsorStates: string[]; recourse: string; capitalType: string; status: string;
};
type SubmittedDeal = {
  id: number; submittedAt: string; seekerName: string;
  assets: AssetData[]; capitalType: string; assetMode: string; collateralMode: string;
  status: "pending" | "assigned" | "closed";
  advisorId?: number;
};
type AppUser = {
  id: number; username: string; password: string; role: "admin" | "client" | "capital-seeker";
  name: string; blockedLenderIds: number[];
};
type AuthSession = { user: AppUser; } | null;
type MatcherStep = "ai-prompt" | "start" | "asset-count" | "asset-form" | "review" | "results";

// ─── Constants ────────────────────────────────────────────────────────────────

const seedLenders: LenderRecord[] = [
  { id: 1, source: "Spreadsheet", spreadsheetRow: "A2", program: "Bridge Lending Program", lender: "Apex Credit Partners", type: "Senior", minLoan: "$3,000,000", maxLoan: "$35,000,000", maxLtv: "75%", minDscr: "1.20x", states: ["FL", "GA", "TX"], assets: ["Apartments", "Mixed Use", "Retail - Multi Tenant"], status: "Active", email: "originations@apexcp.com", phone: "(305) 555-0101", recourse: "FULL", contactPerson: "John Smith", website: "www.apexcp.com", typeOfLoans: ["Acquisition", "Value add"], programTypes: ["Small Balance"] },
  { id: 2, source: "Spreadsheet", spreadsheetRow: "A3", program: "Transitional CRE", lender: "Harborline Capital", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$80,000,000", maxLtv: "80%", minDscr: "1.05x", states: ["NY", "FL", "NJ", "IL"], assets: ["Office", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "deals@harborline.com", phone: "(212) 555-0142", recourse: "NON RECOURSE", contactPerson: "Sarah Lee", typeOfLoans: ["Refinance", "Value add"], programTypes: ["Interest-only"] },
  { id: 3, source: "Spreadsheet", spreadsheetRow: "A4", program: "Value-Add Multifamily", lender: "Northgate Real Estate Credit", type: "Preferred Equity", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "1.10x", states: ["FL", "NC", "SC", "TN"], assets: ["Apartments", "Student Housing", "SFR Portfolio"], status: "Review", email: "placements@northgatecredit.com", phone: "(704) 555-0198", recourse: "SELECTIVE", typeOfLoans: ["Acquisition", "New Development"], programTypes: ["Fannie/Freddie"] },
  { id: 4, source: "Spreadsheet", spreadsheetRow: "A5", program: "Construction Capital", lender: "BlueRidge Finance", type: "JV Equity", minLoan: "$15,000,000", maxLoan: "$125,000,000", maxLtv: "70%", minDscr: "N/A", states: ["FL", "TX", "AZ", "NV"], assets: ["Land", "Condos", "Other"], status: "Active", email: "capitalmarkets@blueridgefin.com", phone: "(214) 555-0117", recourse: "", typeOfLoans: ["Construction", "New Development"], programTypes: ["Construction", "Land"] },
  { id: 5, source: "Spreadsheet", spreadsheetRow: "A6", program: "Sponsor Credit Facility", lender: "Summit Specialty Lending", type: "Line of Credit", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "65%", minDscr: "1.25x", states: ["Nationwide"], assets: ["Mixed Use", "Retail - Multi Tenant", "Lt Industrial"], status: "Inactive", email: "sponsors@summitsl.com", phone: "(615) 555-0133", recourse: "CASE BY CASE", typeOfLoans: ["Refinance"], programTypes: ["Small Balance"] },
];

const initialUsers: AppUser[] = [
  { id: 1, username: "justin.wolk", password: "Chairam1!", role: "admin", name: "Justin Wolk", blockedLenderIds: [] },
];

const assetTypes = ["Equipment, Autos, or Other Non Real Estate Products", "Apartments", "Condos", "Senior Housing", "Student Housing", "Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed Use", "Lt Industrial", "Cannabis", "Retail - Multi Tenant", "Retail - Single Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other"];
const capitalTypes = ["Senior", "Mezzanine", "Preferred Equity", "JV Equity", "Line of Credit", "Note on Note", "Loan Sales", "C&I"];
const dealTypes = ["Construction", "Value add", "New Development", "Bridge", "Takeout", "Investment"];
const ownershipStatuses = ["Acquisition", "Refinance"];
const refinanceTypes = ["Cash Out to Borrower", "Cash Out-Value Add", "Rate and Term"];
const recourseOptions = ["FULL", "NON RECOURSE", "CASE BY CASE"];
const marketOptions = ["US", "INTERNATIONAL"];
const allStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const unitAssets = ["Apartments", "Condos", "Hotel/Hospitality", "Gaming"];
const retailAssets = ["Retail - Multi Tenant", "Retail - Single Tenant"];
const typeOfLoanOptions = ["Acquisition", "Construction", "Value add", "New Development", "Redevelopment", "Refinance", "Note on Note", "Loan Purchases", "C&I"];
const programTypeOptions = ["Refinance", "Acquisition", "Construction", "Land", "Fannie/Freddie", "HUD", "Small Balance", "Interest-only", "Cannabis"];
const typeOfLenderOptions = ["Bridge", "Conventional", "Local Bank", "CMBS", "Fannie/Freddie", "Small Balance", "Family Office", "Private Lender", "Hard Money", "C&I", "JV", "Non-conventional", "Regional Bank", "Balance Sheet", "Investment Bank"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrency(v: string) { return Number(String(v || "0").replace(/[^0-9.]/g, "")); }
function formatCurrencyInput(v: string) {
  const digits = String(v || "").replace(/[^0-9.]/g, "");
  if (!digits) return "";
  const [whole, decimal] = digits.split(".");
  return `$${decimal !== undefined ? `${Number(whole||0).toLocaleString("en-US")}.${decimal.slice(0,2)}` : Number(whole||0).toLocaleString("en-US")}`;
}
function formatPercent(v: number) { if (!Number.isFinite(v) || !isFinite(v) || v === 0) return "—"; return `${v.toFixed(1)}%`; }
function parsePercent(v: string) { return Number(String(v || "0").replace(/[^0-9.]/g, "")); }
function parseDscr(v: string) { if (v === "N/A") return 0; return Number(String(v || "0").replace(/[^0-9.]/g, "")); }
function normalizeRecourse(v: string) { return v === "SELECTIVE" || !v ? "CASE BY CASE" : v; }

function blankAddress(): AssetAddress { return { street: "", unit: "", city: "", state: "", zip: "" }; }
function blankAsset(id: number): AssetData {
  return { id, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower", assetType: "Apartments", loanAmount: "", seniorLoanAmount: "", subordinateAmount: "", propertyValue: "", purchasePrice: "", currentLoanAmount: "", landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "", ltvMode: "AUTO", currentNetIncome: "", manualLtv: "", dscr: "", selectedStates: [], recourseType: "CASE BY CASE", numUnits: "", numBuildings: "", numAcres: "", retailUnits: [{ id: 1, tenant: "", rent: "", sqft: "" }], address: blankAddress() };
}
function blankLenderForm(): NewLenderForm {
  return { programName: "", contactPerson: "", email: "", phone: "", website: "", typeOfLenders: [], typeOfLoans: [], programTypes: [], propertyTypes: "", loanTerms: "", minLoan: "", maxLoan: "", maxLtv: "", targetStates: [], sponsorStates: [], recourse: "CASE BY CASE", capitalType: "Senior", status: "Active" };
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
  const isAcquisition = asset.ownershipStatus === "Acquisition";
  const isRefinance = asset.ownershipStatus === "Refinance";
  const isAcqNonConst = isAcquisition && !isConstruction;
  const projTotal = parseCurrency(asset.landCost) + parseCurrency(asset.softCosts) + parseCurrency(asset.originationClosingCosts) + parseCurrency(asset.hardCosts) + parseCurrency(asset.carryingCosts);
  const acqConstLoan = Math.max(0, projTotal - parseCurrency(asset.borrowerEquity));
  const effectiveAmt = isConstruction && isAcquisition ? acqConstLoan : isSubCap ? parseCurrency(asset.subordinateAmount) : parseCurrency(asset.loanAmount);
  const seniorAmt = parseCurrency(asset.seniorLoanAmount);
  const propVal = parseCurrency(asset.propertyValue);
  const purchaseVal = parseCurrency(asset.purchasePrice);
  const newLoanAmt = parseCurrency(asset.loanAmount);
  const curLoanAmt = parseCurrency(asset.currentLoanAmount);
  const totalCap = isSubCap ? seniorAmt + effectiveAmt : effectiveAmt;
  const seniorLtv = propVal > 0 ? (newLoanAmt / propVal) * 100 : 0;
  const autoLtv = propVal > 0 ? (totalCap / propVal) * 100 : 0;
  const equityPct = propVal > 0 ? (parseCurrency(asset.borrowerEquity) / propVal) * 100 : 0;
  const cashOut = Math.max(0, newLoanAmt - curLoanAmt);
  const seniorLtc = purchaseVal > 0 ? (newLoanAmt / purchaseVal) * 100 : 0;
  return { effectiveAmt, totalCap, seniorLtv, autoLtv, equityPct, cashOut, seniorLtc, isSubCap, isConstruction, isAcquisition, isRefinance, isAcqNonConst, acqConstLoan };
}

async function parseDeadWithAI(description: string, capitalTypeHint: string): Promise<Partial<AssetData>> {
  const systemPrompt = `You are a commercial real estate loan intake specialist. Parse the user's deal description and extract structured loan parameters. Return ONLY a valid JSON object with these exact fields (use empty string "" if not mentioned):
{"ownershipStatus":"Acquisition or Refinance","dealType":"one of Construction/Value add/New Development/Bridge/Takeout/Investment","assetType":"one of Apartments/Condos/Office/Mixed Use/Hotel/Hospitality/Land/Self-storage/Other etc","loanAmount":"dollar amount like $15,000,000","propertyValue":"dollar amount","selectedStates":["FL"],"recourseType":"FULL or NON RECOURSE or CASE BY CASE","dscr":"number like 1.25","numUnits":"number if mentioned","numBuildings":"number if mentioned"}
Only return JSON. No explanation. No markdown.`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: `Parse this deal: ${description}. Capital type: ${capitalTypeHint}` }] }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch { return {}; }
}

// ─── UI Components ────────────────────────────────────────────────────────────

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
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2 grid grid-cols-4 gap-2">
          <div className="col-span-3"><label className="text-xs text-gray-500 mb-1 block font-medium">Street Address</label><Input value={address.street} onChange={(e) => upd("street", e.target.value)} placeholder="123 Main St" className={inputClass} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Unit #</label><Input value={address.unit} onChange={(e) => upd("unit", e.target.value)} placeholder="Apt 4B" className={inputClass} /></div>
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block font-medium">City</label><Input value={address.city} onChange={(e) => upd("city", e.target.value)} placeholder="Miami" className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-gray-500 mb-1 block font-medium">State</label><Input value={address.state} onChange={(e) => upd("state", e.target.value)} placeholder="FL" className={inputClass} /></div>
          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Zip Code</label><Input value={address.zip} onChange={(e) => upd("zip", e.target.value)} placeholder="33101" className={inputClass} /></div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Wall ───────────────────────────────────────────────────────────────

function LoginWall({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<"" | "client" | "capital">(""); 
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [users] = useState<AppUser[]>(initialUsers);

  function handleLogin() {
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) { setError("Username not found."); return; }
    if (user.password !== password) { setError("Incorrect password. If you forgot it, please contact admin."); return; }
    setError("");
    onLogin({ user });
  }

  function handleCapitalSeeker() {
    const guestUser: AppUser = { id: 9999, username: "guest", password: "", role: "capital-seeker", name: "Capital Seeker", blockedLenderIds: [] };
    onLogin({ user: guestUser });
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">
      {/* Left — blurred dashboard preview */}
      <div className="hidden lg:flex flex-col w-[260px] bg-[#0a1f44] border-r border-[#c9a84c]/10 relative flex-shrink-0">
        <div className="px-6 py-8 border-b border-[#c9a84c]/20">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
            <div>
              <div className="font-display text-2xl font-bold text-white">CapMoon</div>
              <div className="text-xs text-gray-400 tracking-wide">Lender Intelligence Platform</div>
            </div>
          </div>
          <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-3">Investment Banking</div>
        </div>
        <nav className="space-y-1 p-4 flex-1 opacity-40 pointer-events-none select-none">
          {[["Overview", Gauge], ["Lender Programs", Landmark], ["Add Lender", Plus], ["Deal Matcher", Filter], ["Upload Center", FileSpreadsheet]].map(([label, Icon]: any) => (
            <div key={String(label)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-gray-300 border border-transparent">
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium tracking-wide">{label}</span>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-[#c9a84c]/20 opacity-40">
          <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
            <p className="text-xs text-gray-300 leading-relaxed">Spreadsheet-driven criteria plus dashboard lenders.</p>
          </div>
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-[#0a1f44]/60 backdrop-blur-[2px] flex items-center justify-center">
          <div className="text-center">
            <Lock className="h-8 w-8 text-[#c9a84c] mx-auto mb-2" />
            <div className="text-xs text-gray-300 font-medium">Login Required</div>
          </div>
        </div>
      </div>

      {/* Right — login options */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo1.JPEG" alt="CapMoon" className="h-16 w-16 object-contain rounded-full mx-auto mb-4" />
            <div className="font-display text-4xl font-bold text-[#0a1f44] mb-1">CapMoon</div>
            <div className="text-sm text-gray-500">Premier Capital Search Platform</div>
          </div>

          {mode === "" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <button onClick={() => setMode("client")} className="w-full p-6 rounded-2xl border-2 border-[#0a1f44] bg-[#0a1f44] text-white text-left hover:bg-[#0a1f44]/90 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold mb-1">CapMoon Client Login</div>
                    <div className="text-sm text-gray-300">Access the full lender intelligence dashboard</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#c9a84c] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
              <button onClick={handleCapitalSeeker} className="w-full p-6 rounded-2xl border-2 border-[#c9a84c]/30 bg-white text-left hover:border-[#c9a84c] transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-[#0a1f44] mb-1">I Am Looking for Capital</div>
                    <div className="text-sm text-gray-500">Submit your deal for lender matching</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#c9a84c] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </motion.div>
          )}

          {mode === "client" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <button onClick={() => { setMode(""); setError(""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"><ChevronLeft className="h-3 w-3" /> Back</button>
              <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Secure Access</div>
              <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-6">Client Login</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Username</label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="your.username" className="bg-white border-gray-300 text-gray-800 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Password</label>
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="••••••••" className="bg-white border-gray-300 text-gray-800 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <button onClick={handleLogin} className="w-full py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">Sign In</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Lender Page ──────────────────────────────────────────────────────────

function AddLenderPage({ onSave, onCancel, existingLenders, inputClass, selectTriggerClass }: { onSave: (form: NewLenderForm) => void; onCancel: () => void; existingLenders: LenderRecord[]; inputClass: string; selectTriggerClass: string }) {
  const [form, setForm] = useState<NewLenderForm>(blankLenderForm());
  const [matchMode, setMatchMode] = useState<Record<string, "manual" | "spreadsheet">>({ programName: "manual", contactPerson: "manual", email: "manual", phone: "manual", website: "manual" });
  function upd(field: keyof NewLenderForm, value: any) { setForm((prev) => ({ ...prev, [field]: value })); }
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
        <p className="text-sm text-gray-500 mb-8">Fill in lender details manually or match from your spreadsheet data.</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Capital Type</label><Select value={form.capitalType} onValueChange={(v) => upd("capitalType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Recourse</label><Select value={form.recourse} onValueChange={(v) => upd("recourse", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Status</label><Select value={form.status} onValueChange={(v) => upd("status", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Minimum Loan Size</label><Input value={form.minLoan} onChange={(e) => upd("minLoan", formatCurrencyInput(e.target.value))} placeholder="$1,000,000" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Maximum Loan Size</label><Input value={form.maxLoan} onChange={(e) => upd("maxLoan", formatCurrencyInput(e.target.value))} placeholder="$25,000,000" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Max LTV</label><Input value={form.maxLtv} onChange={(e) => upd("maxLtv", e.target.value)} placeholder="75%" className={inputClass} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Property Types</label><Input value={form.propertyTypes} onChange={(e) => upd("propertyTypes", e.target.value)} placeholder="e.g. Apartments, Office, Retail" className={inputClass} /></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Loan Terms</label><Input value={form.loanTerms} onChange={(e) => upd("loanTerms", e.target.value)} placeholder="e.g. 12-36 months" className={inputClass} /></div>
          </div>
          <CheckboxGroup label="Type of Lender" options={typeOfLenderOptions} selected={form.typeOfLenders} onChange={(v) => upd("typeOfLenders", v)} />
          <CheckboxGroup label="Type of Loans" options={typeOfLoanOptions} selected={form.typeOfLoans} onChange={(v) => upd("typeOfLoans", v)} />
          <CheckboxGroup label="Program" options={programTypeOptions} selected={form.programTypes} onChange={(v) => upd("programTypes", v)} />
          <StateSelector label="Target States" selected={form.targetStates} onChange={(v) => upd("targetStates", v)} />
          <StateSelector label="Sponsor States" selected={form.sponsorStates} onChange={(v) => upd("sponsorStates", v)} />
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => { if (!form.programName.trim()) return; onSave(form); }} className="px-6 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Save Lender</button>
            <button onClick={() => setForm(blankLenderForm())} className="px-4 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Reset Form</button>
            <button onClick={onCancel} className="px-4 py-2.5 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
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
  if (m.isAcqNonConst && parseCurrency(asset.purchasePrice) > 0) metricBoxes.push(["Senior LTC", formatPercent(m.seniorLtc)]);
  if (m.isRefinance) metricBoxes.push(["Cash Out", formatCurrencyInput(String(m.cashOut))]);
  metricBoxes.push([m.isSubCap ? "Subordinated LTV - Last Dollar" : "Subordinated Last $ LTV", m.isSubCap ? formatPercent(m.autoLtv) : "N/A"]);
  metricBoxes.push(["Total Capital", formatCurrencyInput(String(m.totalCap || 0))]);
  metricBoxes.push(["Equity %", formatPercent(m.equityPct)]);
  metricBoxes.push(["Cap Rate", capRate > 0 ? formatPercent(capRate) : "—"]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Address */}
      <AddressFields address={asset.address || blankAddress()} onChange={(a) => upd("address", a)} inputClass={inputClass} />
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Ownership Status</label><Select value={asset.ownershipStatus} onValueChange={(v) => upd("ownershipStatus", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{ownershipStatuses.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Deal Type</label><Select value={asset.dealType} onValueChange={(v) => upd("dealType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{dealTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
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
      {m.isAcqNonConst && (<div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Price</label><Input value={asset.purchasePrice} onChange={(e) => upd("purchasePrice", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>)}
      {m.isConstruction && (
        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-bold mb-3">Project Estimated Costs</div>
          <div className="grid gap-3 md:grid-cols-2">
            {([["Land / Acquisition Cost", "landCost"], ["Soft Costs", "softCosts"], ["Origination & Closing", "originationClosingCosts"], ["Hard Costs", "hardCosts"], ["Carrying Costs", "carryingCosts"], ["Borrower Equity", "borrowerEquity"]] as [string, keyof AssetData][]).map(([label, field]) => (
              <div key={field}><label className="text-xs text-gray-500 mb-1 block font-medium">{label}</label><Input value={String(asset[field])} onChange={(e) => upd(field, formatCurrencyInput(e.target.value))} className={inputClass} /></div>
            ))}
          </div>
        </div>
      )}
      {!m.isSubCap && !(m.isConstruction && m.isAcquisition) && (<div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{m.isRefinance ? "New Loan Amount" : "Loan Amount"}</label><Input value={asset.loanAmount} onChange={(e) => upd("loanAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div>)}
      {m.isSubCap && (<><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Senior Loan Amount</label><Input value={asset.seniorLoanAmount} onChange={(e) => upd("seniorLoanAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{subordinateLabel(capitalType)}</label><Input value={asset.subordinateAmount} onChange={(e) => upd("subordinateAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div><div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">Stack: Senior {asset.seniorLoanAmount || "$0"} + {subordinateLabel(capitalType)} {asset.subordinateAmount || "$0"}</div></>)}
      <div className="md:col-span-2">
        <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">States</label>
        <div className="mb-2 flex gap-2"><button onClick={() => upd("selectedStates", allStates)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">Select All</button><button onClick={() => upd("selectedStates", [])} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">Clear</button></div>
        <div className="grid max-h-32 grid-cols-6 gap-1.5 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">{allStates.map((s) => (<label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={asset.selectedStates.includes(s)} onChange={() => upd("selectedStates", asset.selectedStates.includes(s) ? asset.selectedStates.filter((x) => x !== s) : [...asset.selectedStates, s])} className="accent-[#0a1f44]" /><span className="text-gray-600">{s}</span></label>))}</div>
      </div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Property Value / ARV</label><Input value={asset.propertyValue} onChange={(e) => upd("propertyValue", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">LTV Mode</label><Select value={asset.ltvMode} onValueChange={(v) => upd("ltvMode", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">Auto Calculate</SelectItem><SelectItem value="MANUAL">Manual Entry</SelectItem></SelectContent></Select></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Net Income</label><Input value={asset.currentNetIncome} onChange={(e) => upd("currentNetIncome", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      {asset.ltvMode === "MANUAL" ? <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Manual LTV</label><Input value={asset.manualLtv} onChange={(e) => upd("manualLtv", e.target.value)} className={inputClass} /></div> : <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Calculated LTV</label><div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-[#0a1f44]">{formatPercent(m.autoLtv)}</div></div>}
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">DSCR</label><Input value={asset.dscr} onChange={(e) => upd("dscr", e.target.value)} className={inputClass} /></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Recourse</label><Select value={asset.recourseType} onValueChange={(v) => upd("recourseType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      <div className="md:col-span-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(metricBoxes.length, 4)}, 1fr)` }}>
        {metricBoxes.map(([label, val]) => (<div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">{label}</div><div className="text-sm font-bold text-[#0a1f44]">{val}</div></div>))}
      </div>
    </div>
  );
}

// ─── Deal Matcher (shared between admin and capital seeker) ───────────────────

function DealMatcher({ lenderRecords, capitalSeekerMode = false, onSubmitDeal, seekerName, inputClass, selectTriggerClass, cardClass }: { lenderRecords: LenderRecord[]; capitalSeekerMode?: boolean; onSubmitDeal?: (assets: AssetData[], capitalType: string, assetMode: string, collateralMode: string) => void; seekerName?: string; inputClass: string; selectTriggerClass: string; cardClass: string }) {
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

  function addTenant(name: string) { setTenantDatabase((prev) => prev.includes(name) ? prev : [...prev, name]); }
  function updateAsset(updated: AssetData) { setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a)); }

  async function handleAiSubmit() {
    if (!aiDescription.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const parsed = await parseDeadWithAI(aiDescription, capitalType);
      if (Object.keys(parsed).length === 0) { setAiError("Couldn't parse the deal. Try being more specific or use manual entry."); }
      else { setAssets([{ ...blankAsset(1), ...parsed }]); setAiParsed(true); setAssetMode("single"); setMatcherStep("asset-form"); }
    } catch { setAiError("Something went wrong. Please try again."); }
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
  function resetMatcher() { setMatcherStep("ai-prompt"); setAssetMode("single"); setCollateralMode(""); setAssets([blankAsset(1)]); setCurrentAssetIndex(0); setAiDescription(""); setAiParsed(false); setAiError(""); }

  const matchResults = useMemo(() => {
    if (matcherStep !== "results" || marketScope === "INTERNATIONAL") return [];
    if (collateralMode === "crossed" || assetMode === "single") {
      const totalLoan = assets.reduce((sum, a) => sum + calcMetrics(a, capitalType).effectiveAmt, 0);
      const primary = assets[0];
      const stateSet = [...new Set(assets.flatMap((a) => a.selectedStates))];
      return lenderRecords.map((l) => {
        let score = 0; const nr = normalizeRecourse(l.recourse);
        if (totalLoan >= parseCurrency(l.minLoan) && totalLoan <= parseCurrency(l.maxLoan)) score += 30;
        if (l.assets.includes(primary.assetType)) score += 22;
        if (l.type === capitalType) score += 20;
        if (stateSet.some((s) => l.states.includes(s)) || l.states.includes("Nationwide")) score += 15;
        if (nr === primary.recourseType || nr === "CASE BY CASE") score += 10;
        return { ...l, score, nr };
      }).filter((l) => l.score > 30).sort((a, b) => b.score - a.score).slice(0, 4);
    }
    return assets.flatMap((asset) => {
      const m = calcMetrics(asset, capitalType);
      return lenderRecords.map((l) => {
        let score = 0; const nr = normalizeRecourse(l.recourse);
        if (m.effectiveAmt >= parseCurrency(l.minLoan) && m.effectiveAmt <= parseCurrency(l.maxLoan)) score += 30;
        if (l.assets.includes(asset.assetType)) score += 22;
        if (l.type === capitalType) score += 20;
        if (asset.selectedStates.some((s) => l.states.includes(s)) || l.states.includes("Nationwide")) score += 15;
        if (nr === asset.recourseType || nr === "CASE BY CASE") score += 10;
        return { ...l, score, nr, assetId: asset.id };
      }).filter((l) => l.score > 30).sort((a, b) => b.score - a.score).slice(0, 3);
    });
  }, [matcherStep, assets, capitalType, marketScope, collateralMode, assetMode, lenderRecords]);

  const progressSteps = ["AI Search", "Setup", assetMode === "multiple" ? "Asset Count" : null, "Asset Details", "Review", "Results"].filter(Boolean) as string[];
  const currentStepLabel = matcherStep === "ai-prompt" ? "AI Search" : matcherStep === "start" ? "Setup" : matcherStep === "asset-count" ? "Asset Count" : matcherStep === "asset-form" ? "Asset Details" : matcherStep === "review" ? "Review" : "Results";
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
            <p className="text-sm text-gray-500 mb-6">Tell us about your deal in plain English and our AI will find the best matching lenders instantly.</p>
            <div className="mb-5"><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Describe Your Deal</label>
              <textarea value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAiSubmit(); }} placeholder={'e.g. "Bridge loan for a 150-unit apartment complex in Miami FL. Purchase price $28M, looking for $18M senior financing at 65% LTV."'} rows={4} className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none" />
              <div className="text-xs text-gray-400 mt-1">Press Cmd+Enter to submit</div>
            </div>
            {aiError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{aiError}</div>}
            <div className="flex gap-3">
              <button onClick={handleAiSubmit} disabled={aiLoading || !aiDescription.trim()} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-40 disabled:cursor-not-allowed">
                {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Find Matching Lenders</>}
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
            <p className="text-sm text-gray-500 mb-8">Tell us your market and capital type.</p>
            <div className="grid gap-5 md:grid-cols-2 mb-8">
              <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Market</label><Select value={marketScope} onValueChange={setMarketScope}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{marketOptions.map((i) => <SelectItem key={i} value={i}>{i === "US" ? "US" : "International"}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {marketScope === "INTERNATIONAL" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 mb-4">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">Is this one asset or multiple assets?</label>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button onClick={() => handleAssetModeSelect("single")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "single" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}><div className="text-sm font-bold text-[#0a1f44]">Single Asset</div><div className="text-xs text-gray-500 mt-1">One property or collateral</div></button>
                  <button onClick={() => handleAssetModeSelect("multiple")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "multiple" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}><div className="text-sm font-bold text-[#0a1f44]">Multiple Assets</div><div className="text-xs text-gray-500 mt-1">Portfolio or pool of assets</div></button>
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
              <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">How many assets in total?</label><Input value={assetCount} onChange={(e) => setAssetCount(e.target.value)} type="number" min="2" max="20" className={inputClass + " max-w-xs"} /></div>
              <div>
                <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">How should these assets be treated?</label>
                <Select value={collateralMode} onValueChange={(v) => setCollateralMode(v as "crossed" | "separate")}><SelectTrigger className={selectTriggerClass + " max-w-xs"}><SelectValue placeholder="Select treatment..." /></SelectTrigger><SelectContent><SelectItem value="crossed">Crossed Collateral</SelectItem><SelectItem value="separate">Treated Separately</SelectItem></SelectContent></Select>
                {collateralMode === "crossed" && <p className="text-xs text-gray-500 mt-2">All assets combined and matched as a single portfolio loan.</p>}
                {collateralMode === "separate" && <p className="text-xs text-gray-500 mt-2">Each asset matched independently with its own lender results.</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMatcherStep("start")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Previous</button>
                <button onClick={handleAssetCountConfirm} disabled={!collateralMode} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-40 disabled:cursor-not-allowed">Continue <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {matcherStep === "asset-form" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className={cardClass + " p-6"}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">{assets.length > 1 ? `Asset ${currentAssetIndex + 1} of ${assets.length}` : "Asset Details"}</div>
                <h2 className="font-display text-2xl font-bold text-[#0a1f44]">{assets.length > 1 ? `Asset ${currentAssetIndex + 1}` : "Deal Details"}</h2>
              </div>
              <div className="flex items-center gap-3">
                {aiParsed && (<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20"><Sparkles className="h-3 w-3 text-[#c9a84c]" /><span className="text-xs font-semibold text-[#0a1f44]">AI-filled</span></div>)}
                {assets.length > 1 && (<div className="flex gap-1">{assets.map((_, idx) => (<div key={idx} className={`w-2 h-2 rounded-full ${idx === currentAssetIndex ? "bg-[#0a1f44]" : idx < currentAssetIndex ? "bg-[#c9a84c]" : "bg-gray-300"}`} />))}</div>)}
              </div>
            </div>
            {aiParsed && (
              <div className="mb-4 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs text-gray-600">Parameters filled by AI. Review and edit any field below.</span></div>
                <button onClick={() => setAiParsed(false)} className="text-xs text-gray-400 hover:text-gray-600 underline">Dismiss</button>
              </div>
            )}
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
                      <div>
                        <div className="text-xs font-bold text-[#0a1f44]">Asset {idx + 1}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{a.assetType} · {a.ownershipStatus}</div>
                        {a.address?.city && <div className="text-xs text-gray-400 mt-0.5">{a.address.city}{a.address.state ? `, ${a.address.state}` : ""}</div>}
                        {a.loanAmount && <div className="text-xs font-semibold text-[#c9a84c] mt-1">{a.loanAmount}</div>}
                      </div>
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
            <p className="text-sm text-gray-500 mb-8">Review all assets. Click Edit to make changes, then run the match.</p>
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {assets.map((asset, idx) => {
                const m = calcMetrics(asset, capitalType);
                const addr = asset.address;
                return (
                  <div key={asset.id} className="rounded-xl border-2 border-gray-200 p-5 hover:border-[#0a1f44]/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Asset {idx + 1}</div>
                        <div className="text-base font-bold text-[#0a1f44]">{asset.assetType}</div>
                        <div className="text-xs text-gray-500">{asset.ownershipStatus} · {asset.dealType}</div>
                        {addr?.street && <div className="text-xs text-gray-400 mt-0.5">{addr.street}{addr.unit ? ` ${addr.unit}` : ""}, {addr.city}, {addr.state} {addr.zip}</div>}
                      </div>
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
            <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 mb-6 flex items-center justify-between">
              <div><div className="text-sm font-bold text-[#0a1f44]">{assets.length} asset{assets.length > 1 ? "s" : ""} · {capitalType}</div><div className="text-xs text-gray-500 mt-0.5">{collateralMode === "crossed" ? "Crossed Collateral" : collateralMode === "separate" ? "Treated Separately" : "Single asset"}</div></div>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setCurrentAssetIndex(0); setMatcherStep("asset-form"); }} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Back to Assets</button>
              <button onClick={() => { if (capitalSeekerMode && onSubmitDeal) { onSubmitDeal(assets, capitalType, assetMode, collateralMode); setMatcherStep("results"); } else { setMatcherStep("results"); } }} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">{capitalSeekerMode ? "Submit Deal" : "Run Lender Match"} <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}

      {matcherStep === "results" && (
        <div>
          {capitalSeekerMode ? (
            /* Capital Seeker Confirmation */
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <div className={cardClass + " p-10 text-center"}>
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Deal Submitted!</div>
                <p className="text-gray-500 text-sm mb-6">Thank you{seekerName ? `, ${seekerName}` : ""}. Your deal has been received and a CapMoon capital advisor will review it and be in touch with you shortly.</p>
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
                    {[
                      { name: "Louis Palumbo", title: "Vice President of Capital Advisory", email: "lpalumbo@capmoon.com", phone: "305-401-0076", photo: "/louis.jpg" },
                      { name: "Shuvo Hussain", title: "Vice President of Capital Advisory", email: "shussain@capmoon.com", phone: "347-993-5545", photo: "/Shuvo.jpeg" },
                    ].map((advisor) => (
                      <div key={advisor.email} className="flex items-center gap-4 border-t border-[#c9a84c]/10 pt-4 first:border-t-0 first:pt-0">
                        <img src={advisor.photo} alt={advisor.name} className="h-16 w-16 rounded-xl object-cover border-2 border-[#c9a84c]/30 flex-shrink-0" />
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
            /* Admin Results */
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
                      <div className="text-sm font-bold text-[#0a1f44] mb-3 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#0a1f44] text-white flex items-center justify-center text-xs font-bold">{asset.id}</div>Asset {asset.id} — {asset.assetType}{asset.address?.city ? ` · ${asset.address.city}, ${asset.address.state}` : ""} · {asset.loanAmount || "—"}</div>
                      {assetMatches.length === 0 ? (<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">No matches for this asset.</div>) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {assetMatches.map((match: any) => (
                            <div key={String(match.id) + "-" + asset.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#0a1f44]/30 transition-all">
                              <div className="flex items-start justify-between gap-2 mb-3"><div><div className="text-sm font-bold text-[#0a1f44]">{match.lender}</div><div className="text-xs text-gray-500 mt-0.5">{match.program}</div></div><div className="text-right"><div className="text-xs text-gray-400">Match</div><div className="text-lg font-bold text-[#0a1f44]">{match.score}%</div></div></div>
                              <div className="grid grid-cols-2 gap-2">{[["Capital", match.type], ["Contact", match.email || "—"]].map(([label, val]) => (<div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2"><div className="text-xs uppercase text-[#0a1f44] font-bold mb-0.5">{label}</div><div className="text-xs text-gray-600 break-all">{val}</div></div>))}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {matchResults.map((match: any, idx: number) => (
                    <div key={match.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-[#0a1f44]/30 transition-all">
                      <div className="flex items-start justify-between gap-2 mb-4"><div><div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">#{idx + 1} Match</div><div className="text-base font-bold text-[#0a1f44]">{match.lender}</div><div className="text-xs text-gray-500 mt-0.5">{match.program}</div></div><div className="text-right"><div className="text-xs text-gray-400">Score</div><div className="text-2xl font-bold text-[#0a1f44]">{match.score}%</div></div></div>
                      <div className="grid grid-cols-2 gap-2">{[["Capital", match.type], ["Range", `${match.minLoan}–${match.maxLoan}`], ["Recourse", match.nr], ["Contact", match.email || "—"]].map(([label, val]) => (<div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2"><div className="text-xs uppercase text-[#0a1f44] font-bold mb-0.5">{label}</div><div className="text-xs text-gray-600 break-all">{val}</div></div>))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Capital Seeker Portal ────────────────────────────────────────────────────

function CapitalSeekerPortal({ lenderRecords, onLogout, onSubmitDeal, session }: { lenderRecords: LenderRecord[]; onLogout: () => void; onSubmitDeal: (deal: SubmittedDeal) => void; session: AuthSession }) {
  const [activeTab, setActiveTab] = useState("matcher");
  const inputClass = "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-[#0a1f44] focus:ring-0";
  const selectTriggerClass = "bg-white border-gray-300 text-gray-800 rounded-xl focus:border-[#0a1f44]";
  const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";

  function handleSubmit(assets: AssetData[], capitalType: string, assetMode: string, collateralMode: string) {
    onSubmitDeal({ id: Date.now(), submittedAt: new Date().toLocaleString(), seekerName: session?.user.name || "Guest", assets, capitalType, assetMode, collateralMode, status: "pending" });
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap'); * { font-family: 'Montserrat', sans-serif; } .font-display { font-family: 'Cormorant Garamond', serif; } [data-radix-select-content] { background: white !important; border: 1px solid #e5e7eb !important; color: #1f2937 !important; } [data-radix-select-item] { color: #1f2937 !important; } [data-radix-select-item]:hover, [data-radix-select-item][data-highlighted] { background: #f3f4f6 !important; color: #0a1f44 !important; }`}</style>
      <div className="min-h-screen bg-[#f0f2f5] text-gray-800">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-[#c9a84c]/10 bg-[#0a1f44] flex flex-col">
            <div className="px-6 py-8 border-b border-[#c9a84c]/20">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
                <div><div className="font-display text-2xl font-bold text-white">CapMoon</div><div className="text-xs text-gray-400 tracking-wide">Capital Search Portal</div></div>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-3">Find Capital</div>
            </div>
            <nav className="space-y-1 p-4 flex-1">
              {([["matcher", "Deal Matcher", Filter], ["uploads", "Upload Center", FileSpreadsheet]] as [string, string, any][]).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${activeTab === key ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30" : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  <Icon className="h-4 w-4" /><span className="text-sm font-medium">{label}</span>
                  {activeTab === key && <div className="ml-auto w-1 h-4 bg-[#c9a84c] rounded-full" />}
                </button>
              ))}
            </nav>
            <div className="p-4 space-y-3 border-t border-[#c9a84c]/20">
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
                <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
                <p className="text-xs text-gray-300 leading-relaxed">Tell us about your deal and we'll find the best lenders for you.</p>
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
              {activeTab === "matcher" && <DealMatcher lenderRecords={lenderRecords} capitalSeekerMode={true} onSubmitDeal={handleSubmit} seekerName={session?.user.name} inputClass={inputClass} selectTriggerClass={selectTriggerClass} cardClass={cardClass} />}
              {activeTab === "uploads" && (
                <div className={cardClass + " p-6"}>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Documents</div>
                  <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Upload Center</h2>
                  <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center hover:border-[#0a1f44]/40 transition-all">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f44]/10 border border-[#0a1f44]/20 text-[#0a1f44] mb-4"><Upload className="h-6 w-6" /></div>
                    <div className="text-base font-bold text-[#0a1f44] mb-1">Upload Deal Documents</div>
                    <div className="text-sm text-gray-500 mb-5">Upload financials, rent rolls, or any supporting documents for your deal.</div>
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

// ─── Admin Portal ─────────────────────────────────────────────────────────────

const adminNavItems: [string, string, any, string?][] = [
  ["overview", "Overview", Gauge], ["lenders", "Lender Programs", Landmark],
  ["add-lender", "Add Lender", Plus, "sub"], ["matcher", "Deal Matcher", Filter],
  ["submitted-deals", "Submitted Deals", FileSpreadsheet],
  ["uploads", "Upload Center", Upload], ["user-management", "User Management", Settings],
];

function AdminPortal({ session, onLogout, submittedDeals, users: initialUsersProp, setUsers: setUsersExternal }: { session: AuthSession; onLogout: () => void; submittedDeals: SubmittedDeal[]; users: AppUser[]; setUsers: (u: AppUser[]) => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [lenderRecords, setLenderRecords] = useState<LenderRecord[]>(seedLenders);
  const [users, setUsers] = useState<AppUser[]>(initialUsersProp);
  const [search, setSearch] = useState("");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("All");
  const [selectedCapitalFilter, setSelectedCapitalFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [editingLenderId, setEditingLenderId] = useState<number | null>(null);
  const [viewingLenderId, setViewingLenderId] = useState<number | null>(null);
  const [newUserForm, setNewUserForm] = useState({ name: "", username: "", password: "", role: "client" as AppUser["role"] });

  const inputClass = "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-[#0a1f44] focus:ring-0";
  const selectTriggerClass = "bg-white border-gray-300 text-gray-800 rounded-xl focus:border-[#0a1f44]";
  const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";

  function updateLenderField(id: number, field: keyof LenderRecord, value: string) { setLenderRecords((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l)); }
  function toggleLenderStatus(id: number) { setLenderRecords((prev) => prev.map((l) => l.id !== id ? l : { ...l, status: l.status === "Inactive" ? "Active" : "Inactive" })); }
  function handleSaveLender(form: NewLenderForm) {
    setLenderRecords((prev) => [...prev, { id: prev.length + 1, source: "Dashboard", spreadsheetRow: "—", program: form.programName, lender: form.programName, type: form.capitalType, minLoan: form.minLoan, maxLoan: form.maxLoan, maxLtv: form.maxLtv, minDscr: "1.20x", states: form.targetStates.length > 0 ? form.targetStates : ["Nationwide"], assets: form.propertyTypes.split(",").map((s) => s.trim()).filter(Boolean), status: form.status, email: form.email, phone: form.phone, recourse: form.recourse, contactPerson: form.contactPerson, website: form.website, sponsorStates: form.sponsorStates, loanTerms: form.loanTerms, typeOfLoans: form.typeOfLoans, programTypes: form.programTypes, typeOfLenders: form.typeOfLenders }]);
    setActiveTab("lenders");
  }
  function addUser() {
    if (!newUserForm.name.trim() || !newUserForm.username.trim() || !newUserForm.password.trim()) return;
    setUsers((prev) => [...prev, { id: prev.length + 1, ...newUserForm, blockedLenderIds: [] }]);
    setNewUserForm({ name: "", username: "", password: "", role: "client" });
  }
  function toggleBlockedLender(userId: number, lenderId: number) {
    setUsers((prev) => prev.map((u) => u.id !== userId ? u : { ...u, blockedLenderIds: u.blockedLenderIds.includes(lenderId) ? u.blockedLenderIds.filter((id) => id !== lenderId) : [...u.blockedLenderIds, lenderId] }));
  }
  function deleteUser(userId: number) { setUsers((prev) => prev.filter((u) => u.id !== userId)); }

  const filteredLenders = useMemo(() => lenderRecords.filter((l) =>
    (selectedSourceFilter === "All" || l.source === selectedSourceFilter) &&
    (selectedCapitalFilter === "All" || l.type === selectedCapitalFilter) &&
    (selectedStatusFilter === "All" || l.status === selectedStatusFilter) &&
    (search === "" || l.lender.toLowerCase().includes(search.toLowerCase()) || l.program.toLowerCase().includes(search.toLowerCase()))
  ), [lenderRecords, selectedSourceFilter, selectedCapitalFilter, selectedStatusFilter, search]);

  const spreadsheetCount = lenderRecords.filter((l) => l.source === "Spreadsheet").length;
  const dashboardCount = lenderRecords.filter((l) => l.source === "Dashboard").length;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap'); * { font-family: 'Montserrat', sans-serif; } .font-display { font-family: 'Cormorant Garamond', serif; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #f0f2f5; } ::-webkit-scrollbar-thumb { background: #c9a84c66; border-radius: 2px; } [data-radix-select-content] { background: white !important; border: 1px solid #e5e7eb !important; color: #1f2937 !important; } [data-radix-select-item] { color: #1f2937 !important; } [data-radix-select-item]:hover, [data-radix-select-item][data-highlighted] { background: #f3f4f6 !important; color: #0a1f44 !important; }`}</style>
      <div className="min-h-screen bg-[#f0f2f5] text-gray-800">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-[#c9a84c]/10 bg-[#0a1f44] flex flex-col">
            <div className="px-6 py-8 border-b border-[#c9a84c]/20">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
                <div><div className="font-display text-2xl font-bold text-white">CapMoon</div><div className="text-xs text-gray-400 tracking-wide">Lender Intelligence Platform</div></div>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-3">Investment Banking</div>
            </div>
            <nav className="space-y-1 p-4 flex-1">
              {adminNavItems.map(([key, label, Icon, type]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${type === "sub" ? "pl-8" : ""} ${activeTab === key ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30" : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  <Icon className={`flex-shrink-0 ${type === "sub" ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                  <span className={`font-medium tracking-wide ${type === "sub" ? "text-xs" : "text-sm"}`}>{label}</span>
                  {activeTab === key && <div className="ml-auto w-1 h-4 bg-[#c9a84c] rounded-full" />}
                </button>
              ))}
            </nav>
            <div className="p-4 space-y-3 border-t border-[#c9a84c]/20">
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
                <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
                <p className="text-xs text-gray-300 leading-relaxed">Spreadsheet-driven criteria plus dashboard lenders.</p>
              </div>
              <div className="flex items-center justify-between px-2">
                <div className="text-xs text-gray-400">Signed in as <span className="text-white font-medium">{session?.user.name}</span></div>
                <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><LogOut className="h-3 w-3" /> Out</button>
              </div>
            </div>
          </aside>

          <main className="p-6 md:p-8 overflow-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
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
                      {[["New Deal Requests", "18", "This week"], ["Matched This Month", "126", "Ranked & exported"], ["Dashboard Lenders", String(dashboardCount), "Added manually"]].map(([label, value, detail]) => (
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
                      <p className="text-xs text-gray-500 mt-0.5">Click a lender name to view details. Click Edit to modify.</p>
                    </div>
                    <button onClick={() => setActiveTab("add-lender")} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80"><Plus className="h-4 w-4" /> Add Lender</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4 mb-4">
                    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-[#0a1f44]" /></div>
                    <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Sources</SelectItem><SelectItem value="Spreadsheet">Spreadsheet</SelectItem><SelectItem value="Dashboard">Dashboard</SelectItem></SelectContent></Select>
                    <Select value={selectedCapitalFilter} onValueChange={setSelectedCapitalFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Capital</SelectItem>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
                    <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">{[`Spreadsheet: ${spreadsheetCount}`, `Dashboard: ${dashboardCount}`, `Showing: ${filteredLenders.length}`].map((t) => (<span key={t} className="px-3 py-1 rounded-full text-xs border border-[#c9a84c]/30 text-[#c9a84c] font-bold">{t}</span>))}</div>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <Table>
                      <TableHeader><TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">{["Source","Row","Lender","Program","Capital","Contact","Phone","Status",""].map((h) => <TableHead key={h} className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">{h}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {filteredLenders.map((item) => (
                          <TableRow key={item.id} className="border-gray-100 hover:bg-gray-50">
                            <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.source === "Spreadsheet" ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>{item.source}</span></TableCell>
                            <TableCell className="text-gray-400 text-xs">{item.spreadsheetRow}</TableCell>
                            <TableCell><button onClick={() => setViewingLenderId(item.id === viewingLenderId ? null : item.id)} className="font-semibold text-[#0a1f44] text-sm hover:text-[#c9a84c] hover:underline transition-colors text-left">{item.lender}</button></TableCell>
                            <TableCell className="text-gray-600 text-xs">{item.program}</TableCell>
                            <TableCell className="text-gray-600 text-xs">{item.type}</TableCell>
                            <TableCell className="text-gray-400 text-xs">{item.contactPerson || "—"}</TableCell>
                            <TableCell className="text-gray-400 text-xs">{item.phone || "—"}</TableCell>
                            <TableCell><span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500">{item.status}</span></TableCell>
                            <TableCell className="text-right"><button onClick={() => { setEditingLenderId(item.id === editingLenderId ? null : item.id); setViewingLenderId(null); }} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">{item.id === editingLenderId ? "Close" : "Edit"}</button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Lender Profile View */}
                  {viewingLenderId && (() => {
                    const lender = lenderRecords.find((l) => l.id === viewingLenderId);
                    if (!lender) return null;
                    return (
                      <div className="mt-6 rounded-xl border border-[#c9a84c]/20 bg-white shadow-sm overflow-hidden">
                        <div className="bg-[#0a1f44] px-6 py-5 flex items-start justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.25em] text-[#c9a84c] font-bold mb-1">Lender Profile</div>
                            <div className="font-display text-2xl font-bold text-white">{lender.lender}</div>
                            <div className="text-sm text-gray-300 mt-1">{lender.program}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${lender.status === "Active" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-gray-500/20 text-gray-300 border border-gray-500/30"}`}>{lender.status}</span>
                            <button onClick={() => setViewingLenderId(null)} className="text-gray-400 hover:text-white text-lg font-bold">✕</button>
                          </div>
                        </div>
                        <div className="p-6 space-y-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[["Capital Type", lender.type], ["Min Loan", lender.minLoan], ["Max Loan", lender.maxLoan], ["Max LTV", lender.maxLtv], ["Recourse", lender.recourse || "—"], ["Source", lender.source], ["Row", lender.spreadsheetRow], ["Loan Terms", lender.loanTerms || "—"]].map(([label, val]) => (
                              <div key={String(label)} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                                <div className="text-xs uppercase tracking-[0.12em] text-[#c9a84c] font-bold mb-1">{label}</div>
                                <div className="text-sm font-semibold text-[#0a1f44]">{val}</div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-3">Primary Contact</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[["Name", lender.contactPerson || "—"], ["Email", lender.email || "—"], ["Phone", lender.phone || "—"], ["Website", lender.website || "—"]].map(([label, val]) => (
                                <div key={String(label)} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                                  <div className="text-xs text-gray-400 mb-1">{label}</div>
                                  <div className="text-sm font-medium text-[#0a1f44] break-all">{val}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {lender.contacts && lender.contacts.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-3">Additional Contacts</div>
                              <div className="grid gap-3 md:grid-cols-2">
                                {lender.contacts.map((contact, idx) => (
                                  <div key={contact.id} className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
                                    <div className="text-xs font-bold text-[#0a1f44] mb-2">Contact {idx + 1}{contact.region ? ` — ${contact.region}` : ""}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[["Name", contact.name || "—"], ["Phone", contact.phone || "—"], ["Email", contact.email || "—"], ["Region", contact.region || "—"]].map(([label, val]) => (
                                        <div key={String(label)}><div className="text-xs text-gray-400">{label}</div><div className="text-xs font-semibold text-[#0a1f44] break-all">{val}</div></div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {lender.typeOfLenders && lender.typeOfLenders.length > 0 && (<div><div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-2">Type of Lender</div><div className="flex flex-wrap gap-2">{lender.typeOfLenders.map((t) => <span key={t} className="px-3 py-1 rounded-full text-xs bg-[#0a1f44] text-white font-medium">{t}</span>)}</div></div>)}
                          {lender.typeOfLoans && lender.typeOfLoans.length > 0 && (<div><div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-2">Type of Loans</div><div className="flex flex-wrap gap-2">{lender.typeOfLoans.map((t) => <span key={t} className="px-3 py-1 rounded-full text-xs border border-[#0a1f44]/20 text-[#0a1f44] font-medium">{t}</span>)}</div></div>)}
                          {lender.programTypes && lender.programTypes.length > 0 && (<div><div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-2">Program</div><div className="flex flex-wrap gap-2">{lender.programTypes.map((t) => <span key={t} className="px-3 py-1 rounded-full text-xs border border-[#c9a84c]/30 text-[#c9a84c] font-bold">{t}</span>)}</div></div>)}
                          {lender.assets && lender.assets.length > 0 && (<div><div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-2">Property Types</div><div className="flex flex-wrap gap-2">{lender.assets.map((t) => <span key={t} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">{t}</span>)}</div></div>)}
                          {lender.states && lender.states.length > 0 && (<div><div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-2">Target States ({lender.states.length})</div><div className="flex flex-wrap gap-1.5">{lender.states.includes("Nationwide") ? <span className="px-3 py-1 rounded-full text-xs bg-[#0a1f44] text-white font-medium">Nationwide</span> : lender.states.map((s) => <span key={s} className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200 font-medium">{s}</span>)}</div></div>)}
                          {lender.sponsorStates && lender.sponsorStates.length > 0 && (<div><div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-2">Sponsor States ({lender.sponsorStates.length})</div><div className="flex flex-wrap gap-1.5">{lender.sponsorStates.map((s) => <span key={s} className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200 font-medium">{s}</span>)}</div></div>)}
                          <div className="flex gap-3 pt-2 border-t border-gray-100">
                            <button onClick={() => { setEditingLenderId(lender.id); setViewingLenderId(null); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80"><Edit2 className="h-3.5 w-3.5" /> Edit Lender</button>
                            <button onClick={() => setViewingLenderId(null)} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Close</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Edit Panel */}
                  {editingLenderId && (() => {
                    const lender = lenderRecords.find((l) => l.id === editingLenderId);
                    if (!lender) return null;
                    return (
                      <div className="mt-6 rounded-xl border border-[#0a1f44]/20 bg-gray-50 p-6">
                        <div className="flex items-center justify-between mb-5">
                          <div><div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-bold mb-1">Editing</div><div className="text-lg font-bold text-[#0a1f44]">{lender.lender}</div></div>
                          <button onClick={() => { if (window.confirm(`Delete ${lender.lender}? This cannot be undone.`)) { setLenderRecords((prev) => prev.filter((l) => l.id !== lender.id)); setEditingLenderId(null); } }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete Lender</button>
                        </div>
                        <div className="space-y-5">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Lender Name</label><Input value={lender.lender} onChange={(e) => updateLenderField(lender.id, "lender", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Contact Person</label><Input value={lender.contactPerson || ""} onChange={(e) => updateLenderField(lender.id, "contactPerson", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Email</label><Input value={lender.email || ""} onChange={(e) => updateLenderField(lender.id, "email", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Phone</label><Input value={lender.phone || ""} onChange={(e) => updateLenderField(lender.id, "phone", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Website</label><Input value={lender.website || ""} onChange={(e) => updateLenderField(lender.id, "website", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Status</label><Select value={lender.status} onValueChange={(v) => updateLenderField(lender.id, "status", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Min Loan</label><Input value={lender.minLoan || ""} onChange={(e) => updateLenderField(lender.id, "minLoan", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max Loan</label><Input value={lender.maxLoan || ""} onChange={(e) => updateLenderField(lender.id, "maxLoan", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Max LTV</label><Input value={lender.maxLtv || ""} onChange={(e) => updateLenderField(lender.id, "maxLtv", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Property Types</label><Input value={lender.assets?.join(", ") || ""} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, assets: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : l))} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Loan Terms</label><Input value={lender.loanTerms || ""} onChange={(e) => updateLenderField(lender.id, "loanTerms", e.target.value)} className={inputClass} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Recourse</label><Select value={lender.recourse || "CASE BY CASE"} onValueChange={(v) => updateLenderField(lender.id, "recourse", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                          </div>
                          <CheckboxGroup label="Type of Lender" options={typeOfLenderOptions} selected={lender.typeOfLenders || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, typeOfLenders: v } : l))} />
                          <CheckboxGroup label="Type of Loans" options={typeOfLoanOptions} selected={lender.typeOfLoans || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, typeOfLoans: v } : l))} />
                          <CheckboxGroup label="Program" options={programTypeOptions} selected={lender.programTypes || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, programTypes: v } : l))} />
                          <StateSelector label="Target States" selected={lender.states || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, states: v } : l))} />
                          <StateSelector label="Sponsor States" selected={lender.sponsorStates || []} onChange={(v) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, sponsorStates: v } : l))} />
                          {/* Additional Contacts */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div><label className="text-xs text-gray-500 font-bold uppercase tracking-wide">Additional Contacts</label><p className="text-xs text-gray-400 mt-0.5">Add multiple contacts with their geographic coverage</p></div>
                              <button onClick={() => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, contacts: [...(l.contacts || []), { id: Date.now(), name: "", phone: "", email: "", region: "" }] } : l))} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80"><Plus className="h-3 w-3" /> Add Contact</button>
                            </div>
                            {(!lender.contacts || lender.contacts.length === 0) ? (
                              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-400">No additional contacts yet.</div>
                            ) : (
                              <div className="space-y-3">
                                {lender.contacts.map((contact, cidx) => (
                                  <div key={contact.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                    <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-[#0a1f44]">Contact {cidx + 1}</span><button onClick={() => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, contacts: (l.contacts || []).filter((c) => c.id !== contact.id) } : l))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      <div><label className="text-xs text-gray-400 mb-1 block">Contact Name</label><Input value={contact.name} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, name: e.target.value } : c) } : l))} placeholder="Full name" className={inputClass} /></div>
                                      <div><label className="text-xs text-gray-400 mb-1 block">Phone Number</label><Input value={contact.phone} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, phone: e.target.value } : c) } : l))} placeholder="(555) 000-0000" className={inputClass} /></div>
                                      <div><label className="text-xs text-gray-400 mb-1 block">Email Address</label><Input value={contact.email} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, email: e.target.value } : c) } : l))} placeholder="email@example.com" className={inputClass} /></div>
                                      <div><label className="text-xs text-gray-400 mb-1 block">Geographic Region</label><Input value={contact.region} onChange={(e) => setLenderRecords((prev) => prev.map((l) => l.id === lender.id ? { ...l, contacts: (l.contacts || []).map((c) => c.id === contact.id ? { ...c, region: e.target.value } : c) } : l))} placeholder="e.g. Southeast, NY/NJ" className={inputClass} /></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-3 pt-2 border-t border-gray-200">
                            <button onClick={() => setEditingLenderId(null)} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Done</button>
                            <button onClick={() => toggleLenderStatus(lender.id)} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">{lender.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "add-lender" && (
                <AddLenderPage onSave={handleSaveLender} onCancel={() => setActiveTab("lenders")} existingLenders={lenderRecords} inputClass={inputClass} selectTriggerClass={selectTriggerClass} />
              )}

              {activeTab === "matcher" && (
                <DealMatcher lenderRecords={lenderRecords} inputClass={inputClass} selectTriggerClass={selectTriggerClass} cardClass={cardClass} />
              )}

              {activeTab === "submitted-deals" && (
                <div className={cardClass + " p-6"}>
                  <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Incoming</div>
                  <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Submitted Deals</h2>
                  {submittedDeals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-400">No deals submitted yet. Capital seekers will appear here once they submit a deal.</div>
                  ) : (
                    <div className="space-y-4">
                      {submittedDeals.map((deal) => (
                        <div key={deal.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Deal #{deal.id}</div>
                              <div className="text-base font-bold text-[#0a1f44]">{deal.seekerName}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Submitted: {deal.submittedAt}</div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${deal.status === "pending" ? "bg-amber-50 text-amber-600 border border-amber-200" : deal.status === "assigned" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                              {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            {[["Capital Type", deal.capitalType], ["Assets", `${deal.assets.length} asset${deal.assets.length > 1 ? "s" : ""}`], ["Loan Amount", deal.assets[0]?.loanAmount || "—"], ["Asset Type", deal.assets[0]?.assetType || "—"]].map(([label, val]) => (
                              <div key={String(label)} className="rounded-lg bg-white border border-gray-200 p-3">
                                <div className="text-xs text-gray-400 mb-1">{label}</div>
                                <div className="text-sm font-bold text-[#0a1f44]">{val}</div>
                              </div>
                            ))}
                          </div>
                          {deal.assets.map((asset, idx) => asset.address?.city ? (
                            <div key={idx} className="text-xs text-gray-500 mt-1">Asset {idx + 1}: {asset.address.street ? `${asset.address.street}, ` : ""}{asset.address.city}, {asset.address.state} {asset.address.zip}</div>
                          ) : null)}
                          {/* Assigned Deal Team */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold mb-3">Assigned Deal Team</div>
                            <div className="flex gap-4">
                              {[
                                { name: "Louis Palumbo", title: "VP of Capital Advisory", email: "lpalumbo@capmoon.com", phone: "305-401-0076", photo: "/louis.jpg" },
                                { name: "Shuvo Hussain", title: "VP of Capital Advisory", email: "shussain@capmoon.com", phone: "347-993-5545", photo: "/Shuvo.jpeg" },
                              ].map((advisor) => (
                                <div key={advisor.email} className="flex items-center gap-3 bg-[#0a1f44] rounded-xl px-4 py-3">
                                  <img src={advisor.photo} alt={advisor.name} className="h-10 w-10 rounded-lg object-cover border border-[#c9a84c]/30 flex-shrink-0" />
                                  <div>
                                    <div className="text-xs font-bold text-white">{advisor.name}</div>
                                    <div className="text-xs text-[#c9a84c]">{advisor.title}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{advisor.phone}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                    <div className="flex flex-wrap gap-2 mb-5">{["Program Name", "Contact Person", "Email Address", "Phone Number", "Website", "Type of Lender", "Type of Loans", "Program", "Property Types", "Loan Terms", "Min Loan Size", "Max Loan Size", "Max LTV", "Target States", "Sponsor States", "Recourse", "Capital Type", "Source Tag"].map((field) => (<span key={field} className="px-3 py-1 rounded-full text-xs border border-[#0a1f44]/20 text-[#0a1f44] font-medium">{field}</span>))}</div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">All fields above are automatically mapped when a spreadsheet is uploaded.</div>
                  </div>
                </div>
              )}

              {/* User Management */}
              {activeTab === "user-management" && (
                <div className="space-y-6">
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Admin</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">User Management</h2>
                    {/* Add user form */}
                    <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-5 mb-6">
                      <div className="text-xs uppercase tracking-[0.2em] text-[#0a1f44] font-bold mb-4">Add New User</div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Full Name</label><Input value={newUserForm.name} onChange={(e) => setNewUserForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="John Smith" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Username</label><Input value={newUserForm.username} onChange={(e) => setNewUserForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="john.smith" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Password</label><Input value={newUserForm.password} onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="••••••••" className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Role</label>
                          <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm((prev) => ({ ...prev, role: v as AppUser["role"] }))}>
                            <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="client">Client</SelectItem><SelectItem value="capital-seeker">Capital Seeker</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <button onClick={addUser} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Add User</button>
                    </div>
                    {/* Users list */}
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="font-bold text-[#0a1f44]">{user.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">@{user.username} · <span className="capitalize">{user.role}</span></div>
                            </div>
                            <div className="flex gap-2">
                              {user.id !== 1 && (
                                <button onClick={() => deleteUser(user.id)} className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                              )}
                              {user.id === 1 && <span className="px-3 py-1 text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-lg font-bold">Admin</span>}
                            </div>
                          </div>
                          {user.role !== "admin" && (
                            <div>
                              <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-2">Lender Access Control</div>
                              <div className="text-xs text-gray-500 mb-3">Check boxes to block this user from seeing specific lenders:</div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {lenderRecords.map((lender) => (
                                  <label key={lender.id} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg hover:bg-gray-100">
                                    <input type="checkbox" checked={user.blockedLenderIds.includes(lender.id)} onChange={() => toggleBlockedLender(user.id, lender.id)} className="accent-red-500 w-3.5 h-3.5" />
                                    <span className={user.blockedLenderIds.includes(lender.id) ? "text-red-500 font-semibold line-through" : "text-gray-600"}>{lender.lender}</span>
                                  </label>
                                ))}
                              </div>
                              {user.blockedLenderIds.length > 0 && (
                                <div className="mt-2 text-xs text-red-500 font-medium">{user.blockedLenderIds.length} lender{user.blockedLenderIds.length > 1 ? "s" : ""} blocked for this user</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [session, setSession] = useState<AuthSession>(null);
  const [submittedDeals, setSubmittedDeals] = useState<SubmittedDeal[]>([]);
  const [users, setUsers] = useState<AppUser[]>(initialUsers);

  function handleSubmitDeal(deal: SubmittedDeal) { setSubmittedDeals((prev) => [...prev, deal]); }
  function handleLogout() { setSession(null); }

  if (!session) return <LoginWall onLogin={setSession} />;
  if (session.user.role === "capital-seeker") {
    return <CapitalSeekerPortal lenderRecords={seedLenders} onLogout={handleLogout} onSubmitDeal={handleSubmitDeal} session={session} />;
  }
  return <AdminPortal session={session} onLogout={handleLogout} submittedDeals={submittedDeals} users={users} setUsers={setUsers} />;
}
