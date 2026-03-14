"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Building2, FileSpreadsheet, Filter, Gauge, Landmark, Plus, Search, ShieldCheck, Upload, Users } from "lucide-react";
import { motion } from "framer-motion";

type LenderRecord = {
  id: number;
  source: string;
  spreadsheetRow: string;
  program: string;
  lender: string;
  type: string;
  minLoan: string;
  maxLoan: string;
  maxLtv: string;
  minDscr: string;
  states: string[];
  assets: string[];
  status: string;
  email: string;
  phone: string;
  recourse: string;
};

const seedLenders: LenderRecord[] = [
  { id: 1, source: "Spreadsheet", spreadsheetRow: "A2", program: "Bridge Lending Program", lender: "Apex Credit Partners", type: "Senior", minLoan: "$3,000,000", maxLoan: "$35,000,000", maxLtv: "75%", minDscr: "1.20x", states: ["FL", "GA", "TX"], assets: ["Apartments", "MIXEDUSE", "Retail-MT"], status: "Active", email: "originations@apexcp.com", phone: "(305) 555-0101", recourse: "FULL" },
  { id: 2, source: "Spreadsheet", spreadsheetRow: "A3", program: "Transitional CRE", lender: "Harborline Capital", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$80,000,000", maxLtv: "80%", minDscr: "1.05x", states: ["NY", "FL", "NJ", "IL"], assets: ["Office", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "deals@harborline.com", phone: "(212) 555-0142", recourse: "NON RECOURSE" },
  { id: 3, source: "Spreadsheet", spreadsheetRow: "A4", program: "Value-Add Multifamily", lender: "Northgate Real Estate Credit", type: "Preferred Equity", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "1.10x", states: ["FL", "NC", "SC", "TN"], assets: ["Apartments", "Student Housing", "SFR Portfolio"], status: "Review", email: "placements@northgatecredit.com", phone: "(704) 555-0198", recourse: "SELECTIVE" },
  { id: 4, source: "Spreadsheet", spreadsheetRow: "A5", program: "Construction Capital", lender: "BlueRidge Finance", type: "JV Equity", minLoan: "$15,000,000", maxLoan: "$125,000,000", maxLtv: "70%", minDscr: "N/A", states: ["FL", "TX", "AZ", "NV"], assets: ["Land", "Condos", "Other"], status: "Active", email: "capitalmarkets@blueridgefin.com", phone: "(214) 555-0117", recourse: "" },
  { id: 5, source: "Spreadsheet", spreadsheetRow: "A6", program: "Sponsor Credit Facility", lender: "Summit Specialty Lending", type: "Line of Credit", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "65%", minDscr: "1.25x", states: ["Nationwide"], assets: ["MIXEDUSE", "Retail-MT", "Lt Industrial"], status: "Inactive", email: "sponsors@summitsl.com", phone: "(615) 555-0133", recourse: "CASE BY CASE" },
];

const assetTypes = ["Equipment, Autos, or Other Non Real Estate Products", "Apartments", "Condos", "Senior Housing", "Student Housing", "Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "MIXEDUSE", "Lt Industrial", "Cannabis", "Retail-MT", "Retail- ST", "Hotel/Hospitality", "Loan sales", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other"];
const capitalTypes = ["Senior", "Mezzanine", "Preferred Equity", "JV Equity", "Line of Credit", "Note on Note"];
const dealTypes = ["Construction", "Value add", "New Development", "Bridge", "Takeout", "Investment", "C&I"];
const ownershipStatuses = ["Acquisition", "Refinance"];
const refinanceTypes = ["Cash Out to Borrower", "Cash Out-Value Add", "Rate and Term"];
const recourseOptions = ["FULL", "NON RECOURSE", "CASE BY CASE"];
const marketOptions = ["US", "INTERNATIONAL"];
const allStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function normalizeRecourse(value: string) { return value === "SELECTIVE" || !value ? "CASE BY CASE" : value; }
function parseCurrency(value: string) { return Number(String(value || "0").replace(/[^0-9.]/g, "")); }
function formatCurrencyInput(value: string) {
  const digits = String(value || "").replace(/[^0-9.]/g, "");
  if (!digits) return "";
  const [whole, decimal] = digits.split(".");
  const formattedWhole = Number(whole || 0).toLocaleString("en-US");
  return `$${decimal !== undefined ? `${formattedWhole}.${decimal.slice(0, 2)}` : formattedWhole}`;
}
function formatPercent(value: number) { if (!Number.isFinite(value)) return "—"; return `${value.toFixed(1)}%`; }
function parsePercent(value: string) { return Number(String(value || "0").replace(/[^0-9.]/g, "")); }
function parseDscr(value: string) { if (value === "N/A") return 0; return Number(String(value || "0").replace(/[^0-9.]/g, "")); }
function createBlankLender(nextId: number): LenderRecord {
  return { id: nextId, source: "Dashboard", spreadsheetRow: "—", program: "", lender: "", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "1.20x", states: [], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE" };
}
function subordinateLabel(capitalType: string) {
  if (capitalType === "Mezzanine") return "Mezzanine Amount";
  if (capitalType === "Preferred Equity") return "Preferred Equity Amount";
  if (capitalType === "JV Equity") return "JV Equity Amount";
  return "Subordinate Capital Amount";
}

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
        <div className="rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 p-3 text-[#c9a84c]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const navItems: [string, string, any][] = [
  ["overview", "Overview", Gauge],
  ["lenders", "Lender Programs", Landmark],
  ["matcher", "Deal Matcher", Filter],
  ["uploads", "Upload Center", FileSpreadsheet],
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lenderRecords, setLenderRecords] = useState<LenderRecord[]>(seedLenders);
  const [search, setSearch] = useState("");
  const [showAddLender, setShowAddLender] = useState(false);
  const [newLender, setNewLender] = useState<LenderRecord>(createBlankLender(seedLenders.length + 1));
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("All");
  const [selectedCapitalFilter, setSelectedCapitalFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [editingLenderId, setEditingLenderId] = useState<number | null>(null);
  const [capitalType, setCapitalType] = useState("Senior");
  const [loanAmount, setLoanAmount] = useState("$25,000,000");
  const [seniorLoanAmount, setSeniorLoanAmount] = useState("$20,000,000");
  const [subordinateAmount, setSubordinateAmount] = useState("$5,000,000");
  const [propertyValue, setPropertyValue] = useState("$40,000,000");
  const [landCost, setLandCost] = useState("");
  const [softCosts, setSoftCosts] = useState("");
  const [originationClosingCosts, setOriginationClosingCosts] = useState("");
  const [hardCosts, setHardCosts] = useState("");
  const [carryingCosts, setCarryingCosts] = useState("");
  const [borrowerEquity, setBorrowerEquity] = useState("");
  const [ltvMode, setLtvMode] = useState("AUTO");
  const [currentNetIncome, setCurrentNetIncome] = useState("");
  const [manualLtv, setManualLtv] = useState("72");
  const [dscr, setDscr] = useState("1.20");
  const [assetType, setAssetType] = useState("Apartments");
  const [dealType, setDealType] = useState("Value add");
  const [ownershipStatus, setOwnershipStatus] = useState("Acquisition");
  const [refinanceType, setRefinanceType] = useState("Cash Out to Borrower");
  const [selectedStates, setSelectedStates] = useState<string[]>(["FL"]);
  const [recourseType, setRecourseType] = useState("CASE BY CASE");
  const [marketScope, setMarketScope] = useState("US");

  const isSubordinateCapital = ["Mezzanine", "Preferred Equity", "JV Equity"].includes(capitalType);
  const isAcquisitionConstruction = ownershipStatus === "Acquisition" && dealType === "Construction";
  const projectEstimatedCostsTotal = parseCurrency(landCost) + parseCurrency(softCosts) + parseCurrency(originationClosingCosts) + parseCurrency(hardCosts) + parseCurrency(carryingCosts);
  const acquisitionConstructionLoanAmount = Math.max(0, projectEstimatedCostsTotal - parseCurrency(borrowerEquity));
  const effectiveAmount = isAcquisitionConstruction ? acquisitionConstructionLoanAmount : isSubordinateCapital ? parseCurrency(subordinateAmount) : parseCurrency(loanAmount);
  const seniorAmountNumeric = parseCurrency(seniorLoanAmount);
  const propertyValueNumeric = parseCurrency(propertyValue);
  const totalCapitalNumeric = isSubordinateCapital ? seniorAmountNumeric + effectiveAmount : effectiveAmount;
  const autoLtv = propertyValueNumeric > 0 ? (totalCapitalNumeric / propertyValueNumeric) * 100 : 0;
  const seniorLtv = propertyValueNumeric > 0 ? (seniorAmountNumeric / propertyValueNumeric) * 100 : 0;
  const equityPercent = propertyValueNumeric > 0 ? (parseCurrency(borrowerEquity) / propertyValueNumeric) * 100 : 0;
  const currentLtv = ltvMode === "MANUAL" ? Number(manualLtv || 0) : autoLtv;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lenderRecords.filter((l) => l.program.toLowerCase().includes(q) || l.lender.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.assets.join(" ").toLowerCase().includes(q) || l.source.toLowerCase().includes(q));
  }, [search, lenderRecords]);

  const registryFiltered = useMemo(() => filtered.filter((l) => (selectedSourceFilter === "All" || l.source === selectedSourceFilter) && (selectedCapitalFilter === "All" || l.type === selectedCapitalFilter) && (selectedStatusFilter === "All" || l.status === selectedStatusFilter)), [filtered, selectedSourceFilter, selectedCapitalFilter, selectedStatusFilter]);

  const matches = useMemo(() => {
    if (marketScope === "INTERNATIONAL") return [];
    const currentDscr = Number(dscr || 0);
    return lenderRecords.map((l) => {
      let score = 0;
      const normalizedRecourse = normalizeRecourse(l.recourse);
      if (effectiveAmount >= parseCurrency(l.minLoan) && effectiveAmount <= parseCurrency(l.maxLoan)) score += 30;
      if (l.assets.includes(assetType) || (assetType === "Apartments" && l.assets.includes("Student Housing"))) score += 22;
      if (l.type === capitalType) score += 20;
      if (selectedStates.some((s) => l.states.includes(s)) || l.states.includes("Nationwide")) score += 15;
      if (currentLtv <= parsePercent(l.maxLtv)) score += 8;
      if (currentDscr >= parseDscr(l.minDscr)) score += 5;
      if (dealType === "Construction" && l.assets.includes("Land")) score += 5;
      if (normalizedRecourse === recourseType || normalizedRecourse === "CASE BY CASE") score += 10;
      return { ...l, score, normalizedRecourse };
    }).filter((l) => l.score > 30).sort((a, b) => b.score - a.score).slice(0, 4);
  }, [effectiveAmount, currentLtv, dscr, assetType, dealType, selectedStates, recourseType, marketScope, lenderRecords, capitalType]);

  const spreadsheetCount = lenderRecords.filter((l) => l.source === "Spreadsheet").length;
  const dashboardCount = lenderRecords.filter((l) => l.source === "Dashboard").length;

  function saveNewLender() {
    if (!newLender.lender.trim() || !newLender.program.trim()) return;
    setLenderRecords((prev) => [...prev, { ...newLender, id: prev.length + 1 }]);
    setNewLender(createBlankLender(lenderRecords.length + 2));
    setShowAddLender(false);
  }
  function updateLenderField(id: number, field: keyof LenderRecord, value: string) {
    setLenderRecords((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }
  function toggleLenderStatus(id: number) {
    setLenderRecords((prev) => prev.map((l) => (l.id !== id ? l : { ...l, status: l.status === "Inactive" ? "Active" : "Inactive" })));
  }

  const inputClass = "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-[#0a1f44] focus:ring-0";
  const selectTriggerClass = "bg-white border-gray-300 text-gray-800 rounded-xl focus:border-[#0a1f44]";
  const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";
  const darkCardClass = "rounded-2xl border border-[#c9a84c]/20 bg-[#0a1f44] shadow-xl";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap');
        * { font-family: 'Montserrat', sans-serif; }
        .font-display { font-family: 'Cormorant Garamond', serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f0f2f5; }
        ::-webkit-scrollbar-thumb { background: #c9a84c66; border-radius: 2px; }
        [data-radix-select-content] { background: white !important; border: 1px solid #e5e7eb !important; color: #1f2937 !important; }
        [data-radix-select-item] { color: #1f2937 !important; }
        [data-radix-select-item]:hover, [data-radix-select-item][data-highlighted] { background: #f3f4f6 !important; color: #0a1f44 !important; }
      `}</style>

      <div className="min-h-screen bg-[#f0f2f5] text-gray-800">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">

          {/* Sidebar - stays dark navy */}
          <aside className="border-r border-[#c9a84c]/10 bg-[#0a1f44] flex flex-col">
            <div className="px-6 py-8 border-b border-[#c9a84c]/20">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo1.JPEG" alt="CapMoon" className="h-12 w-12 object-contain rounded-full" />
                <div>
                  <div className="font-display text-2xl font-bold text-white">CapMoon</div>
                  <div className="text-xs text-gray-400 tracking-wide">Lender Intelligence Platform</div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-[#c9a84c] font-bold mt-3">Capital Advisory</div>
            </div>
            <nav className="space-y-1 p-4 flex-1">
              {navItems.map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${activeTab === key ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30" : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium tracking-wide">{label}</span>
                  {activeTab === key && <div className="ml-auto w-1 h-4 bg-[#c9a84c] rounded-full" />}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-[#c9a84c]/20">
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-[#c9a84c]" />
                  <span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">Spreadsheet-driven criteria plus dashboard lenders in one workflow.</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="p-6 md:p-8 overflow-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {/* Top Bar */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-[#c9a84c] font-bold">Institutional Workflow</div>
                  <h1 className="font-display text-4xl font-bold text-[#0a1f44] mt-1">Lender Dashboard</h1>
                  <p className="mt-1 text-sm text-gray-500">Senior LTV · Last Dollar LTV · Capital Stack · Equity Analysis</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 text-sm font-medium text-[#0a1f44] border border-[#0a1f44]/30 rounded-xl hover:bg-[#0a1f44]/10 transition-all">Export Lender Set</button>
                  <button onClick={() => { setActiveTab("lenders"); setShowAddLender(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">
                    <Plus className="h-4 w-4" /> Add Lender
                  </button>
                </div>
              </div>

              {/* Stat Cards - dark navy */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <StatCard title="Total Lenders" value={String(lenderRecords.length)} detail="Spreadsheet + dashboard records" icon={Building2} />
                <StatCard title="Spreadsheet" value={String(spreadsheetCount)} detail="Imported criteria rows" icon={FileSpreadsheet} />
                <StatCard title="Dashboard Added" value={String(dashboardCount)} detail="Created manually" icon={Users} />
                <StatCard title="Capital Types" value="6" detail="Senior · Mezz · Pref · JV · LOC · Note" icon={BarChart3} />
              </div>

              {/* Overview Tab */}
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
                        <div>
                          <div className="text-sm font-bold text-[#0a1f44]">Platform Health</div>
                          <div className="text-xs text-gray-500 mt-0.5">Coverage across asset type, leverage, geography, and capital stack</div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Healthy</span>
                      </div>
                      <div className="space-y-4">
                        {[["Asset class mapping", 94], ["Loan sizing confidence", 88], ["State eligibility coverage", 91], ["Contact completeness", 84]].map(([label, val]) => (
                          <div key={String(label)}>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-gray-600 font-medium">{label}</span>
                              <span className="text-[#c9a84c] font-bold">{val}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#0a1f44] to-[#c9a84c] rounded-full" style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Live Preview</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Top Lender Matches</h2>
                    <div className="space-y-3">
                      {matches.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">No matches with current criteria.</div>
                      ) : matches.map((match, index) => (
                        <div key={match.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-[#0a1f44]/30 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">#{index + 1} Match</div>
                              <div className="text-sm font-semibold text-[#0a1f44]">{match.lender}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{match.program}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500">{match.source}</span>
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0a1f44]/10 text-[#0a1f44] border border-[#0a1f44]/20">{match.score}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Lenders Tab */}
              {activeTab === "lenders" && (
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className={cardClass + " p-6"}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">Registry</div>
                        <h2 className="font-display text-2xl font-bold text-[#0a1f44]">Lender Programs</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Edit, deactivate, filter, and review lender records.</p>
                      </div>
                      <button onClick={() => setShowAddLender((v) => !v)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">
                        <Plus className="h-4 w-4" /> {showAddLender ? "Hide Form" : "Add Lender"}
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4 mb-4">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className={inputClass + " pl-9"} />
                      </div>
                      <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Sources</SelectItem><SelectItem value="Spreadsheet">Spreadsheet</SelectItem><SelectItem value="Dashboard">Dashboard</SelectItem></SelectContent></Select>
                      <Select value={selectedCapitalFilter} onValueChange={setSelectedCapitalFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Capital</SelectItem>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[`Spreadsheet: ${spreadsheetCount}`, `Dashboard: ${dashboardCount}`, `Showing: ${registryFiltered.length}`].map((t) => (
                        <span key={t} className="px-3 py-1 rounded-full text-xs border border-[#c9a84c]/30 text-[#c9a84c] font-bold">{t}</span>
                      ))}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">
                            {["Source", "Row", "Lender", "Program", "Capital", "Phone", "Status", ""].map((h) => (
                              <TableHead key={h} className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registryFiltered.map((item) => (
                            <TableRow key={item.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                              <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.source === "Spreadsheet" ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>{item.source}</span></TableCell>
                              <TableCell className="text-gray-400 text-xs">{item.spreadsheetRow}</TableCell>
                              <TableCell className="font-semibold text-[#0a1f44] text-sm">{item.lender}</TableCell>
                              <TableCell className="text-gray-600 text-xs">{item.program}</TableCell>
                              <TableCell className="text-gray-600 text-xs">{item.type}</TableCell>
                              <TableCell className="text-gray-400 text-xs">{item.phone || "—"}</TableCell>
                              <TableCell><span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500">{item.status}</span></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingLenderId(item.id === editingLenderId ? null : item.id)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 transition-all font-medium">{item.id === editingLenderId ? "Close" : "Edit"}</button>
                                  <button onClick={() => toggleLenderStatus(item.id)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100 transition-all">{item.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">{showAddLender ? "New Entry" : editingLenderId ? "Edit Mode" : "Controls"}</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">{showAddLender ? "Add Lender" : editingLenderId ? "Edit Lender" : "Registry Controls"}</h2>
                    {showAddLender ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Lender Name</label><Input value={newLender.lender} onChange={(e) => setNewLender({ ...newLender, lender: e.target.value })} className={inputClass} /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Program Name</label><Input value={newLender.program} onChange={(e) => setNewLender({ ...newLender, program: e.target.value })} className={inputClass} /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Capital Type</label><Select value={newLender.type} onValueChange={(value) => setNewLender({ ...newLender, type: value })}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Contact Email</label><Input value={newLender.email} onChange={(e) => setNewLender({ ...newLender, email: e.target.value })} className={inputClass} /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Phone Number</label><Input value={newLender.phone} onChange={(e) => setNewLender({ ...newLender, phone: e.target.value })} className={inputClass} /></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button onClick={saveNewLender} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">Save Lender</button>
                          <button onClick={() => setNewLender(createBlankLender(lenderRecords.length + 1))} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all">Reset</button>
                        </div>
                      </div>
                    ) : editingLenderId ? (
                      (() => {
                        const lender = lenderRecords.find((l) => l.id === editingLenderId);
                        if (!lender) return null;
                        return (
                          <div className="space-y-4">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">Source: <span className="text-[#0a1f44] font-bold">{lender.source}</span> · Row: <span className="text-[#0a1f44] font-bold">{lender.spreadsheetRow}</span></div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Lender Name</label><Input value={lender.lender} onChange={(e) => updateLenderField(lender.id, "lender", e.target.value)} className={inputClass} /></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Program Name</label><Input value={lender.program} onChange={(e) => updateLenderField(lender.id, "program", e.target.value)} className={inputClass} /></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Capital Type</label><Select value={lender.type} onValueChange={(value) => updateLenderField(lender.id, "type", value)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Status</label><Select value={lender.status} onValueChange={(value) => updateLenderField(lender.id, "status", value)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Email</label><Input value={lender.email || ""} onChange={(e) => updateLenderField(lender.id, "email", e.target.value)} className={inputClass} /></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Phone</label><Input value={lender.phone || ""} onChange={(e) => updateLenderField(lender.id, "phone", e.target.value)} className={inputClass} /></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => setEditingLenderId(null)} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">Done</button>
                              <button onClick={() => toggleLenderStatus(lender.id)} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all">{lender.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-3">
                        {[["Edit Lenders", "Click Edit on any row to update lender details."], ["Deactivate Lenders", "Deactivate without deleting — stays in registry but excluded operationally."], ["Row Mapping", "Spreadsheet lenders retain row mapping like A2–A717."]].map(([title, desc]) => (
                          <div key={String(title)} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="text-sm font-bold text-[#0a1f44] mb-1">{title}</div>
                            <div className="text-xs text-gray-500">{desc}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Matcher Tab */}
              {activeTab === "matcher" && (
                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Qualification</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Deal Matcher</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Market</label><Select value={marketScope} onValueChange={setMarketScope}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{marketOptions.map((item) => <SelectItem key={item} value={item}>{item === "US" ? "US" : "International"}</SelectItem>)}</SelectContent></Select></div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Ownership Status</label><Select value={ownershipStatus} onValueChange={setOwnershipStatus}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{ownershipStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Deal Type</label><Select value={dealType} onValueChange={setDealType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{dealTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                      {ownershipStatus === "Refinance" && (<div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Refinance Type</label><Select value={refinanceType} onValueChange={setRefinanceType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{refinanceTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>)}
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Asset Type</label><Select value={assetType} onValueChange={setAssetType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{assetTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                      {isAcquisitionConstruction && (
                        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-bold mb-3">Project Estimated Costs</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {([["Land / Acquisition Cost", landCost, setLandCost], ["Soft Costs", softCosts, setSoftCosts], ["Origination & Closing", originationClosingCosts, setOriginationClosingCosts], ["Hard Costs", hardCosts, setHardCosts], ["Carrying Costs", carryingCosts, setCarryingCosts], ["Borrower Equity", borrowerEquity, setBorrowerEquity]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                              <div key={label}><label className="text-xs text-gray-500 mb-1 block font-medium">{label}</label><Input value={val} onChange={(e) => setter(formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isSubordinateCapital && !isAcquisitionConstruction && (<div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase tracking-wide">Loan Amount</label><Input value={loanAmount} onChange={(e) => setLoanAmount(formatCurrencyInput(e.target.value))} className={inputClass} /></div>)}
                      {isSubordinateCapital && (<>
                        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Senior Loan Amount</label><Input value={seniorLoanAmount} onChange={(e) => setSeniorLoanAmount(formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{subordinateLabel(capitalType)}</label><Input value={subordinateAmount} onChange={(e) => setSubordinateAmount(formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">Stack: Senior {seniorLoanAmount || "$0"} + {subordinateLabel(capitalType)} {subordinateAmount || "$0"}</div>
                      </>)}
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 mb-2 block font-medium uppercase tracking-wide">States</label>
                        <div className="mb-2 flex gap-2">
                          <button onClick={() => setSelectedStates(allStates)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 transition-all font-medium">Select All</button>
                          <button onClick={() => setSelectedStates([])} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100 transition-all">Clear</button>
                        </div>
                        <div className="grid max-h-40 grid-cols-6 gap-1.5 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                          {allStates.map((s) => (<label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={selectedStates.includes(s)} onChange={() => setSelectedStates((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])} className="accent-[#0a1f44]" /><span className="text-gray-600">{s}</span></label>))}
                        </div>
                      </div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Property Value / ARV</label><Input value={propertyValue} onChange={(e) => setPropertyValue(formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">LTV Mode</label><Select value={ltvMode} onValueChange={setLtvMode}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">Auto Calculate</SelectItem><SelectItem value="MANUAL">Manual Entry</SelectItem></SelectContent></Select></div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Net Income</label><Input value={currentNetIncome} onChange={(e) => setCurrentNetIncome(formatCurrencyInput(e.target.value))} className={inputClass} /></div>
                      {ltvMode === "MANUAL" ? <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Manual LTV</label><Input value={manualLtv} onChange={(e) => setManualLtv(e.target.value)} className={inputClass} /></div> : <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Calculated LTV</label><div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-[#0a1f44]">{formatPercent(autoLtv)}</div></div>}
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">DSCR</label><Input value={dscr} onChange={(e) => setDscr(e.target.value)} className={inputClass} /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Recourse</label><Select value={recourseType} onValueChange={setRecourseType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                      <div className="md:col-span-2 grid grid-cols-4 gap-3">
                        {([["Senior LTV", formatPercent(seniorLtv)], ["Last $ LTV", formatPercent(autoLtv)], ["Total Capital", formatCurrencyInput(String(totalCapitalNumeric || 0))], ["Equity %", formatPercent(equityPercent)]] as [string, string][]).map(([label, val]) => (
                          <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                            <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">{label}</div>
                            <div className="text-sm font-bold text-[#0a1f44]">{val}</div>
                          </div>
                        ))}
                      </div>
                      {marketScope === "INTERNATIONAL" && (<div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>)}
                      <div className="md:col-span-2 flex gap-3 pt-2">
                        <button className="px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">Run Lender Match</button>
                        <button className="px-5 py-2.5 text-sm border border-[#0a1f44]/20 text-[#0a1f44] rounded-xl hover:bg-[#0a1f44]/10 transition-all font-medium">Save Scenario</button>
                      </div>
                    </div>
                  </div>
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Results</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Ranked Output</h2>
                    {marketScope === "INTERNATIONAL" ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-medium text-red-600">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>
                    ) : matches.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">No lender matches found for the selected criteria.</div>
                    ) : matches.map((match) => (
                      <div key={match.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-3 hover:border-[#0a1f44]/30 transition-all">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                          <div>
                            <div className="text-base font-bold text-[#0a1f44]">{match.lender}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{match.program}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500">{match.source}</span>
                            <div className="text-right">
                              <div className="text-xs text-gray-400">Match score</div>
                              <div className="text-xl font-bold text-[#0a1f44]">{match.score}%</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          {([["Capital", match.type], ["Amount", isSubordinateCapital ? subordinateAmount : formatCurrencyInput(String(effectiveAmount || 0))], ["Contact", match.email || "—"]] as [string, string][]).map(([label, val]) => (
                            <div key={label} className="rounded-lg bg-white border border-gray-200 p-3">
                              <div className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold mb-1">{label}</div>
                              <div className="text-xs font-medium text-gray-600 break-all">{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploads Tab */}
              {activeTab === "uploads" && (
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Admin</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Workbook Ingestion</h2>
                    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center hover:border-[#0a1f44]/40 transition-all">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f44]/10 border border-[#0a1f44]/20 text-[#0a1f44] mb-4"><Upload className="h-6 w-6" /></div>
                      <div className="text-base font-bold text-[#0a1f44] mb-1">Drop Updated Lender Workbook</div>
                      <div className="text-sm text-gray-500 mb-5">Supports .xlsx ingestion, field mapping, validation, and version history.</div>
                      <button className="px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">Select Spreadsheet</button>
                    </div>
                  </div>
                  <div className={cardClass + " p-6"}>
                    <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Preview</div>
                    <h2 className="font-display text-2xl font-bold text-[#0a1f44] mb-5">Detected Schema</h2>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {["Program Name", "Lender Name", "Min Loan Size", "Max Loan Size", "Max LTV", "Min DSCR", "Target States", "Apartments", "Office", "Recourse", "Source Tag"].map((field) => (
                        <span key={field} className="px-3 py-1 rounded-full text-xs border border-[#0a1f44]/20 text-[#0a1f44] font-medium">{field}</span>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Spreadsheet lenders and dashboard-added lenders coexist in one database with a source tag.
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
