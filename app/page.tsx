"use client";
import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Building2, FileSpreadsheet, Filter, Gauge, Landmark, Plus, Search, ShieldCheck, Upload, Users, Trash2, ChevronRight, ChevronLeft, CheckCircle, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type LenderRecord = {
  id: number; source: string; spreadsheetRow: string; program: string; lender: string;
  type: string; minLoan: string; maxLoan: string; maxLtv: string; minDscr: string;
  states: string[]; assets: string[]; status: string; email: string; phone: string; recourse: string;
};

type RetailUnit = { id: number; tenant: string; rent: string; sqft: string; };

type AssetData = {
  id: number;
  ownershipStatus: string; dealType: string; refinanceType: string; assetType: string;
  loanAmount: string; seniorLoanAmount: string; subordinateAmount: string;
  propertyValue: string; purchasePrice: string; currentLoanAmount: string;
  landCost: string; softCosts: string; originationClosingCosts: string;
  hardCosts: string; carryingCosts: string; borrowerEquity: string;
  ltvMode: string; currentNetIncome: string; manualLtv: string; dscr: string;
  selectedStates: string[]; recourseType: string;
  numUnits: string; numBuildings: string; numAcres: string;
  retailUnits: RetailUnit[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const seedLenders: LenderRecord[] = [
  { id: 1, source: "Spreadsheet", spreadsheetRow: "A2", program: "Bridge Lending Program", lender: "Apex Credit Partners", type: "Senior", minLoan: "$3,000,000", maxLoan: "$35,000,000", maxLtv: "75%", minDscr: "1.20x", states: ["FL", "GA", "TX"], assets: ["Apartments", "Mixed Use", "Retail - Multi Tenant"], status: "Active", email: "originations@apexcp.com", phone: "(305) 555-0101", recourse: "FULL" },
  { id: 2, source: "Spreadsheet", spreadsheetRow: "A3", program: "Transitional CRE", lender: "Harborline Capital", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$80,000,000", maxLtv: "80%", minDscr: "1.05x", states: ["NY", "FL", "NJ", "IL"], assets: ["Office", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "deals@harborline.com", phone: "(212) 555-0142", recourse: "NON RECOURSE" },
  { id: 3, source: "Spreadsheet", spreadsheetRow: "A4", program: "Value-Add Multifamily", lender: "Northgate Real Estate Credit", type: "Preferred Equity", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "1.10x", states: ["FL", "NC", "SC", "TN"], assets: ["Apartments", "Student Housing", "SFR Portfolio"], status: "Review", email: "placements@northgatecredit.com", phone: "(704) 555-0198", recourse: "SELECTIVE" },
  { id: 4, source: "Spreadsheet", spreadsheetRow: "A5", program: "Construction Capital", lender: "BlueRidge Finance", type: "JV Equity", minLoan: "$15,000,000", maxLoan: "$125,000,000", maxLtv: "70%", minDscr: "N/A", states: ["FL", "TX", "AZ", "NV"], assets: ["Land", "Condos", "Other"], status: "Active", email: "capitalmarkets@blueridgefin.com", phone: "(214) 555-0117", recourse: "" },
  { id: 5, source: "Spreadsheet", spreadsheetRow: "A6", program: "Sponsor Credit Facility", lender: "Summit Specialty Lending", type: "Line of Credit", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "65%", minDscr: "1.25x", states: ["Nationwide"], assets: ["Mixed Use", "Retail - Multi Tenant", "Lt Industrial"], status: "Inactive", email: "sponsors@summitsl.com", phone: "(615) 555-0133", recourse: "CASE BY CASE" },
];

const assetTypes = ["Equipment, Autos, or Other Non Real Estate Products", "Apartments", "Condos", "Senior Housing", "Student Housing", "Gaming", "Assisted Living", "Education Related", "SFR Portfolio", "Mobile Home Park", "Co-living", "Office", "Medical Office", "Manufacturing", "Mixed Use", "Lt Industrial", "Cannabis", "Retail - Multi Tenant", "Retail - Single Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Religious", "Hospital/Health Care", "Distressed Debt", "Other"];
const capitalTypes = ["Senior", "Mezzanine", "Preferred Equity", "JV Equity", "Line of Credit", "Note on Note", "Loan Sales"];
const dealTypes = ["Construction", "Value add", "New Development", "Bridge", "Takeout", "Investment", "C&I"];
const ownershipStatuses = ["Acquisition", "Refinance"];
const refinanceTypes = ["Cash Out to Borrower", "Cash Out-Value Add", "Rate and Term"];
const recourseOptions = ["FULL", "NON RECOURSE", "CASE BY CASE"];
const marketOptions = ["US", "INTERNATIONAL"];
const allStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const unitAssets = ["Apartments", "Condos", "Hotel/Hospitality", "Gaming"];
const retailAssets = ["Retail - Multi Tenant", "Retail - Single Tenant"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function blankAsset(id: number): AssetData {
  return {
    id, ownershipStatus: "Acquisition", dealType: "Value add", refinanceType: "Cash Out to Borrower",
    assetType: "Apartments", loanAmount: "", seniorLoanAmount: "", subordinateAmount: "",
    propertyValue: "", purchasePrice: "", currentLoanAmount: "",
    landCost: "", softCosts: "", originationClosingCosts: "", hardCosts: "", carryingCosts: "", borrowerEquity: "",
    ltvMode: "AUTO", currentNetIncome: "", manualLtv: "", dscr: "",
    selectedStates: [], recourseType: "CASE BY CASE",
    numUnits: "", numBuildings: "", numAcres: "", retailUnits: [{ id: 1, tenant: "", rent: "", sqft: "" }],
  };
}

function createBlankLender(nextId: number): LenderRecord {
  return { id: nextId, source: "Dashboard", spreadsheetRow: "—", program: "", lender: "", type: "Senior", minLoan: "$1,000,000", maxLoan: "$25,000,000", maxLtv: "75%", minDscr: "1.20x", states: [], assets: [], status: "Active", email: "", phone: "", recourse: "CASE BY CASE" };
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
  const curLoanAmt = parseCurrency(asset.currentLoanAmount);
  const newLoanAmt = parseCurrency(asset.loanAmount);
  const totalCap = isSubCap ? seniorAmt + effectiveAmt : effectiveAmt;
  const seniorLtv = propVal > 0 ? (newLoanAmt / propVal) * 100 : 0;
  const autoLtv = propVal > 0 ? (totalCap / propVal) * 100 : 0;
  const currentLtv = asset.ltvMode === "MANUAL" ? Number(asset.manualLtv || 0) : autoLtv;
  const equityPct = propVal > 0 ? (parseCurrency(asset.borrowerEquity) / propVal) * 100 : 0;
  const cashOut = Math.max(0, newLoanAmt - curLoanAmt);
  const seniorLtc = purchaseVal > 0 ? (newLoanAmt / purchaseVal) * 100 : 0;
  return { effectiveAmt, totalCap, seniorLtv, autoLtv, currentLtv, equityPct, cashOut, seniorLtc, isSubCap, isConstruction, isAcquisition, isRefinance, isAcqNonConst, acqConstLoan };
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

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

// ─── AssetForm ────────────────────────────────────────────────────────────────

function AssetForm({
  asset, capitalType, onUpdate, tenantDatabase, onTenantAdd, inputClass, selectTriggerClass,
}: {
  asset: AssetData; capitalType: string; onUpdate: (updated: AssetData) => void;
  tenantDatabase: string[]; onTenantAdd: (name: string) => void;
  inputClass: string; selectTriggerClass: string;
}) {
  const m = calcMetrics(asset, capitalType);

  function upd(field: keyof AssetData, value: any) { onUpdate({ ...asset, [field]: value }); }
  function updRetail(id: number, field: keyof RetailUnit, value: string) {
    const units = asset.retailUnits.map((u) => u.id === id ? { ...u, [field]: value } : u);
    onUpdate({ ...asset, retailUnits: units });
    if (field === "tenant" && value.trim().length > 2) onTenantAdd(value.trim());
  }

  const showUnits = unitAssets.includes(asset.assetType);
  const showRetail = retailAssets.includes(asset.assetType);
  const showAcres = asset.assetType === "Land";

  const metricBoxes: [string, string][] = [];
  metricBoxes.push(["Senior LTV", formatPercent(m.seniorLtv)]);
  if (m.isAcqNonConst && parseCurrency(asset.purchasePrice) > 0) metricBoxes.push(["Senior LTC", formatPercent(m.seniorLtc)]);
  if (m.isRefinance) metricBoxes.push(["Cash Out", formatCurrencyInput(String(m.cashOut))]);
  metricBoxes.push([m.isSubCap ? "Subordinated LTV - Last Dollar" : "Subordinated Last $ LTV", m.isSubCap ? formatPercent(m.autoLtv) : "N/A"]);
  metricBoxes.push(["Total Capital", formatCurrencyInput(String(m.totalCap || 0))]);
  metricBoxes.push(["Equity %", formatPercent(m.equityPct)]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Ownership Status</label><Select value={asset.ownershipStatus} onValueChange={(v) => upd("ownershipStatus", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{ownershipStatuses.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Deal Type</label><Select value={asset.dealType} onValueChange={(v) => upd("dealType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{dealTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>

      {asset.ownershipStatus === "Refinance" && (
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Refinance Type</label><Select value={asset.refinanceType} onValueChange={(v) => upd("refinanceType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{refinanceTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      )}

      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Asset Type</label><Select value={asset.assetType} onValueChange={(v) => upd("assetType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{assetTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>

      {showUnits && (<>
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Units</label><Input value={asset.numUnits} onChange={(e) => upd("numUnits", e.target.value)} placeholder="e.g. 120" className={inputClass} /></div>
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Buildings</label><Input value={asset.numBuildings} onChange={(e) => upd("numBuildings", e.target.value)} placeholder="e.g. 4" className={inputClass} /></div>
      </>)}

      {showAcres && (
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Acres</label><Input value={asset.numAcres} onChange={(e) => upd("numAcres", e.target.value)} placeholder="e.g. 12.5" className={inputClass} /></div>
      )}

      {showRetail && (
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-500 font-bold uppercase">Retail Units</label>
            <button onClick={() => onUpdate({ ...asset, retailUnits: [...asset.retailUnits, { id: asset.retailUnits.length + 1, tenant: "", rent: "", sqft: "" }] })} className="flex items-center gap-1 px-3 py-1 text-xs bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80"><Plus className="h-3 w-3" /> Add Unit</button>
          </div>
          <div className="space-y-3">
            {asset.retailUnits.map((unit, idx) => (
              <div key={unit.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#0a1f44]">Unit {idx + 1}</span>
                  {asset.retailUnits.length > 1 && <button onClick={() => onUpdate({ ...asset, retailUnits: asset.retailUnits.filter((u) => u.id !== unit.id) })} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tenant Name</label>
                    <input list={`tenants-${unit.id}`} value={unit.tenant} onChange={(e) => updRetail(unit.id, "tenant", e.target.value)} placeholder="Tenant name" className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44]" />
                    <datalist id={`tenants-${unit.id}`}>{tenantDatabase.map((t) => <option key={t} value={t} />)}</datalist>
                  </div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Monthly Rent</label><Input value={unit.rent} onChange={(e) => updRetail(unit.id, "rent", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Square Footage</label><Input value={unit.sqft} onChange={(e) => updRetail(unit.id, "sqft", e.target.value)} placeholder="e.g. 2,400" className={inputClass} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {m.isRefinance && (
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Loan Amount</label><Input value={asset.currentLoanAmount} onChange={(e) => upd("currentLoanAmount", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
      )}
      {m.isAcqNonConst && (
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Purchase Price</label><Input value={asset.purchasePrice} onChange={(e) => upd("purchasePrice", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div>
      )}

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

      {!m.isSubCap && !(m.isConstruction && m.isAcquisition) && (
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{m.isRefinance ? "New Loan Amount" : "Loan Amount"}</label><Input value={asset.loanAmount} onChange={(e) => upd("loanAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      )}

      {m.isSubCap && (<>
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Senior Loan Amount</label><Input value={asset.seniorLoanAmount} onChange={(e) => upd("seniorLoanAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
        <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">{subordinateLabel(capitalType)}</label><Input value={asset.subordinateAmount} onChange={(e) => upd("subordinateAmount", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">Stack: Senior {asset.seniorLoanAmount || "$0"} + {subordinateLabel(capitalType)} {asset.subordinateAmount || "$0"}</div>
      </>)}

      <div className="md:col-span-2">
        <label className="text-xs text-gray-500 mb-2 block font-medium uppercase">States</label>
        <div className="mb-2 flex gap-2">
          <button onClick={() => upd("selectedStates", allStates)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">Select All</button>
          <button onClick={() => upd("selectedStates", [])} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">Clear</button>
        </div>
        <div className="grid max-h-32 grid-cols-6 gap-1.5 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
          {allStates.map((s) => (<label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={asset.selectedStates.includes(s)} onChange={() => upd("selectedStates", asset.selectedStates.includes(s) ? asset.selectedStates.filter((x) => x !== s) : [...asset.selectedStates, s])} className="accent-[#0a1f44]" /><span className="text-gray-600">{s}</span></label>))}
        </div>
      </div>

      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Property Value / ARV</label><Input value={asset.propertyValue} onChange={(e) => upd("propertyValue", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">LTV Mode</label><Select value={asset.ltvMode} onValueChange={(v) => upd("ltvMode", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTO">Auto Calculate</SelectItem><SelectItem value="MANUAL">Manual Entry</SelectItem></SelectContent></Select></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Current Net Income</label><Input value={asset.currentNetIncome} onChange={(e) => upd("currentNetIncome", formatCurrencyInput(e.target.value))} className={inputClass} /></div>
      {asset.ltvMode === "MANUAL"
        ? <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Manual LTV</label><Input value={asset.manualLtv} onChange={(e) => upd("manualLtv", e.target.value)} className={inputClass} /></div>
        : <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Calculated LTV</label><div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-[#0a1f44]">{formatPercent(m.autoLtv)}</div></div>
      }
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">DSCR</label><Input value={asset.dscr} onChange={(e) => upd("dscr", e.target.value)} className={inputClass} /></div>
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Recourse</label><Select value={asset.recourseType} onValueChange={(v) => upd("recourseType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{recourseOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>

      <div className="md:col-span-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(metricBoxes.length, 3)}, 1fr)` }}>
        {metricBoxes.map(([label, val]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">{label}</div>
            <div className="text-sm font-bold text-[#0a1f44]">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const navItems: [string, string, any][] = [
  ["overview", "Overview", Gauge], ["lenders", "Lender Programs", Landmark],
  ["matcher", "Deal Matcher", Filter], ["uploads", "Upload Center", FileSpreadsheet],
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
  const [tenantDatabase, setTenantDatabase] = useState<string[]>([]);

  // ─── Matcher wizard state ─────────────────────────────────────────────────
  // Steps: "start" | "asset-count" | "asset-form" | "review" | "results"
  const [matcherStep, setMatcherStep] = useState<"start" | "asset-count" | "asset-form" | "review" | "results">("start");
  const [marketScope, setMarketScope] = useState("US");
  const [capitalType, setCapitalType] = useState("Senior");
  const [assetMode, setAssetMode] = useState<"single" | "multiple" | "">(""); // single or multiple
  const [assetCount, setAssetCount] = useState("2");
  const [collateralMode, setCollateralMode] = useState<"crossed" | "separate" | "">(""); // crossed or separate
  const [assets, setAssets] = useState<AssetData[]>([blankAsset(1)]);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [reviewEditIndex, setReviewEditIndex] = useState<number | null>(null);

  function addTenant(name: string) { setTenantDatabase((prev) => prev.includes(name) ? prev : [...prev, name]); }
  function updateAsset(updated: AssetData) { setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a)); }

  function handleAssetModeSelect(mode: "single" | "multiple") {
    setAssetMode(mode);
    if (mode === "single") {
      setAssets([blankAsset(1)]);
      setCurrentAssetIndex(0);
      setMatcherStep("asset-form");
    } else {
      setMatcherStep("asset-count");
    }
  }

  function handleAssetCountConfirm() {
    const count = Math.max(2, Math.min(20, parseInt(assetCount) || 2));
    setAssets(Array.from({ length: count }, (_, i) => blankAsset(i + 1)));
    setCurrentAssetIndex(0);
    setMatcherStep("asset-form");
  }

  function handleNextAsset() {
    if (currentAssetIndex < assets.length - 1) {
      setCurrentAssetIndex((i) => i + 1);
    } else {
      setMatcherStep("review");
    }
  }

  function handlePrevAsset() {
    if (currentAssetIndex > 0) setCurrentAssetIndex((i) => i - 1);
  }

  function resetMatcher() {
    setMatcherStep("start");
    setAssetMode("");
    setCollateralMode("");
    setAssets([blankAsset(1)]);
    setCurrentAssetIndex(0);
    setReviewEditIndex(null);
  }

  // ─── Matching engine ──────────────────────────────────────────────────────

  const matchResults = useMemo(() => {
    if (matcherStep !== "results") return [];
    if (marketScope === "INTERNATIONAL") return [];

    if (collateralMode === "crossed" || assetMode === "single") {
      // Combined: sum all loan amounts, find best matching asset type
      const totalLoan = assets.reduce((sum, a) => {
        const m = calcMetrics(a, capitalType);
        return sum + m.effectiveAmt;
      }, 0);
      const primaryAsset = assets[0];
      const allSelectedStates = [...new Set(assets.flatMap((a) => a.selectedStates))];
      return lenderRecords.map((l) => {
        let score = 0;
        const nr = normalizeRecourse(l.recourse);
        if (totalLoan >= parseCurrency(l.minLoan) && totalLoan <= parseCurrency(l.maxLoan)) score += 30;
        if (l.assets.includes(primaryAsset.assetType)) score += 22;
        if (l.type === capitalType) score += 20;
        if (allSelectedStates.some((s) => l.states.includes(s)) || l.states.includes("Nationwide")) score += 15;
        if (nr === primaryAsset.recourseType || nr === "CASE BY CASE") score += 10;
        return { ...l, score, nr, label: "Combined Portfolio" };
      }).filter((l) => l.score > 30).sort((a, b) => b.score - a.score).slice(0, 4);
    } else {
      // Separate: match each asset independently
      return assets.flatMap((asset) => {
        const m = calcMetrics(asset, capitalType);
        return lenderRecords.map((l) => {
          let score = 0;
          const nr = normalizeRecourse(l.recourse);
          if (m.effectiveAmt >= parseCurrency(l.minLoan) && m.effectiveAmt <= parseCurrency(l.maxLoan)) score += 30;
          if (l.assets.includes(asset.assetType)) score += 22;
          if (l.type === capitalType) score += 20;
          if (asset.selectedStates.some((s) => l.states.includes(s)) || l.states.includes("Nationwide")) score += 15;
          if (nr === asset.recourseType || nr === "CASE BY CASE") score += 10;
          return { ...l, score, nr, label: `Asset ${asset.id} — ${asset.assetType}` };
        }).filter((l) => l.score > 30).sort((a, b) => b.score - a.score).slice(0, 3).map((r) => ({ ...r, assetId: asset.id }));
      });
    }
  }, [matcherStep, assets, capitalType, marketScope, collateralMode, assetMode, lenderRecords]);

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

  // ─── Render ───────────────────────────────────────────────────────────────

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

          {/* Sidebar */}
          <aside className="border-r border-[#c9a84c]/10 bg-[#0a1f44] flex flex-col">
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

          {/* Main */}
          <main className="p-6 md:p-8 overflow-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-[#0a1f44] font-bold">Institutional Workflow</div>
                  <h1 className="font-display text-4xl font-bold text-[#0a1f44] mt-1">Lender Dashboard</h1>
                  <p className="mt-1 text-sm text-gray-500">The Premier Capital Search Tool By CapMoon, A Cogent Company</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 text-sm font-medium text-[#0a1f44] border border-[#0a1f44]/30 rounded-xl hover:bg-[#0a1f44]/10 transition-all">Export Lender Set</button>
                  <button onClick={() => { setActiveTab("lenders"); setShowAddLender(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">
                    <Plus className="h-4 w-4" /> Add Lender
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <StatCard title="Total Lenders" value={String(lenderRecords.length)} detail="Spreadsheet + dashboard records" icon={Building2} />
                <StatCard title="Spreadsheet" value={String(spreadsheetCount)} detail="Imported criteria rows" icon={FileSpreadsheet} />
                <StatCard title="Dashboard Added" value={String(dashboardCount)} detail="Created manually" icon={Users} />
                <StatCard title="Capital Types" value={String(capitalTypes.length)} detail="Senior · Mezz · Pref · JV · LOC · Note" icon={BarChart3} />
              </div>

              {/* ── Overview ── */}
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

              {/* ── Lenders ── */}
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
                      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-[#0a1f44]" /></div>
                      <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Sources</SelectItem><SelectItem value="Spreadsheet">Spreadsheet</SelectItem><SelectItem value="Dashboard">Dashboard</SelectItem></SelectContent></Select>
                      <Select value={selectedCapitalFilter} onValueChange={setSelectedCapitalFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Capital</SelectItem>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[`Spreadsheet: ${spreadsheetCount}`, `Dashboard: ${dashboardCount}`, `Showing: ${lenderRecords.filter((l) => (selectedSourceFilter === "All" || l.source === selectedSourceFilter) && (selectedCapitalFilter === "All" || l.type === selectedCapitalFilter) && (selectedStatusFilter === "All" || l.status === selectedStatusFilter) && (search === "" || l.lender.toLowerCase().includes(search.toLowerCase()) || l.program.toLowerCase().includes(search.toLowerCase()))).length}`].map((t) => (
                        <span key={t} className="px-3 py-1 rounded-full text-xs border border-[#c9a84c]/30 text-[#c9a84c] font-bold">{t}</span>
                      ))}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <Table>
                        <TableHeader><TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">{["Source","Row","Lender","Program","Capital","Phone","Status",""].map((h) => <TableHead key={h} className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">{h}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>
                          {lenderRecords.filter((l) => (selectedSourceFilter === "All" || l.source === selectedSourceFilter) && (selectedCapitalFilter === "All" || l.type === selectedCapitalFilter) && (selectedStatusFilter === "All" || l.status === selectedStatusFilter) && (search === "" || l.lender.toLowerCase().includes(search.toLowerCase()) || l.program.toLowerCase().includes(search.toLowerCase()))).map((item) => (
                            <TableRow key={item.id} className="border-gray-100 hover:bg-gray-50">
                              <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.source === "Spreadsheet" ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>{item.source}</span></TableCell>
                              <TableCell className="text-gray-400 text-xs">{item.spreadsheetRow}</TableCell>
                              <TableCell className="font-semibold text-[#0a1f44] text-sm">{item.lender}</TableCell>
                              <TableCell className="text-gray-600 text-xs">{item.program}</TableCell>
                              <TableCell className="text-gray-600 text-xs">{item.type}</TableCell>
                              <TableCell className="text-gray-400 text-xs">{item.phone || "—"}</TableCell>
                              <TableCell><span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500">{item.status}</span></TableCell>
                              <TableCell className="text-right"><div className="flex justify-end gap-2"><button onClick={() => setEditingLenderId(item.id === editingLenderId ? null : item.id)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">{item.id === editingLenderId ? "Close" : "Edit"}</button><button onClick={() => toggleLenderStatus(item.id)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">{item.status === "Inactive" ? "Activate" : "Deactivate"}</button></div></TableCell>
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
                          <button onClick={saveNewLender} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Save Lender</button>
                          <button onClick={() => setNewLender(createBlankLender(lenderRecords.length + 1))} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Reset</button>
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
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Capital Type</label><Select value={lender.type} onValueChange={(v) => updateLenderField(lender.id, "type", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Status</label><Select value={lender.status} onValueChange={(v) => updateLenderField(lender.id, "status", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Email</label><Input value={lender.email || ""} onChange={(e) => updateLenderField(lender.id, "email", e.target.value)} className={inputClass} /></div>
                              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Phone</label><Input value={lender.phone || ""} onChange={(e) => updateLenderField(lender.id, "phone", e.target.value)} className={inputClass} /></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => setEditingLenderId(null)} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Done</button>
                              <button onClick={() => toggleLenderStatus(lender.id)} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">{lender.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-3">
                        {[["Edit Lenders", "Click Edit on any row to update lender details."], ["Deactivate Lenders", "Deactivate without deleting — stays in registry."], ["Row Mapping", "Spreadsheet lenders retain row mapping like A2–A717."]].map(([title, desc]) => (
                          <div key={String(title)} className="rounded-xl border border-gray-200 bg-gray-50 p-4"><div className="text-sm font-bold text-[#0a1f44] mb-1">{title}</div><div className="text-xs text-gray-500">{desc}</div></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Deal Matcher ── */}
              {activeTab === "matcher" && (
                <div>
                  {/* Progress indicator */}
                  {matcherStep !== "start" && (
                    <div className="flex items-center gap-2 mb-6">
                      {["Setup", assetMode === "multiple" ? "Asset Count" : null, "Asset Details", "Review", "Results"].filter(Boolean).map((step, idx, arr) => (
                        <React.Fragment key={String(step)}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < arr.indexOf(matcherStep === "asset-count" ? "Asset Count" : matcherStep === "asset-form" ? "Asset Details" : matcherStep === "review" ? "Review" : "Results")? "bg-[#0a1f44] text-white" : "bg-gray-200 text-gray-500"}`}>{idx + 1}</div>
                            <span className="text-xs text-gray-500 font-medium">{step}</span>
                          </div>
                          {idx < arr.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                        </React.Fragment>
                      ))}
                      <button onClick={resetMatcher} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Start Over</button>
                    </div>
                  )}

                  {/* STEP 1: Market + Capital Type */}
                  {matcherStep === "start" && (
                    <div className="max-w-2xl">
                      <div className={cardClass + " p-8"}>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Deal Matcher</div>
                        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Let's get started</h2>
                        <p className="text-sm text-gray-500 mb-8">First, tell us your market and capital type.</p>
                        <div className="grid gap-5 md:grid-cols-2 mb-8">
                          <div>
                            <label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wide">Market</label>
                            <Select value={marketScope} onValueChange={setMarketScope}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{marketOptions.map((i) => <SelectItem key={i} value={i}>{i === "US" ? "US" : "International"}</SelectItem>)}</SelectContent></Select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wide">Capital Type</label>
                            <Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
                          </div>
                        </div>
                        {marketScope === "INTERNATIONAL" ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 mb-6">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>
                        ) : (
                          <>
                            <div className="mb-6">
                              <label className="text-xs text-gray-500 mb-3 block font-bold uppercase tracking-wide">Is this one asset or multiple assets?</label>
                              <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleAssetModeSelect("single")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "single" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}>
                                  <div className="text-sm font-bold text-[#0a1f44]">Single Asset</div>
                                  <div className="text-xs text-gray-500 mt-1">One property or collateral</div>
                                </button>
                                <button onClick={() => handleAssetModeSelect("multiple")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "multiple" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}>
                                  <div className="text-sm font-bold text-[#0a1f44]">Multiple Assets</div>
                                  <div className="text-xs text-gray-500 mt-1">Portfolio or pool of assets</div>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Asset count + collateral mode */}
                  {matcherStep === "asset-count" && (
                    <div className="max-w-2xl">
                      <div className={cardClass + " p-8"}>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Multiple Assets</div>
                        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Portfolio Setup</h2>
                        <p className="text-sm text-gray-500 mb-8">Tell us how many assets and how they should be treated.</p>
                        <div className="space-y-6">
                          <div>
                            <label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wide">How many assets in total?</label>
                            <Input value={assetCount} onChange={(e) => setAssetCount(e.target.value)} type="number" min="2" max="20" placeholder="e.g. 3" className={inputClass + " max-w-xs"} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-3 block font-bold uppercase tracking-wide">How should these assets be treated?</label>
                            <Select value={collateralMode} onValueChange={(v) => setCollateralMode(v as "crossed" | "separate")}>
                              <SelectTrigger className={selectTriggerClass + " max-w-xs"}><SelectValue placeholder="Select treatment..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="crossed">Crossed Collateral</SelectItem>
                                <SelectItem value="separate">Treated Separately</SelectItem>
                              </SelectContent>
                            </Select>
                            {collateralMode === "crossed" && <p className="text-xs text-gray-500 mt-2">All assets will be combined and matched as a single portfolio loan.</p>}
                            {collateralMode === "separate" && <p className="text-xs text-gray-500 mt-2">Each asset will be matched independently with its own lender results.</p>}
                          </div>
                          <button onClick={() => setMatcherStep("start")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">
  <ChevronLeft className="h-4 w-4" /> Previous
</button>
                          <button onClick={handleAssetCountConfirm} disabled={!collateralMode} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            Continue to Asset Details <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Asset form */}
                  {matcherStep === "asset-form" && (
                    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                      <div className={cardClass + " p-6"}>
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">
                              {assets.length > 1 ? `Asset ${currentAssetIndex + 1} of ${assets.length}` : "Asset Details"}
                            </div>
                            <h2 className="font-display text-2xl font-bold text-[#0a1f44]">
                              {assets.length > 1 ? `Enter details for Asset ${currentAssetIndex + 1}` : "Enter deal details"}
                            </h2>
                          </div>
                          {assets.length > 1 && (
                            <div className="flex gap-1">
                              {assets.map((_, idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentAssetIndex ? "bg-[#0a1f44]" : idx < currentAssetIndex ? "bg-[#c9a84c]" : "bg-gray-300"}`} />
                              ))}
                            </div>
                          )}
                        </div>

                        <AssetForm
                          asset={assets[currentAssetIndex]}
                          capitalType={capitalType}
                          onUpdate={updateAsset}
                          tenantDatabase={tenantDatabase}
                          onTenantAdd={addTenant}
                          inputClass={inputClass}
                          selectTriggerClass={selectTriggerClass}
                        />

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                          <button onClick={() => { if (currentAssetIndex === 0) { setMatcherStep(assetMode === "multiple" ? "asset-count" : "start"); } else { handlePrevAsset(); } }}className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronLeft className="h-4 w-4" /> Previous
                          </button>
                          <button onClick={handleNextAsset} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
                            {currentAssetIndex < assets.length - 1 ? (<>Next Asset <ChevronRight className="h-4 w-4" /></>) : (<>Review & Confirm <CheckCircle className="h-4 w-4" /></>)}
                          </button>
                        </div>
                      </div>

                      {/* Mini summary sidebar */}
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
                                    {a.loanAmount && <div className="text-xs font-semibold text-[#c9a84c] mt-1">{a.loanAmount}</div>}
                                  </div>
                                  {idx < currentAssetIndex && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                                  {idx === currentAssetIndex && <div className="w-2 h-2 rounded-full bg-[#0a1f44]" />}
                                </div>
                              </div>
                            ))}
                          </div>
                          {collateralMode && (
                            <div className="mt-4 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-3">
                              <div className="text-xs font-bold text-[#0a1f44] mb-1">Treatment</div>
                              <div className="text-xs text-gray-500">{collateralMode === "crossed" ? "Crossed Collateral — assets combined" : "Treated Separately — individual matching"}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4: Review */}
                  {matcherStep === "review" && (
                    <div className="max-w-4xl">
                      <div className={cardClass + " p-8"}>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Final Review</div>
                        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Review & Confirm</h2>
                        <p className="text-sm text-gray-500 mb-8">Review all assets below. Click any asset to edit, then approve to run the match.</p>

                        <div className="grid gap-4 md:grid-cols-2 mb-8">
                          {assets.map((asset, idx) => {
                            const m = calcMetrics(asset, capitalType);
                            return (
                              <div key={asset.id} className={`rounded-xl border-2 p-5 transition-all ${reviewEditIndex === idx ? "border-[#0a1f44]" : "border-gray-200 hover:border-[#0a1f44]/30"}`}>
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Asset {idx + 1}</div>
                                    <div className="text-base font-bold text-[#0a1f44]">{asset.assetType}</div>
                                    <div className="text-xs text-gray-500">{asset.ownershipStatus} · {asset.dealType}</div>
                                  </div>
                                  <button onClick={() => { setReviewEditIndex(idx === reviewEditIndex ? null : idx); setCurrentAssetIndex(idx); setMatcherStep("asset-form"); }} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">
                                    <Edit2 className="h-3 w-3" /> Edit
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {[["Loan Amount", asset.loanAmount || "—"], ["Property Value", asset.propertyValue || "—"], ["Senior LTV", formatPercent(m.seniorLtv)], ["States", asset.selectedStates.length > 0 ? asset.selectedStates.slice(0, 3).join(", ") + (asset.selectedStates.length > 3 ? `+${asset.selectedStates.length - 3}` : "") : "None"]].map(([label, val]) => (
                                    <div key={String(label)} className="rounded-lg bg-gray-50 p-2">
                                      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                                      <div className="text-xs font-bold text-[#0a1f44]">{val}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 mb-6 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-[#0a1f44]">{assets.length} asset{assets.length > 1 ? "s" : ""} · {capitalType}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{collateralMode === "crossed" ? "Crossed Collateral — matching as combined portfolio" : collateralMode === "separate" ? "Treated Separately — individual lender results per asset" : "Single asset"}</div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
<div className="flex gap-3">
  <button onClick={() => setMatcherStep("start")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">
    <ChevronLeft className="h-4 w-4" /> Previous
  </button>
  <button onClick={handleAssetCountConfirm} disabled={!collateralMode} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
    Continue to Asset Details <ChevronRight className="h-4 w-4" />
  </button>
</div>
                        <div className="flex gap-3">
                          <button onClick={() => { setCurrentAssetIndex(0); setMatcherStep("asset-form"); }} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">
                            <ChevronLeft className="h-4 w-4" /> Back to Assets
                          </button>
                          <button onClick={() => setMatcherStep("results")} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
                            Run Lender Match <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Results */}
                  {matcherStep === "results" && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">Match Results</div>
                          <h2 className="font-display text-3xl font-bold text-[#0a1f44]">Ranked Output</h2>
                          <p className="text-sm text-gray-500 mt-1">{collateralMode === "crossed" ? "Combined portfolio matching" : collateralMode === "separate" ? "Individual asset matching" : "Single asset matching"}</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setMatcherStep("review")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Back to Review</button>
                          <button onClick={resetMatcher} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">New Deal</button>
                        </div>
                      </div>

                      {matchResults.length === 0 ? (
                        <div className={cardClass + " p-8 text-center"}>
                          <div className="text-lg font-bold text-[#0a1f44] mb-2">No matches found</div>
                          <div className="text-sm text-gray-500">Try adjusting your deal criteria or add more lenders to the registry.</div>
                        </div>
                      ) : collateralMode === "separate" && assetMode === "multiple" ? (
                        // Group results by asset
                        assets.map((asset) => {
                          const assetMatches = matchResults.filter((r: any) => r.assetId === asset.id);
                          return (
                            <div key={asset.id} className="mb-6">
                              <div className="text-sm font-bold text-[#0a1f44] mb-3 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#0a1f44] text-white flex items-center justify-center text-xs font-bold">{asset.id}</div>
                                Asset {asset.id} — {asset.assetType} · {asset.loanAmount || "—"}
                              </div>
                              {assetMatches.length === 0 ? (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">No matches for this asset.</div>
                              ) : (
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {assetMatches.map((match: any) => (
                                    <div key={match.id + "-" + asset.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#0a1f44]/30 transition-all">
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        <div>
                                          <div className="text-sm font-bold text-[#0a1f44]">{match.lender}</div>
                                          <div className="text-xs text-gray-500 mt-0.5">{match.program}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <div className="text-xs text-gray-400">Match</div>
                                          <div className="text-lg font-bold text-[#0a1f44]">{match.score}%</div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[["Capital", match.type], ["Contact", match.email || "—"]].map(([label, val]) => (
                                          <div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                                            <div className="text-xs uppercase text-[#0a1f44] font-bold mb-0.5">{label}</div>
                                            <div className="text-xs text-gray-600 break-all">{val}</div>
                                          </div>
                                        ))}
                                      </div>
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
                              <div className="flex items-start justify-between gap-2 mb-4">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">#{idx + 1} Match</div>
                                  <div className="text-base font-bold text-[#0a1f44]">{match.lender}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{match.program}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xs text-gray-400">Match score</div>
                                  <div className="text-2xl font-bold text-[#0a1f44]">{match.score}%</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {[["Capital", match.type], ["Range", `${match.minLoan}–${match.maxLoan}`], ["Recourse", match.nr], ["Contact", match.email || "—"]].map(([label, val]) => (
                                  <div key={String(label)} className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                                    <div className="text-xs uppercase text-[#0a1f44] font-bold mb-0.5">{label}</div>
                                    <div className="text-xs text-gray-600 break-all">{val}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Uploads ── */}
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
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">Spreadsheet lenders and dashboard-added lenders coexist in one database with a source tag.</div>
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
