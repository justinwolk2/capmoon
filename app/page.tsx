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

const assetTypes = [
  "Equipment, Autos, or Other Non Real Estate Products",
  "Apartments", "Condos", "Senior Housing", "Student Housing", "Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "MIXEDUSE", "Lt Industrial", "Cannabis", "Retail-MT", "Retail- ST", "Hotel/Hospitality", "Loan sales", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other",
];
const capitalTypes = ["Senior", "Mezzanine", "Preferred Equity", "JV Equity", "Line of Credit", "Note on Note"];
const dealTypes = ["Construction", "Value add", "New Development", "Bridge", "Takeout", "Investment", "C&I"];
const ownershipStatuses = ["Acquisition", "Refinance"];
const refinanceTypes = ["Cash Out to Borrower", "Cash Out-Value Add", "Rate and Term"];
const recourseOptions = ["FULL", "NON RECOURSE", "CASE BY CASE"];
const marketOptions = ["US", "INTERNATIONAL"];
const allStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function normalizeRecourse(value: string) {
  return value === "SELECTIVE" || !value ? "CASE BY CASE" : value;
}
function parseCurrency(value: string) {
  return Number(String(value || "0").replace(/[^0-9.]/g, ""));
}
function formatCurrencyInput(value: string) {
  const digits = String(value || "").replace(/[^0-9.]/g, "");
  if (!digits) return "";
  const [whole, decimal] = digits.split(".");
  const formattedWhole = Number(whole || 0).toLocaleString("en-US");
  return `$${decimal !== undefined ? `${formattedWhole}.${decimal.slice(0, 2)}` : formattedWhole}`;
}
function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}
function parsePercent(value: string) {
  return Number(String(value || "0").replace(/[^0-9.]/g, ""));
}
function parseDscr(value: string) {
  if (value === "N/A") return 0;
  return Number(String(value || "0").replace(/[^0-9.]/g, ""));
}
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
    <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-slate-500">{title}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
            <div className="mt-2 text-sm text-slate-500">{detail}</div>
          </div>
          <div className="rounded-2xl bg-slate-950 p-3 text-white"><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

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
    return lenderRecords
      .map((l) => {
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
      })
      .filter((l) => l.score > 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-7 py-7">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">CapMoon</div>
            <div className="text-lg font-semibold">Admin Console</div>
            <div className="mt-3 text-sm text-slate-500">Lender intelligence and deal matching platform</div>
          </div>
          <nav className="space-y-2 p-4">
            {[["overview", "Overview", Gauge], ["lenders", "Lender Programs", Landmark], ["matcher", "Deal Matcher", Filter], ["uploads", "Upload Center", FileSpreadsheet]].map(([key, label, Icon]) => (
              <button key={String(key)} onClick={() => setActiveTab(String(key))} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${activeTab === key ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4">
            <Card className="rounded-3xl border-slate-200 bg-slate-950 text-white shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /><div className="font-medium">Auto-Match Engine</div></div>
                <p className="mt-3 text-sm text-slate-300">Spreadsheet-driven criteria plus dashboard-added lenders, in one clean admin workflow.</p>
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="p-5 md:p-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Institutional Workflow</div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Lender dashboard</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">Senior LTV, Last Dollar LTV, formatted currency fields, and Equity %.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-2xl border-slate-300 bg-white">Export lender set</Button>
                <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => { setActiveTab("lenders"); setShowAddLender(true); }}><Plus className="mr-2 h-4 w-4" /> Add lender</Button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total lenders" value={String(lenderRecords.length)} detail="Spreadsheet + dashboard records" icon={Building2} />
              <StatCard title="Spreadsheet" value={String(spreadsheetCount)} detail="Imported criteria rows" icon={FileSpreadsheet} />
              <StatCard title="Dashboard added" value={String(dashboardCount)} detail="Created manually" icon={Users} />
              <StatCard title="Capital types" value="6" detail="Senior, Mezz, Pref, JV, LOC, Note on Note" icon={BarChart3} />
            </div>

            {activeTab === "overview" && (
              <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>Pipeline snapshot</CardTitle><CardDescription>Admin view for intake, match quality, and lender coverage</CardDescription></CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[["New deal requests", "18", "This week"], ["Matched this month", "126", "Ranked and exported"], ["Dashboard lenders", String(dashboardCount), "Added manually"]].map(([label, value, detail]) => (
                        <div key={String(label)} className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-sm text-slate-500">{label}</div>
                          <div className="mt-2 text-2xl font-semibold">{value}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{detail}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Platform health</div><div className="text-sm text-slate-500">Coverage across asset type, leverage, geography, and capital stack</div></div><Badge className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">Healthy</Badge></div>
                      <div className="mt-5 space-y-4">
                        {[["Asset class mapping", 94], ["Loan sizing confidence", 88], ["State eligibility coverage", 91], ["Contact completeness", 84]].map(([label, val]) => (
                          <div key={String(label)}><div className="mb-2 flex items-center justify-between text-sm"><span>{label}</span><span className="text-slate-500">{val}%</span></div><Progress value={Number(val)} className="h-2" /></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>Top lender matches</CardTitle><CardDescription>Live preview of ranked output for the selected capital stack request</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {matches.map((match, index) => (
                      <div key={match.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div><div className="text-sm uppercase tracking-[0.18em] text-slate-500">#{index + 1} match</div><div className="mt-1 text-lg font-semibold">{match.lender}</div><div className="mt-1 text-sm text-slate-500">{match.program}</div></div>
                          <div className="flex items-center gap-2"><Badge variant="outline" className="rounded-full">{match.source}</Badge><Badge className="rounded-full bg-slate-950 px-3 py-1 text-white hover:bg-slate-950">{match.score}% fit</Badge></div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "lenders" && (
              <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div><CardTitle>Lender Registry</CardTitle><CardDescription>Edit, deactivate, filter, and review lender records.</CardDescription></div>
                      <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setShowAddLender((v) => !v)}><Plus className="mr-2 h-4 w-4" /> {showAddLender ? "Hide form" : "Add lender"}</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 grid gap-3 md:grid-cols-4">
                      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lender, program, source" className="rounded-2xl border-slate-300 pl-10" /></div>
                      <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Sources</SelectItem><SelectItem value="Spreadsheet">Spreadsheet</SelectItem><SelectItem value="Dashboard">Dashboard</SelectItem></SelectContent></Select>
                      <Select value={selectedCapitalFilter} onValueChange={setSelectedCapitalFilter}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Capital Types</SelectItem>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2"><Badge variant="outline" className="rounded-full">Spreadsheet: {spreadsheetCount}</Badge><Badge variant="outline" className="rounded-full">Dashboard: {dashboardCount}</Badge><Badge variant="outline" className="rounded-full">Showing: {registryFiltered.length}</Badge></div>
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <Table>
                        <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50"><TableHead>Source</TableHead><TableHead>Row</TableHead><TableHead>Lender</TableHead><TableHead>Program</TableHead><TableHead>Capital</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {registryFiltered.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell><Badge className={`rounded-full ${item.source === "Spreadsheet" ? "bg-slate-200 text-slate-800 hover:bg-slate-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"}`}>{item.source}</Badge></TableCell>
                              <TableCell>{item.spreadsheetRow}</TableCell>
                              <TableCell className="font-medium">{item.lender}</TableCell>
                              <TableCell>{item.program}</TableCell>
                              <TableCell>{item.type}</TableCell><TableCell>{item.phone || "—"}</TableCell><TableCell><Badge variant="outline" className="rounded-full">{item.status}</Badge></TableCell>
                              <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" className="rounded-xl border-slate-300 bg-white" onClick={() => setEditingLenderId(item.id === editingLenderId ? null : item.id)}>{item.id === editingLenderId ? "Close" : "Edit"}</Button><Button variant="outline" className="rounded-xl border-slate-300 bg-white" onClick={() => toggleLenderStatus(item.id)}>{item.status === "Inactive" ? "Activate" : "Deactivate"}</Button></div></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>{showAddLender ? "Add lender" : editingLenderId ? "Edit lender" : "Registry Controls"}</CardTitle><CardDescription>{showAddLender ? "Create a lender directly in the dashboard." : editingLenderId ? "Update lender details and keep the registry current." : "Use filters and row mapping to manage lender records."}</CardDescription></CardHeader>
                  <CardContent className="space-y-5">
                    {showAddLender ? (
                      <div className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><label className="text-sm font-medium">Lender Name</label><Input value={newLender.lender} onChange={(e) => setNewLender({ ...newLender, lender: e.target.value })} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Program Name</label><Input value={newLender.program} onChange={(e) => setNewLender({ ...newLender, program: e.target.value })} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Capital Type</label><Select value={newLender.type} onValueChange={(value) => setNewLender({ ...newLender, type: value })}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Contact Email</label><Input value={newLender.email} onChange={(e) => setNewLender({ ...newLender, email: e.target.value })} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Phone Number</label><Input value={newLender.phone} onChange={(e) => setNewLender({ ...newLender, phone: e.target.value })} className="rounded-2xl border-slate-300" /></div>
                        </div>
                        <div className="flex gap-3 pt-2"><Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={saveNewLender}>Save lender</Button><Button variant="outline" className="rounded-2xl border-slate-300 bg-white" onClick={() => setNewLender(createBlankLender(lenderRecords.length + 1))}>Reset form</Button></div>
                      </div>
                    ) : editingLenderId ? (
                      (() => {
                        const lender = lenderRecords.find((l) => l.id === editingLenderId);
                        if (!lender) return null;
                        return (
                          <div className="space-y-5">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Source: {lender.source} · Row Mapping: {lender.spreadsheetRow}</div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2"><label className="text-sm font-medium">Lender Name</label><Input value={lender.lender} onChange={(e) => updateLenderField(lender.id, "lender", e.target.value)} className="rounded-2xl border-slate-300" /></div>
                              <div className="space-y-2"><label className="text-sm font-medium">Program Name</label><Input value={lender.program} onChange={(e) => updateLenderField(lender.id, "program", e.target.value)} className="rounded-2xl border-slate-300" /></div>
                              <div className="space-y-2"><label className="text-sm font-medium">Capital Type</label><Select value={lender.type} onValueChange={(value) => updateLenderField(lender.id, "type", value)}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                              <div className="space-y-2"><label className="text-sm font-medium">Status</label><Select value={lender.status} onValueChange={(value) => updateLenderField(lender.id, "status", value)}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
                              <div className="space-y-2"><label className="text-sm font-medium">Contact Email</label><Input value={lender.email || ""} onChange={(e) => updateLenderField(lender.id, "email", e.target.value)} className="rounded-2xl border-slate-300" /></div>
                              <div className="space-y-2"><label className="text-sm font-medium">Phone Number</label><Input value={lender.phone || ""} onChange={(e) => updateLenderField(lender.id, "phone", e.target.value)} className="rounded-2xl border-slate-300" /></div>
                            </div>
                            <div className="flex gap-3 pt-2"><Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setEditingLenderId(null)}>Done</Button><Button variant="outline" className="rounded-2xl border-slate-300 bg-white" onClick={() => toggleLenderStatus(lender.id)}>{lender.status === "Inactive" ? "Activate" : "Deactivate"}</Button></div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 p-4"><div className="text-sm font-semibold">Edit lenders</div><div className="mt-1 text-sm text-slate-500">Click Edit on any row to change lender name, program, status, capital type, or contact email.</div></div>
                        <div className="rounded-2xl border border-slate-200 p-4"><div className="text-sm font-semibold">Deactivate lenders</div><div className="mt-1 text-sm text-slate-500">Deactivate a lender without deleting it so it stays in the registry but can be excluded operationally.</div></div>
                        <div className="rounded-2xl border border-slate-200 p-4"><div className="text-sm font-semibold">Spreadsheet row mapping</div><div className="mt-1 text-sm text-slate-500">Spreadsheet lenders retain row mapping like A2–A717, while dashboard lenders display a manual record marker.</div></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "matcher" && (
              <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>Deal intake</CardTitle><CardDescription>Capital type and deal type come first and control the amount prompts.</CardDescription></CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><label className="text-sm font-medium">Market</label><Select value={marketScope} onValueChange={setMarketScope}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{marketOptions.map((item) => <SelectItem key={item} value={item}>{item === "US" ? "US" : "International"}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Property Ownership Status</label><Select value={ownershipStatus} onValueChange={setOwnershipStatus}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{ownershipStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Deal Type</label><Select value={dealType} onValueChange={setDealType}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{dealTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    {ownershipStatus === "Refinance" && (
                      <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Refinance Type</label><Select value={refinanceType} onValueChange={setRefinanceType}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{refinanceTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    )}
                    <div className="space-y-2"><label className="text-sm font-medium">Asset Type</label><Select value={assetType} onValueChange={setAssetType}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{assetTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    {isAcquisitionConstruction && (
                      <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 text-sm font-semibold text-slate-900">Project Estimated Costs</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><label className="text-sm font-medium">Land Cost / Acquisition Cost</label><Input value={landCost} onChange={(e) => setLandCost(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Soft Costs</label><Input value={softCosts} onChange={(e) => setSoftCosts(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Origination and Closing Costs</label><Input value={originationClosingCosts} onChange={(e) => setOriginationClosingCosts(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Hard Costs</label><Input value={hardCosts} onChange={(e) => setHardCosts(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Carrying Costs</label><Input value={carryingCosts} onChange={(e) => setCarryingCosts(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                          <div className="space-y-2"><label className="text-sm font-medium">Borrower Equity</label><Input value={borrowerEquity} onChange={(e) => setBorrowerEquity(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                        </div>
                      </div>
                    )}
                    {!isSubordinateCapital && !isAcquisitionConstruction && <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Loan Amount</label><Input value={loanAmount} onChange={(e) => setLoanAmount(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>}
                    {isAcquisitionConstruction && !isSubordinateCapital && <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Calculated Loan Amount</label><div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{formatCurrencyInput(String(acquisitionConstructionLoanAmount))}</div><div className="mt-1 text-xs text-slate-500">Project Estimated Costs less Borrower Equity</div></div>}
                    {isSubordinateCapital && (
                      <>
                        <div className="space-y-2"><label className="text-sm font-medium">Senior Loan Amount</label><Input value={seniorLoanAmount} onChange={(e) => setSeniorLoanAmount(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">{subordinateLabel(capitalType)}</label><Input value={subordinateAmount} onChange={(e) => setSubordinateAmount(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Stack preview: Senior Loan {seniorLoanAmount || "$0"} + {subordinateLabel(capitalType)} {subordinateAmount || "$0"}</div>
                      </>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">States</label>
                      <div className="mb-2 flex items-center gap-2"><button type="button" onClick={() => setSelectedStates(allStates)} className="rounded-md border bg-white px-2 py-1 text-xs">Select All</button><button type="button" onClick={() => setSelectedStates([])} className="rounded-md border bg-white px-2 py-1 text-xs">Clear</button></div>
                      <div className="grid max-h-40 grid-cols-5 gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">{allStates.map((s) => <label key={s} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedStates.includes(s)} onChange={() => setSelectedStates((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])} /><span>{s}</span></label>)}</div>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-medium">Appraised Property Value/ARV Value</label><Input value={propertyValue} onChange={(e) => setPropertyValue(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">LTV Mode</label><Select value={ltvMode} onValueChange={setLtvMode}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">Auto Calculate</SelectItem><SelectItem value="MANUAL">Manual Entry</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Current Net Income</label><Input value={currentNetIncome} onChange={(e) => setCurrentNetIncome(formatCurrencyInput(e.target.value))} className="rounded-2xl border-slate-300" /></div>
                    {ltvMode === "MANUAL" ? <div className="space-y-2"><label className="text-sm font-medium">Manual LTV</label><Input value={manualLtv} onChange={(e) => setManualLtv(e.target.value)} className="rounded-2xl border-slate-300" /></div> : <div className="space-y-2"><label className="text-sm font-medium">Calculated LTV - Last Dollar</label><div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{formatPercent(autoLtv)}</div></div>}
                    <div className="space-y-2"><label className="text-sm font-medium">DSCR</label><Input value={dscr} onChange={(e) => setDscr(e.target.value)} className="rounded-2xl border-slate-300" /></div>
                    {isAcquisitionConstruction && <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-3"><div><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Project Estimated Costs</div><div className="mt-1 text-lg font-semibold">{formatCurrencyInput(String(projectEstimatedCostsTotal))}</div></div><div><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Borrower Equity</div><div className="mt-1 text-lg font-semibold">{borrowerEquity || "$0"}</div></div><div><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Calculated Loan Amount</div><div className="mt-1 text-lg font-semibold">{formatCurrencyInput(String(acquisitionConstructionLoanAmount))}</div></div></div></div>}
                    <div className="md:col-span-2 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Senior LTV - Basis</div><div className="mt-1 text-lg font-semibold">{formatPercent(seniorLtv)}</div></div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Last Dollar LTV</div><div className="mt-1 text-lg font-semibold">{formatPercent(autoLtv)}</div></div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Capital</div><div className="mt-1 text-lg font-semibold">{formatCurrencyInput(String(totalCapitalNumeric || 0))}</div></div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Equity %</div><div className="mt-1 text-lg font-semibold">{formatPercent(equityPercent)}</div></div>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-medium">Recourse</label><Select value={recourseType} onValueChange={setRecourseType}><SelectTrigger className="rounded-2xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    {marketScope === "INTERNATIONAL" && <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>}
                    <div className="md:col-span-2 flex gap-3 pt-2"><Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">Run lender match</Button><Button variant="outline" className="rounded-2xl border-slate-300 bg-white">Save scenario</Button></div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>Ranked output</CardTitle><CardDescription>Preview of match scoring, ready for CRM routing and export</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {marketScope === "INTERNATIONAL" ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-medium text-red-700">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div> : matches.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No lender matches found for the selected criteria.</div> : matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="text-lg font-semibold">{match.lender}</div><div className="text-sm text-slate-500">{match.program}</div></div><div className="flex items-center gap-2"><Badge variant="outline" className="rounded-full">{match.source}</Badge><div className="text-right"><div className="text-sm text-slate-500">Match score</div><div className="text-2xl font-semibold">{match.score}%</div></div></div></div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Capital</div><div className="mt-1 font-medium">{match.type}</div></div>
                          <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Requested Amount</div><div className="mt-1 font-medium">{isSubordinateCapital ? subordinateAmount : formatCurrencyInput(String(effectiveAmount || 0))}</div><div className="mt-1 text-xs text-slate-500">LTV Used: {formatPercent(currentLtv)}</div></div>
                          <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Contact</div><div className="mt-1 break-all font-medium">{match.email || "—"}</div><div className="mt-1 text-xs text-slate-500">Recourse: {match.normalizedRecourse}</div></div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "uploads" && (
              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>Workbook ingestion</CardTitle><CardDescription>Admin flow for replacing or refreshing the lender criteria spreadsheet</CardDescription></CardHeader>
                  <CardContent>
                    <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white"><Upload className="h-6 w-6" /></div><div className="mt-4 text-lg font-medium">Drop updated lender workbook</div><div className="mt-2 text-sm text-slate-500">Supports .xlsx ingestion, field mapping, validation, and version history.</div><Button className="mt-5 rounded-2xl bg-slate-950 text-white hover:bg-slate-800">Select spreadsheet</Button></div>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                  <CardHeader><CardTitle>Detected schema</CardTitle><CardDescription>Preview of workbook fields powering the dashboard and matching engine</CardDescription></CardHeader>
                  <CardContent><div className="flex flex-wrap gap-2">{["Program Name", "Lender Name", "Minimum Loan Size", "Maximum Loan Size", "Max LTV", "Min DSCR", "Target States", "Apartments", "Office", "Recourse (BF)", "Source Tag"].map((field) => <Badge key={field} variant="outline" className="rounded-full px-3 py-1">{field}</Badge>)}</div><div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Spreadsheet lenders and dashboard-added lenders can coexist in one database with a source tag.</div></CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
