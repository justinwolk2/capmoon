"use client";
import React, { useMemo, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Building2, FileSpreadsheet, Filter, Gauge, Landmark, Plus, Search, ShieldCheck, Upload, Users, Trash2, ChevronRight, ChevronLeft, CheckCircle, Edit2, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type LenderRecord = {
  id: number; source: string; spreadsheetRow: string; program: string; lender: string;
  type: string; minLoan: string; maxLoan: string; maxLtv: string; minDscr: string;
  states: string[]; assets: string[]; status: string; email: string; phone: string; recourse: string;
  contactPerson?: string; website?: string; sponsorStates?: string[]; loanTerms?: string;
  typeOfLoans?: string[]; programTypes?: string[];
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

type NewLenderForm = {
  programName: string; contactPerson: string; email: string; phone: string; website: string;
  typeOfLoans: string[]; programTypes: string[]; propertyTypes: string; loanTerms: string;
  minLoan: string; maxLoan: string; maxLtv: string; targetStates: string[];
  sponsorStates: string[]; recourse: string; capitalType: string; status: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const seedLenders: LenderRecord[] = [
  { id: 1, source: "Spreadsheet", spreadsheetRow: "A2", program: "Bridge Lending Program", lender: "Apex Credit Partners", type: "Senior", minLoan: "$3,000,000", maxLoan: "$35,000,000", maxLtv: "75%", minDscr: "1.20x", states: ["FL", "GA", "TX"], assets: ["Apartments", "Mixed Use", "Retail - Multi Tenant"], status: "Active", email: "originations@apexcp.com", phone: "(305) 555-0101", recourse: "FULL", contactPerson: "John Smith", website: "www.apexcp.com", typeOfLoans: ["Acquisition", "Value add"], programTypes: ["Small Balance"] },
  { id: 2, source: "Spreadsheet", spreadsheetRow: "A3", program: "Transitional CRE", lender: "Harborline Capital", type: "Mezzanine", minLoan: "$10,000,000", maxLoan: "$80,000,000", maxLtv: "80%", minDscr: "1.05x", states: ["NY", "FL", "NJ", "IL"], assets: ["Office", "Hotel/Hospitality", "Self-storage"], status: "Active", email: "deals@harborline.com", phone: "(212) 555-0142", recourse: "NON RECOURSE", contactPerson: "Sarah Lee", website: "www.harborline.com", typeOfLoans: ["Refinance", "Value add"], programTypes: ["Interest-only"] },
  { id: 3, source: "Spreadsheet", spreadsheetRow: "A4", program: "Value-Add Multifamily", lender: "Northgate Real Estate Credit", type: "Preferred Equity", minLoan: "$5,000,000", maxLoan: "$50,000,000", maxLtv: "85%", minDscr: "1.10x", states: ["FL", "NC", "SC", "TN"], assets: ["Apartments", "Student Housing", "SFR Portfolio"], status: "Review", email: "placements@northgatecredit.com", phone: "(704) 555-0198", recourse: "SELECTIVE", typeOfLoans: ["Acquisition", "New Development"], programTypes: ["Fannie/Freddie"] },
  { id: 4, source: "Spreadsheet", spreadsheetRow: "A5", program: "Construction Capital", lender: "BlueRidge Finance", type: "JV Equity", minLoan: "$15,000,000", maxLoan: "$125,000,000", maxLtv: "70%", minDscr: "N/A", states: ["FL", "TX", "AZ", "NV"], assets: ["Land", "Condos", "Other"], status: "Active", email: "capitalmarkets@blueridgefin.com", phone: "(214) 555-0117", recourse: "", typeOfLoans: ["Construction", "New Development"], programTypes: ["Construction", "Land"] },
  { id: 5, source: "Spreadsheet", spreadsheetRow: "A6", program: "Sponsor Credit Facility", lender: "Summit Specialty Lending", type: "Line of Credit", minLoan: "$2,000,000", maxLoan: "$20,000,000", maxLtv: "65%", minDscr: "1.25x", states: ["Nationwide"], assets: ["Mixed Use", "Retail - Multi Tenant", "Lt Industrial"], status: "Inactive", email: "sponsors@summitsl.com", phone: "(615) 555-0133", recourse: "CASE BY CASE", typeOfLoans: ["Refinance", "C&I"], programTypes: ["Small Balance"] },
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
const typeOfLoanOptions = ["Acquisition", "Construction", "Value add", "New Development", "Redevelopment", "Refinance", "Note on Note", "Loan Purchases", "C&I"];
const programTypeOptions = ["Refinance", "Acquisition", "Construction", "Land", "Fannie/Freddie", "HUD", "Small Balance", "Interest-only", "Cannabis"];

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

function blankLenderForm(): NewLenderForm {
  return {
    programName: "", contactPerson: "", email: "", phone: "", website: "",
    typeOfLoans: [], programTypes: [], propertyTypes: "", loanTerms: "",
    minLoan: "", maxLoan: "", maxLtv: "", targetStates: [], sponsorStates: [],
    recourse: "CASE BY CASE", capitalType: "Senior", status: "Active",
  };
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

// ─── AI Deal Parser ───────────────────────────────────────────────────────────

async function parseDeadWithAI(description: string, capitalTypeHint: string): Promise<Partial<AssetData>> {
  const systemPrompt = `You are a commercial real estate loan intake specialist. Parse the user's deal description and extract structured loan parameters. Return ONLY a valid JSON object with these exact fields (use empty string "" if not mentioned):
{
  "ownershipStatus": "Acquisition" or "Refinance",
  "dealType": one of ["Construction", "Value add", "New Development", "Bridge", "Takeout", "Investment", "C&I"],
  "assetType": one of ["Apartments", "Condos", "Senior Housing", "Student Housing", "Gaming", "Office", "Medical Office", "Manufacturing", "Mixed Use", "Lt Industrial", "Cannabis", "Retail - Multi Tenant", "Retail - Single Tenant", "Hotel/Hospitality", "Land", "Self-storage", "Other"],
  "loanAmount": dollar amount as string like "$15,000,000",
  "propertyValue": dollar amount as string like "$20,000,000",
  "selectedStates": array of 2-letter state codes like ["FL", "TX"],
  "recourseType": "FULL" or "NON RECOURSE" or "CASE BY CASE",
  "dscr": number as string like "1.25",
  "numUnits": number as string if mentioned,
  "numBuildings": number as string if mentioned
}
Only return the JSON. No explanation. No markdown. No backticks.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Parse this deal: ${description}. Capital type context: ${capitalTypeHint}` }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
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

// ─── CheckboxGroup ────────────────────────────────────────────────────────────

function CheckboxGroup({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; }) {
  function toggle(opt: string) { onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]); }
  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wide">{label}</label>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer group">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="accent-[#0a1f44] w-3.5 h-3.5" />
            <span className={`${selected.includes(opt) ? "text-[#0a1f44] font-semibold" : "text-gray-600"}`}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── StateSelector ────────────────────────────────────────────────────────────

function StateSelector({ label, selected, onChange }: { label: string; selected: string[]; onChange: (v: string[]) => void; }) {
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

// ─── AddLenderPage ────────────────────────────────────────────────────────────

function AddLenderPage({ onSave, onCancel, existingLenders, inputClass, selectTriggerClass }: {
  onSave: (form: NewLenderForm) => void; onCancel: () => void;
  existingLenders: LenderRecord[]; inputClass: string; selectTriggerClass: string;
}) {
  const [form, setForm] = useState<NewLenderForm>(blankLenderForm());
  const [matchMode, setMatchMode] = useState<Record<string, "manual" | "spreadsheet">>({
    programName: "manual", contactPerson: "manual", email: "manual", phone: "manual", website: "manual",
  });

  function upd(field: keyof NewLenderForm, value: any) { setForm((prev) => ({ ...prev, [field]: value })); }
  function toggleMatchMode(field: string) { setMatchMode((prev) => ({ ...prev, [field]: prev[field] === "manual" ? "spreadsheet" : "manual" })); }

  const spreadsheetSuggestions: Record<string, string[]> = {
    programName: [...new Set(existingLenders.map((l) => l.program))],
    contactPerson: [...new Set(existingLenders.map((l) => l.contactPerson || "").filter(Boolean))],
    email: [...new Set(existingLenders.map((l) => l.email).filter(Boolean))],
    phone: [...new Set(existingLenders.map((l) => l.phone).filter(Boolean))],
    website: [...new Set(existingLenders.map((l) => l.website || "").filter(Boolean))],
  };

  const matchableFields: [keyof NewLenderForm, string][] = [
    ["programName", "Program Name (Lender)"], ["contactPerson", "Contact Person"],
    ["email", "Email Address"], ["phone", "Phone Number"], ["website", "Website"],
  ];

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
                    <button type="button" onClick={() => toggleMatchMode(String(field))} className={`text-xs px-2 py-0.5 rounded-full border transition-all ${matchMode[String(field)] === "spreadsheet" ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0a1f44]/30"}`}>
                      {matchMode[String(field)] === "spreadsheet" ? "📋 Spreadsheet" : "✏️ Manual"}
                    </button>
                  </div>
                  {matchMode[String(field)] === "spreadsheet" ? (
                    <Select value={String(form[field])} onValueChange={(v) => upd(field, v)}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select from spreadsheet..." /></SelectTrigger>
                      <SelectContent>{(spreadsheetSuggestions[String(field)] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
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
            <div><label className="text-xs text-gray-500 mb-1.5 block font-bold uppercase">Loan Terms</label><Input value={form.loanTerms} onChange={(e) => upd("loanTerms", e.target.value)} placeholder="e.g. 12-36 months, 5-year fixed" className={inputClass} /></div>
          </div>
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

// ─── AssetForm ────────────────────────────────────────────────────────────────

function AssetForm({ asset, capitalType, onUpdate, tenantDatabase, onTenantAdd, inputClass, selectTriggerClass }: {
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
      {asset.ownershipStatus === "Refinance" && (<div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Refinance Type</label><Select value={asset.refinanceType} onValueChange={(v) => upd("refinanceType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{refinanceTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>)}
      <div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Asset Type</label><Select value={asset.assetType} onValueChange={(v) => upd("assetType", v)}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{assetTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
      {showUnits && (<><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Units</label><Input value={asset.numUnits} onChange={(e) => upd("numUnits", e.target.value)} placeholder="e.g. 120" className={inputClass} /></div><div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Buildings</label><Input value={asset.numBuildings} onChange={(e) => upd("numBuildings", e.target.value)} placeholder="e.g. 4" className={inputClass} /></div></>)}
      {showAcres && (<div><label className="text-xs text-gray-500 mb-1 block font-medium uppercase">Number of Acres</label><Input value={asset.numAcres} onChange={(e) => upd("numAcres", e.target.value)} placeholder="e.g. 12.5" className={inputClass} /></div>)}
      {showRetail && (
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3"><label className="text-xs text-gray-500 font-bold uppercase">Retail Units</label><button onClick={() => onUpdate({ ...asset, retailUnits: [...asset.retailUnits, { id: asset.retailUnits.length + 1, tenant: "", rent: "", sqft: "" }] })} className="flex items-center gap-1 px-3 py-1 text-xs bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80"><Plus className="h-3 w-3" /> Add Unit</button></div>
          <div className="space-y-3">{asset.retailUnits.map((unit, idx) => (<div key={unit.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-[#0a1f44]">Unit {idx + 1}</span>{asset.retailUnits.length > 1 && <button onClick={() => onUpdate({ ...asset, retailUnits: asset.retailUnits.filter((u) => u.id !== unit.id) })} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}</div><div className="grid gap-2 md:grid-cols-3"><div><label className="text-xs text-gray-400 mb-1 block">Tenant Name</label><input list={`tenants-${unit.id}`} value={unit.tenant} onChange={(e) => updRetail(unit.id, "tenant", e.target.value)} placeholder="Tenant name" className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44]" /><datalist id={`tenants-${unit.id}`}>{tenantDatabase.map((t) => <option key={t} value={t} />)}</datalist></div><div><label className="text-xs text-gray-400 mb-1 block">Monthly Rent</label><Input value={unit.rent} onChange={(e) => updRetail(unit.id, "rent", formatCurrencyInput(e.target.value))} placeholder="$0" className={inputClass} /></div><div><label className="text-xs text-gray-400 mb-1 block">Square Footage</label><Input value={unit.sqft} onChange={(e) => updRetail(unit.id, "sqft", e.target.value)} placeholder="e.g. 2,400" className={inputClass} /></div></div></div>))}</div>
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
      <div className="md:col-span-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(metricBoxes.length, 3)}, 1fr)` }}>
        {metricBoxes.map(([label, val]) => (<div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">{label}</div><div className="text-sm font-bold text-[#0a1f44]">{val}</div></div>))}
      </div>
    </div>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const navItems: [string, string, any, string?][] = [
  ["overview", "Overview", Gauge],
  ["lenders", "Lender Programs", Landmark],
  ["add-lender", "Add Lender", Plus, "sub"],
  ["matcher", "Deal Matcher", Filter],
  ["uploads", "Upload Center", FileSpreadsheet],
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lenderRecords, setLenderRecords] = useState<LenderRecord[]>(seedLenders);
  const [search, setSearch] = useState("");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("All");
  const [selectedCapitalFilter, setSelectedCapitalFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [editingLenderId, setEditingLenderId] = useState<number | null>(null);
  const [tenantDatabase, setTenantDatabase] = useState<string[]>([]);

  // AI prompt state
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsed, setAiParsed] = useState(false);
  const [aiError, setAiError] = useState("");

  // Matcher state
  const [matcherStep, setMatcherStep] = useState<"ai-prompt" | "start" | "asset-count" | "asset-form" | "review" | "results">("ai-prompt");
  const [marketScope, setMarketScope] = useState("US");
  const [capitalType, setCapitalType] = useState("Senior");
  const [assetMode, setAssetMode] = useState<"single" | "multiple" | "">("single");
  const [assetCount, setAssetCount] = useState("2");
  const [collateralMode, setCollateralMode] = useState<"crossed" | "separate" | "">(""); 
  const [assets, setAssets] = useState<AssetData[]>([blankAsset(1)]);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);

  function addTenant(name: string) { setTenantDatabase((prev) => prev.includes(name) ? prev : [...prev, name]); }
  function updateAsset(updated: AssetData) { setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a)); }

  async function handleAiSubmit() {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const parsed = await parseDeadWithAI(aiDescription, capitalType);
      if (Object.keys(parsed).length === 0) {
        setAiError("Couldn't parse the deal. Try being more specific or use manual entry.");
      } else {
        setAssets([{ ...blankAsset(1), ...parsed }]);
        setAiParsed(true);
        setAssetMode("single");
        setMatcherStep("asset-form");
      }
    } catch {
      setAiError("Something went wrong. Please try again or use manual entry.");
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
    setCurrentAssetIndex(0);
    setMatcherStep("asset-form");
  }

  function handleNextAsset() {
    if (currentAssetIndex < assets.length - 1) { setCurrentAssetIndex((i) => i + 1); }
    else { setMatcherStep("review"); }
  }

  function handlePrevAsset() {
    if (currentAssetIndex > 0) { setCurrentAssetIndex((i) => i - 1); }
    else { setMatcherStep(assetMode === "multiple" ? "asset-count" : "start"); }
  }

  function resetMatcher() {
    setMatcherStep("ai-prompt"); setAssetMode("single"); setCollateralMode("");
    setAssets([blankAsset(1)]); setCurrentAssetIndex(0);
    setAiDescription(""); setAiParsed(false); setAiError("");
  }

  function handleSaveLender(form: NewLenderForm) {
    const newRecord: LenderRecord = {
      id: lenderRecords.length + 1, source: "Dashboard", spreadsheetRow: "—",
      program: form.programName, lender: form.programName, type: form.capitalType,
      minLoan: form.minLoan, maxLoan: form.maxLoan, maxLtv: form.maxLtv, minDscr: "1.20x",
      states: form.targetStates.length > 0 ? form.targetStates : ["Nationwide"],
      assets: form.propertyTypes.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status, email: form.email, phone: form.phone, recourse: form.recourse,
      contactPerson: form.contactPerson, website: form.website,
      sponsorStates: form.sponsorStates, loanTerms: form.loanTerms,
      typeOfLoans: form.typeOfLoans, programTypes: form.programTypes,
    };
    setLenderRecords((prev) => [...prev, newRecord]);
    setActiveTab("lenders");
  }

  function updateLenderField(id: number, field: keyof LenderRecord, value: string) {
    setLenderRecords((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }
  function toggleLenderStatus(id: number) {
    setLenderRecords((prev) => prev.map((l) => (l.id !== id ? l : { ...l, status: l.status === "Inactive" ? "Active" : "Inactive" })));
  }

  const matchResults = useMemo(() => {
    if (matcherStep !== "results") return [];
    if (marketScope === "INTERNATIONAL") return [];
    if (collateralMode === "crossed" || assetMode === "single") {
      const totalLoan = assets.reduce((sum, a) => { const m = calcMetrics(a, capitalType); return sum + m.effectiveAmt; }, 0);
      const primaryAsset = assets[0];
      const allSelectedStates = [...new Set(assets.flatMap((a) => a.selectedStates))];
      return lenderRecords.map((l) => {
        let score = 0; const nr = normalizeRecourse(l.recourse);
        if (totalLoan >= parseCurrency(l.minLoan) && totalLoan <= parseCurrency(l.maxLoan)) score += 30;
        if (l.assets.includes(primaryAsset.assetType)) score += 22;
        if (l.type === capitalType) score += 20;
        if (allSelectedStates.some((s) => l.states.includes(s)) || l.states.includes("Nationwide")) score += 15;
        if (nr === primaryAsset.recourseType || nr === "CASE BY CASE") score += 10;
        return { ...l, score, nr };
      }).filter((l) => l.score > 30).sort((a, b) => b.score - a.score).slice(0, 4);
    } else {
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
    }
  }, [matcherStep, assets, capitalType, marketScope, collateralMode, assetMode, lenderRecords]);

  const spreadsheetCount = lenderRecords.filter((l) => l.source === "Spreadsheet").length;
  const dashboardCount = lenderRecords.filter((l) => l.source === "Dashboard").length;
  const filteredLenders = useMemo(() => lenderRecords.filter((l) =>
    (selectedSourceFilter === "All" || l.source === selectedSourceFilter) &&
    (selectedCapitalFilter === "All" || l.type === selectedCapitalFilter) &&
    (selectedStatusFilter === "All" || l.status === selectedStatusFilter) &&
    (search === "" || l.lender.toLowerCase().includes(search.toLowerCase()) || l.program.toLowerCase().includes(search.toLowerCase()))
  ), [lenderRecords, selectedSourceFilter, selectedCapitalFilter, selectedStatusFilter, search]);

  const inputClass = "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-[#0a1f44] focus:ring-0";
  const selectTriggerClass = "bg-white border-gray-300 text-gray-800 rounded-xl focus:border-[#0a1f44]";
  const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";

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
              {navItems.map(([key, label, Icon, type]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${type === "sub" ? "pl-8" : ""} ${activeTab === key ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30" : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  <Icon className={`flex-shrink-0 ${type === "sub" ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                  <span className={`font-medium tracking-wide ${type === "sub" ? "text-xs" : "text-sm"}`}>{label}</span>
                  {activeTab === key && <div className="ml-auto w-1 h-4 bg-[#c9a84c] rounded-full" />}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-[#c9a84c]/20">
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-4">
                <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-bold text-[#c9a84c] tracking-wide uppercase">Auto-Match Engine</span></div>
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
                  <p className="mt-1 text-sm text-gray-500">CapMoon's Premier Capital Search Dashboard</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 text-sm font-medium text-[#0a1f44] border border-[#0a1f44]/30 rounded-xl hover:bg-[#0a1f44]/10 transition-all">Export Lender Set</button>
                  <button onClick={() => setActiveTab("add-lender")} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all">
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
                      <p className="text-xs text-gray-500 mt-0.5">Edit, deactivate, filter, and review lender records.</p>
                    </div>
                    <button onClick={() => setActiveTab("add-lender")} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 transition-all"><Plus className="h-4 w-4" /> Add Lender</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4 mb-4">
                    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-[#0a1f44]" /></div>
                    <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Sources</SelectItem><SelectItem value="Spreadsheet">Spreadsheet</SelectItem><SelectItem value="Dashboard">Dashboard</SelectItem></SelectContent></Select>
                    <Select value={selectedCapitalFilter} onValueChange={setSelectedCapitalFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Capital</SelectItem>{capitalTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                    <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[`Spreadsheet: ${spreadsheetCount}`, `Dashboard: ${dashboardCount}`, `Showing: ${filteredLenders.length}`].map((t) => (<span key={t} className="px-3 py-1 rounded-full text-xs border border-[#c9a84c]/30 text-[#c9a84c] font-bold">{t}</span>))}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <Table>
                      <TableHeader><TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">{["Source","Row","Lender","Program","Capital","Contact","Phone","Status",""].map((h) => <TableHead key={h} className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold">{h}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {filteredLenders.map((item) => (
                          <TableRow key={item.id} className="border-gray-100 hover:bg-gray-50">
                            <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.source === "Spreadsheet" ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>{item.source}</span></TableCell>
                            <TableCell className="text-gray-400 text-xs">{item.spreadsheetRow}</TableCell>
                            <TableCell className="font-semibold text-[#0a1f44] text-sm">{item.lender}</TableCell>
                            <TableCell className="text-gray-600 text-xs">{item.program}</TableCell>
                            <TableCell className="text-gray-600 text-xs">{item.type}</TableCell>
                            <TableCell className="text-gray-400 text-xs">{item.contactPerson || "—"}</TableCell>
                            <TableCell className="text-gray-400 text-xs">{item.phone || "—"}</TableCell>
                            <TableCell><span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 text-gray-500">{item.status}</span></TableCell>
                            <TableCell className="text-right"><div className="flex justify-end gap-2">
                              <button onClick={() => setEditingLenderId(item.id === editingLenderId ? null : item.id)} className="px-3 py-1 text-xs border border-[#0a1f44]/20 text-[#0a1f44] rounded-lg hover:bg-[#0a1f44]/10 font-medium">{item.id === editingLenderId ? "Close" : "Edit"}</button>
                              <button onClick={() => toggleLenderStatus(item.id)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100">{item.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                            </div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {editingLenderId && (() => {
                    const lender = lenderRecords.find((l) => l.id === editingLenderId);
                    if (!lender) return null;
                    return (
                      <div className="mt-6 rounded-xl border border-[#0a1f44]/20 bg-gray-50 p-5">
                        <div className="text-sm font-bold text-[#0a1f44] mb-4">Editing: {lender.lender}</div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Lender Name</label><Input value={lender.lender} onChange={(e) => updateLenderField(lender.id, "lender", e.target.value)} className={inputClass} /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Email</label><Input value={lender.email || ""} onChange={(e) => updateLenderField(lender.id, "email", e.target.value)} className={inputClass} /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block font-medium">Phone</label><Input value={lender.phone || ""} onChange={(e) => updateLenderField(lender.id, "phone", e.target.value)} className={inputClass} /></div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => setEditingLenderId(null)} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Done</button>
                          <button onClick={() => toggleLenderStatus(lender.id)} className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">{lender.status === "Inactive" ? "Activate" : "Deactivate"}</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Add Lender */}
              {activeTab === "add-lender" && (
                <AddLenderPage onSave={handleSaveLender} onCancel={() => setActiveTab("lenders")} existingLenders={lenderRecords} inputClass={inputClass} selectTriggerClass={selectTriggerClass} />
              )}

              {/* Deal Matcher */}
              {activeTab === "matcher" && (
                <div>
                  {matcherStep !== "ai-prompt" && (
                    <div className="flex items-center gap-2 mb-6">
                      {["AI Search", "Setup", assetMode === "multiple" ? "Asset Count" : null, "Asset Details", "Review", "Results"].filter(Boolean).map((step, idx, arr) => (
                        <React.Fragment key={String(step)}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx <= ["AI Search", "Setup", assetMode === "multiple" ? "Asset Count" : null, "Asset Details", "Review", "Results"].filter(Boolean).indexOf(matcherStep === "ai-prompt" ? "AI Search" : matcherStep === "start" ? "Setup" : matcherStep === "asset-count" ? "Asset Count" : matcherStep === "asset-form" ? "Asset Details" : matcherStep === "review" ? "Review" : "Results") ? "bg-[#0a1f44] text-white" : "bg-gray-200 text-gray-500"}`}>{idx + 1}</div>
                            <span className="text-xs text-gray-500 font-medium hidden sm:block">{step}</span>
                          </div>
                          {idx < arr.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                        </React.Fragment>
                      ))}
                      <button onClick={resetMatcher} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Start Over</button>
                    </div>
                  )}

                  {/* ── AI Prompt Step ── */}
                  {matcherStep === "ai-prompt" && (
                    <div className="max-w-2xl">
                      <div className={cardClass + " p-8"}>
                        {/* AI Search */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-[#0a1f44] flex items-center justify-center"><Sparkles className="h-5 w-5 text-[#c9a84c]" /></div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">AI-Powered</div>
                            <h2 className="font-display text-3xl font-bold text-[#0a1f44]">Describe Your Deal</h2>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">Tell us about your deal in plain English and our AI will find the best matching lenders instantly.</p>

                        {/* Capital type first */}
                        <div className="mb-5">
                          <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Capital Type</label>
                          <Select value={capitalType} onValueChange={setCapitalType}>
                            <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                            <SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>

                        {/* AI text box */}
                        <div className="mb-4">
                          <label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Describe Your Deal</label>
                          <textarea
                            value={aiDescription}
                            onChange={(e) => setAiDescription(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAiSubmit(); }}
                            placeholder={`e.g. "I need a bridge loan for a 150-unit apartment complex in Miami, FL. Purchase price is $28M, looking for $18M in senior financing at 65% LTV. Value-add deal, non-recourse preferred."`}
                            rows={4}
                            className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#0a1f44] resize-none"
                          />
                          <div className="text-xs text-gray-400 mt-1">Press Cmd+Enter to submit</div>
                        </div>

                        {aiError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{aiError}</div>}

                        <div className="flex gap-3">
                          <button onClick={handleAiSubmit} disabled={aiLoading || !aiDescription.trim()} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing deal...</> : <><Sparkles className="h-4 w-4" /> Find Matching Lenders</>}
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400 font-medium">or</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {/* Manual entry option */}
                        <button onClick={() => setMatcherStep("start")} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-[#0a1f44]/30 hover:text-[#0a1f44] transition-all">
                          <Edit2 className="h-4 w-4" /> Enter deal parameters manually
                        </button>

                        {/* Example prompts */}
                        <div className="mt-6">
                          <div className="text-xs text-gray-400 font-medium mb-3">Example searches:</div>
                          <div className="space-y-2">
                            {[
                              "Bridge loan for 200-unit apartments in Florida, $15M, 70% LTV",
                              "Construction financing for mixed-use development in New York, $40M",
                              "Refinance retail center in Texas, $8M, cash-out, non-recourse",
                            ].map((ex) => (
                              <button key={ex} onClick={() => setAiDescription(ex)} className="w-full text-left px-3 py-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-[#0a1f44]/5 hover:border-[#0a1f44]/20 hover:text-[#0a1f44] transition-all">
                                "{ex}"
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Setup Step ── */}
                  {matcherStep === "start" && (
                    <div className="max-w-2xl">
                      <div className={cardClass + " p-8"}>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Deal Matcher</div>
                        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Let's get started</h2>
                        <p className="text-sm text-gray-500 mb-8">First, tell us your market and capital type.</p>
                        <div className="grid gap-5 md:grid-cols-2 mb-8">
                          <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Market</label><Select value={marketScope} onValueChange={setMarketScope}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{marketOptions.map((i) => <SelectItem key={i} value={i}>{i === "US" ? "US" : "International"}</SelectItem>)}</SelectContent></Select></div>
                          <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Capital Type</label><Select value={capitalType} onValueChange={setCapitalType}><SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{capitalTypes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        {marketScope === "INTERNATIONAL" ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 mb-6">CAPMOON DOES NOT SERVICE INTERNATIONAL LOANS AT THIS TIME</div>
                        ) : (
                          <div>
                            <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">Is this one asset or multiple assets?</label>
                            <div className="grid grid-cols-2 gap-3 mb-5">
                              <button onClick={() => handleAssetModeSelect("single")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "single" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}>
                                <div className="text-sm font-bold text-[#0a1f44]">Single Asset</div>
                                <div className="text-xs text-gray-500 mt-1">One property or collateral</div>
                              </button>
                              <button onClick={() => handleAssetModeSelect("multiple")} className={`p-4 rounded-xl border-2 text-left transition-all ${assetMode === "multiple" ? "border-[#0a1f44] bg-[#0a1f44]/5" : "border-gray-200 hover:border-[#0a1f44]/30"}`}>
                                <div className="text-sm font-bold text-[#0a1f44]">Multiple Assets</div>
                                <div className="text-xs text-gray-500 mt-1">Portfolio or pool of assets</div>
                              </button>
                            </div>
                            <button onClick={() => setMatcherStep("ai-prompt")} className="flex items-center gap-2 text-xs text-[#c9a84c] font-medium hover:underline">
                              <Sparkles className="h-3.5 w-3.5" /> Switch to AI search instead
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Asset Count ── */}
                  {matcherStep === "asset-count" && (
                    <div className="max-w-2xl">
                      <div className={cardClass + " p-8"}>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Multiple Assets</div>
                        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Portfolio Setup</h2>
                        <p className="text-sm text-gray-500 mb-8">Tell us how many assets and how they should be treated.</p>
                        <div className="space-y-6">
                          <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">How many assets in total?</label><Input value={assetCount} onChange={(e) => setAssetCount(e.target.value)} type="number" min="2" max="20" placeholder="e.g. 3" className={inputClass + " max-w-xs"} /></div>
                          <div>
                            <label className="text-xs text-gray-500 mb-3 block font-bold uppercase">How should these assets be treated?</label>
                            <Select value={collateralMode} onValueChange={(v) => setCollateralMode(v as "crossed" | "separate")}><SelectTrigger className={selectTriggerClass + " max-w-xs"}><SelectValue placeholder="Select treatment..." /></SelectTrigger><SelectContent><SelectItem value="crossed">Crossed Collateral</SelectItem><SelectItem value="separate">Treated Separately</SelectItem></SelectContent></Select>
                            {collateralMode === "crossed" && <p className="text-xs text-gray-500 mt-2">All assets will be combined and matched as a single portfolio loan.</p>}
                            {collateralMode === "separate" && <p className="text-xs text-gray-500 mt-2">Each asset will be matched independently with its own lender results.</p>}
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => setMatcherStep("start")} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Previous</button>
                            <button onClick={handleAssetCountConfirm} disabled={!collateralMode} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-40 disabled:cursor-not-allowed">Continue <ChevronRight className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Asset Form ── */}
                  {matcherStep === "asset-form" && (
                    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                      <div className={cardClass + " p-6"}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold mb-1">{assets.length > 1 ? `Asset ${currentAssetIndex + 1} of ${assets.length}` : "Asset Details"}</div>
                            <h2 className="font-display text-2xl font-bold text-[#0a1f44]">{assets.length > 1 ? `Asset ${currentAssetIndex + 1}` : "Deal Details"}</h2>
                          </div>
                          <div className="flex items-center gap-3">
                            {aiParsed && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20">
                                <Sparkles className="h-3 w-3 text-[#c9a84c]" />
                                <span className="text-xs font-semibold text-[#0a1f44]">AI-filled</span>
                              </div>
                            )}
                            {assets.length > 1 && (<div className="flex gap-1">{assets.map((_, idx) => (<div key={idx} className={`w-2 h-2 rounded-full ${idx === currentAssetIndex ? "bg-[#0a1f44]" : idx < currentAssetIndex ? "bg-[#c9a84c]" : "bg-gray-300"}`} />))}</div>)}
                          </div>
                        </div>
                        {aiParsed && (
                          <div className="mb-4 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs text-gray-600">Parameters filled by AI from your description. Review and edit any field below.</span></div>
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
                                  <div><div className="text-xs font-bold text-[#0a1f44]">Asset {idx + 1}</div><div className="text-xs text-gray-500 mt-0.5">{a.assetType} · {a.ownershipStatus}</div>{a.loanAmount && <div className="text-xs font-semibold text-[#c9a84c] mt-1">{a.loanAmount}</div>}</div>
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

                  {/* ── Review ── */}
                  {matcherStep === "review" && (
                    <div className="max-w-4xl">
                      <div className={cardClass + " p-8"}>
                        <div className="mb-1 text-xs uppercase tracking-[0.22em] text-[#c9a84c] font-bold">Final Review</div>
                        <h2 className="font-display text-3xl font-bold text-[#0a1f44] mb-2">Review & Confirm</h2>
                        <p className="text-sm text-gray-500 mb-8">Review all assets. Click Edit to make changes, then run the match.</p>
                        <div className="grid gap-4 md:grid-cols-2 mb-8">
                          {assets.map((asset, idx) => {
                            const m = calcMetrics(asset, capitalType);
                            return (
                              <div key={asset.id} className="rounded-xl border-2 border-gray-200 p-5 hover:border-[#0a1f44]/30 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                  <div><div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Asset {idx + 1}</div><div className="text-base font-bold text-[#0a1f44]">{asset.assetType}</div><div className="text-xs text-gray-500">{asset.ownershipStatus} · {asset.dealType}</div></div>
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
                          <button onClick={() => setMatcherStep("results")} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Run Lender Match <ChevronRight className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Results ── */}
                  {matcherStep === "results" && (
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
                              <div className="text-sm font-bold text-[#0a1f44] mb-3 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[#0a1f44] text-white flex items-center justify-center text-xs font-bold">{asset.id}</div>Asset {asset.id} — {asset.assetType} · {asset.loanAmount || "—"}</div>
                              {assetMatches.length === 0 ? (<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">No matches for this asset.</div>) : (
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {assetMatches.map((match: any) => (
                                    <div key={match.id + "-" + asset.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#0a1f44]/30 transition-all">
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
                    <div className="flex flex-wrap gap-2 mb-5">
                      {["Program Name", "Contact Person", "Email Address", "Phone Number", "Website", "Type of Loans", "Program", "Property Types", "Loan Terms", "Min Loan Size", "Max Loan Size", "Max LTV", "Target States", "Sponsor States", "Recourse", "Capital Type", "Source Tag"].map((field) => (
                        <span key={field} className="px-3 py-1 rounded-full text-xs border border-[#0a1f44]/20 text-[#0a1f44] font-medium">{field}</span>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">All fields above are automatically mapped when a spreadsheet is uploaded.</div>
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
