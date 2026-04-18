"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle, XCircle, Zap, Building, DollarSign, TrendingUp, Users, Info } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Rates { t5: number; t7: number; t10: number; t30: number; sofr: number; prime: number; updatedAt: string; }
interface MSAResult { msaName: string; msaCode: string | null; tier: 1 | 2; }
interface Guarantor { name: string; netWorth: string; liquidity: string; creditScore: string; }

interface DealInput {
  // Property
  numAssets: number;
  assets: AssetInput[];
  // Loan
  capitalType: "fannie-conventional" | "freddie-conventional" | "fannie-small" | "freddie-small" | "";
  loanAmount: string;
  desiredTerm: string;
  loanPurpose: "acquisition" | "refinance" | "cash-out-refinance";
  // Financials
  grossIncome: string;
  grossExpenses: string;
  existingDebt: string;
  estimatedValue: string;
  // Guarantors
  recourseOverride: "non-recourse" | "recourse" | "";
  guarantors: Guarantor[];
}

interface AssetInput {
  id: number;
  propertyType: string;
  numUnits: string;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  msaResult: MSAResult | null;
  timeOwned: string;
  mixedUseCommercialPct: string;
  mixedUseIncomePct: string;
  isMixedUse: boolean;
  zip: string;
}

const ELIGIBLE_PROPERTY_TYPES = [
  "Conventional Apartments",
  "Student Housing (< 80% concentration)",
  "Military Housing (< 80% concentration)",
  "Senior Housing / Independent Living",
  "Affordable Housing / LIHTC",
  "Manufactured Housing Community (50+ pads)",
  "Cooperative",
  "Mixed Use (residential primary)",
];

const PROGRAM_TERMS: Record<string, string[]> = {
  "fannie-conventional": ["5-Year", "7-Year", "10-Year", "12-Year", "15-Year"],
  "freddie-conventional": ["5-Year", "7-Year", "10-Year", "12-Year", "15-Year"],
  "fannie-small": ["5-Year", "7-Year", "10-Year", "12-Year", "15-Year"],
  "freddie-small": ["5-Year", "7-Year", "10-Year"],
};

const PROGRAM_LABELS: Record<string, string> = {
  "fannie-conventional": "Fannie Mae Conventional DUS",
  "freddie-conventional": "Freddie Mac Optigo Conventional",
  "fannie-small": "Fannie Mae Small Loan ($750K–$9M)",
  "freddie-small": "Freddie Mac Small Balance ($1M–$7.5M)",
};

// Rate grids from Greystone 04/14/2026
const RATE_GRID: Record<string, Record<string, { tier1: [number,number]; tier2: [number,number]; tier3: [number,number] }>> = {
  "fannie-conventional": {
    "5-Year":  { tier1: [5.68,5.98], tier2: [5.48,5.78], tier3: [5.38,5.58] },
    "7-Year":  { tier1: [5.54,5.84], tier2: [5.34,5.64], tier3: [5.24,5.44] },
    "10-Year": { tier1: [5.41,5.71], tier2: [5.21,5.51], tier3: [5.11,5.31] },
    "12-Year": { tier1: [5.33,5.63], tier2: [5.08,5.38], tier3: [4.98,5.18] },
    "15-Year": { tier1: [5.32,5.62], tier2: [4.97,5.27], tier3: [4.87,5.07] },
  },
  "freddie-conventional": {
    "5-Year":  { tier1: [5.55,5.80], tier2: [5.50,5.75], tier3: [5.40,5.65] },
    "7-Year":  { tier1: [5.50,5.75], tier2: [5.45,5.70], tier3: [5.35,5.60] },
    "10-Year": { tier1: [5.40,5.65], tier2: [5.35,5.60], tier3: [5.25,5.50] },
    "12-Year": { tier1: [5.38,5.63], tier2: [5.33,5.58], tier3: [5.23,5.48] },
    "15-Year": { tier1: [5.26,5.51], tier2: [5.21,5.46], tier3: [5.11,5.36] },
  },
  "fannie-small": {
    "5-Year":  { tier1: [6.34,6.74], tier2: [6.14,6.54], tier3: [6.04,6.34] },
    "7-Year":  { tier1: [6.20,6.60], tier2: [6.00,6.40], tier3: [5.90,6.20] },
    "10-Year": { tier1: [6.07,6.47], tier2: [5.87,6.27], tier3: [5.77,6.07] },
    "12-Year": { tier1: [5.99,6.39], tier2: [5.74,6.14], tier3: [5.64,5.94] },
    "15-Year": { tier1: [5.98,6.38], tier2: [5.63,6.03], tier3: [5.53,5.83] },
  },
  "freddie-small": {
    "5-Year":  { tier1: [6.50,7.15], tier2: [6.36,7.01], tier3: [6.22,6.87] },
    "7-Year":  { tier1: [6.57,7.30], tier2: [6.43,7.16], tier3: [6.29,7.02] },
    "10-Year": { tier1: [6.60,7.25], tier2: [6.46,7.11], tier3: [6.32,6.97] },
  },
};

function parseMoney(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[$,]/g, "")) || 0;
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

function formatCurrencyInput(v: string): string {
  const num = v.replace(/[^0-9.]/g, "");
  if (!num) return "";
  const n = parseFloat(num);
  if (isNaN(n)) return v;
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  const r = annualRate / 100 / 12;
  const n = 30 * 12; // 30yr amortization
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function getLtvTier(ltv: number): "tier1" | "tier2" | "tier3" {
  if (ltv > 65) return "tier1"; // 80% tier
  if (ltv > 55) return "tier2"; // 65% tier
  return "tier3"; // 55% tier
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface Props {
  lenderRecords: any[];
  onSendToDealMatcher: (data: any) => void;
  session: any;
  onSubmitDeal: (deal: any) => void;
  teamMembers: any[];
  inputClass: string;
  cardClass: string;
}

export function DealMatcherExpedited({ lenderRecords, onSendToDealMatcher, session, onSubmitDeal, teamMembers, inputClass, cardClass }: Props) {
  const [step, setStep] = useState<"landing" | "intake" | "results" | "disqualified">("landing");
  const [rates, setRates] = useState<Rates | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [msaLoading, setMsaLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [disqualReasons, setDisqualReasons] = useState<string[]>([]);

  const blankAsset = (id: number): AssetInput => ({
    id, propertyType: "", numUnits: "", address: "", city: "", state: "",
    lat: null, lng: null, msaResult: null, timeOwned: "", isMixedUse: false,
    mixedUseCommercialPct: "", mixedUseIncomePct: "", zip: "",
  });

  const [deal, setDeal] = useState<DealInput>({
    numAssets: 1, assets: [blankAsset(1)],
    capitalType: "", loanAmount: "", desiredTerm: "10-Year", loanPurpose: "acquisition",
    grossIncome: "", grossExpenses: "", existingDebt: "", estimatedValue: "",
    recourseOverride: "", guarantors: [{ name: "", netWorth: "", liquidity: "", creditScore: "" }],
  });

  // Load rates on mount
  useEffect(() => {
    setLoadingRates(true);
    fetch("/api/rates").then(r => r.json()).then(d => { setRates(d); setLoadingRates(false); }).catch(() => setLoadingRates(false));
  }, []);

  function updDeal(field: keyof DealInput, value: any) {
    setDeal(p => ({ ...p, [field]: value }));
  }

  function updAsset(idx: number, field: keyof AssetInput, value: any) {
    setDeal(p => ({ ...p, assets: p.assets.map((a, i) => i === idx ? { ...a, [field]: value } : a) }));
  }

  function setNumAssets(n: number) {
    const assets = Array.from({ length: n }, (_, i) => deal.assets[i] || blankAsset(i + 1));
    setDeal(p => ({ ...p, numAssets: n, assets }));
  }

  async function lookupMSA(idx: number, lat: number, lng: number, city: string) {
    setMsaLoading(true);
    try {
      const res = await fetch(`/api/msa-lookup?lat=${lat}&lng=${lng}&city=${encodeURIComponent(city)}`);
      const msa = await res.json();
      updAsset(idx, "msaResult", msa);
    } catch {}
    setMsaLoading(false);
  }

  // ── Calculations ──────────────────────────────────────────────────────────
  function calculate() {
    setCalculating(true);
    const loanAmt = parseMoney(deal.loanAmount);
    const propVal = parseMoney(deal.estimatedValue);
    const grossInc = parseMoney(deal.grossIncome);
    const grossExp = parseMoney(deal.grossExpenses);
    const noi = grossInc - grossExp;
    const ltv = propVal > 0 ? (loanAmt / propVal) * 100 : 0;
    const program = deal.capitalType;
    const term = deal.desiredTerm;
    const grid = RATE_GRID[program]?.[term];
    const ltvTier = getLtvTier(ltv);
    const rates = grid?.[ltvTier] || [5.5, 6.0];
    const maxRate = rates[1] / 100;
    const minRate = rates[0] / 100;
    const maxPayment = calcMonthlyPayment(loanAmt, rates[1], 30);
    const minPayment = calcMonthlyPayment(loanAmt, rates[0], 30);
    const maxAnnualDebtService = maxPayment * 12;
    const minAnnualDebtService = minPayment * 12;
    const dscrAtMax = maxAnnualDebtService > 0 ? noi / maxAnnualDebtService : 0;
    const dscrAtMin = minAnnualDebtService > 0 ? noi / minAnnualDebtService : 0;
    const debtYield = loanAmt > 0 ? (noi / loanAmt) * 100 : 0;
    const maxLoanByDSCR = maxAnnualDebtService > 0 ? (noi / 1.25) / (maxRate / 12 * Math.pow(1 + maxRate/12, 360) / (Math.pow(1 + maxRate/12, 360) - 1)) / 12 : 0;
    const maxLoanByLTV80 = propVal * 0.80;
    const maxLoanByLTV65 = propVal * 0.65;
    const maxLoanByDY = noi / 0.075; // 7.5% min DY

    // MSA tier adjustment note
    const isTier1 = deal.assets.some(a => a.msaResult?.tier === 1);

    // Disqualification checks
    const disqual: string[] = [];
    const warnings: string[] = [];

    // Hard disqualifications
    if (!deal.capitalType) disqual.push("No program selected");
    if (ltv > 80) disqual.push(`LTV of ${ltv.toFixed(1)}% exceeds maximum 80% for this program`);
    if (dscrAtMax < 1.25 && noi > 0) disqual.push(`DSCR of ${dscrAtMax.toFixed(2)}x at max rate is below minimum 1.25x required for Fannie Mae / Freddie Mac Conventional`);
    if (debtYield < 7.0 && loanAmt > 0 && noi > 0) disqual.push(`Debt Yield of ${debtYield.toFixed(1)}% is below typical minimum of 7.0% for agency programs`);
    if (deal.assets.some(a => parseInt(a.numUnits || "0") < 5)) disqual.push("Minimum 5 units required for Fannie Mae / Freddie Mac Conventional");
    if (deal.assets.some(a => a.isMixedUse && parseFloat(a.mixedUseCommercialPct || "0") > 35)) disqual.push("Mixed use commercial space exceeds maximum 35% of rentable area");
    if (deal.assets.some(a => a.isMixedUse && parseFloat(a.mixedUseIncomePct || "0") > 20)) disqual.push("Mixed use commercial income exceeds maximum 20% of effective gross income");
    if (program === "fannie-small" && loanAmt > 9_000_000) disqual.push(`Loan amount of ${formatMoney(loanAmt)} exceeds Fannie Mae Small Loan maximum of $9M`);
    if (program === "freddie-small" && loanAmt > 7_500_000) disqual.push(`Loan amount of ${formatMoney(loanAmt)} exceeds Freddie Mac Small Balance maximum of $7.5M`);
    if ((program === "fannie-conventional" || program === "freddie-conventional") && loanAmt < 750_000) disqual.push(`Loan amount of ${formatMoney(loanAmt)} is below minimum $750,000 for conventional programs`);

    // Soft warnings (combined guarantor totals)
    const combinedNW = deal.guarantors.reduce((s, g) => s + parseMoney(g.netWorth), 0);
    const combinedLiq = deal.guarantors.reduce((s, g) => s + parseMoney(g.liquidity), 0);
    const topCreditScore = Math.max(...deal.guarantors.map(g => parseInt(g.creditScore || "0") || 0));
    if (topCreditScore > 0 && topCreditScore < 680) warnings.push(`Highest credit score (${topCreditScore}) is below typical 680 minimum — may affect eligibility`);
    if (combinedLiq > 0 && combinedLiq < loanAmt * 0.05) warnings.push(`Combined liquidity (${formatMoney(combinedLiq)}) is below typical 5% of loan amount requirement`);
    if (combinedNW > 0 && combinedNW < loanAmt) warnings.push(`Combined net worth (${formatMoney(combinedNW)}) is below typical 1x loan amount guideline`);

    // Match lenders
    const programKeywords = program.includes("fannie") ? ["fannie", "fnma", "agency", "dus"] : ["freddie", "fhlmc", "agency", "optigo"];
    const dealState = deal.assets[0]?.state?.toUpperCase() || "";
    const matchedLenders = lenderRecords.filter(l => {
      const lType = (l.type || "").toLowerCase();
      const lProgram = (l.program || "").toLowerCase();
      const isAgency = programKeywords.some(k => lType.includes(k) || lProgram.includes(k)) ||
        (l.capitalTypes || []).some((ct: string) => ct.toLowerCase().includes("agency") || ct.toLowerCase().includes(program.includes("fannie") ? "fannie" : "freddie"));
      const stateMatch = !dealState || !l.states?.length || l.states.includes(dealState);
      return isAgency && stateMatch && l.status === "Active";
    });

    setResults({
      loanAmt, propVal, noi, ltv, dscrAtMax, dscrAtMin, debtYield,
      maxPayment, minPayment, maxAnnualDebtService,
      maxLoanByDSCR, maxLoanByLTV80, maxLoanByLTV65, maxLoanByDY,
      rateRange: rates, ltvTier, isTier1, program, term,
      matchedLenders, warnings, grossInc, grossExp,
    });
    setDisqualReasons(disqual);
    setCalculating(false);
    setStep(disqual.length > 0 ? "disqualified" : "results");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const labelClass = "text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block";
  const inp = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]";
  const sel = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44] text-gray-700";

  // ── Landing ───────────────────────────────────────────────────────────────
  if (step === "landing") {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={onSendToDealMatcher} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0a1f44] mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Deal Finder
        </button>
        {/* Hero */}
        <div className="rounded-2xl bg-[#0a1f44] p-8 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-white">Deal Matcher</span>
            <span className="text-3xl font-black text-[#c9a84c] font-display">+</span>
          </div>
          <p className="text-sm text-white/60 max-w-lg mx-auto">Fast-track agency pre-qualification with live rates. For Fannie Mae and Freddie Mac conventional deals — get estimated rates, underwriting metrics, and matched lenders in minutes.</p>
        </div>

        {/* Live Rate Widget */}
        <div className="rounded-2xl border border-[#c9a84c]/20 bg-white p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44]">📊 Live Market Rates</div>
            {rates?.updatedAt && <div className="text-xs text-gray-400">Updated {new Date(rates.updatedAt).toLocaleDateString()}</div>}
            {loadingRates && <div className="text-xs text-gray-400 animate-pulse">Fetching rates...</div>}
          </div>
          {rates ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                ["5yr T", rates.t5], ["7yr T", rates.t7], ["10yr T", rates.t10],
                ["30yr T", rates.t30], ["SOFR 30d", rates.sofr], ["Prime", rates.prime],
              ].map(([label, val]) => (
                <div key={String(label)} className="text-center bg-[#f0f2f5] rounded-xl p-2.5">
                  <div className="text-xs text-gray-400 mb-1">{label}</div>
                  <div className="text-sm font-bold text-[#0a1f44]">{(val as number).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          )}
        </div>

        {/* Program Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {[
            { key: "fannie-conventional", label: "Fannie Mae", sub: "Conventional DUS", min: "$750K+", ltv: "80%", dscr: "1.25x", term: "5–15yr", color: "#003087" },
            { key: "freddie-conventional", label: "Freddie Mac", sub: "Optigo Conventional", min: "$750K+", ltv: "80%", dscr: "1.25x", term: "5–15yr", color: "#00529b" },
            { key: "fannie-small", label: "Fannie Mae", sub: "Small Loan", min: "$750K–$9M", ltv: "80%", dscr: "1.25x", term: "5–15yr", color: "#1a5276" },
            { key: "freddie-small", label: "Freddie Mac", sub: "Small Balance", min: "$1M–$7.5M", ltv: "80%", dscr: "1.20x", term: "5–10yr", color: "#154360" },
          ].map(prog => (
            <button key={prog.key} onClick={() => { updDeal("capitalType", prog.key); setStep("intake"); }}
              className="text-left rounded-2xl border-2 border-gray-200 bg-white p-5 hover:border-[#c9a84c] hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: prog.color }}>
                  {prog.label.includes("Fannie") ? "FM" : "FR"}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0a1f44] group-hover:text-[#c9a84c] transition-colors">{prog.label}</div>
                  <div className="text-xs text-gray-400">{prog.sub}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[["Loan Size", prog.min], ["Max LTV", prog.ltv], ["Min DSCR", prog.dscr], ["Terms", prog.term]].map(([k, v]) => (
                  <div key={k} className="bg-[#f0f2f5] rounded-lg px-2.5 py-1.5">
                    <div className="text-xs text-gray-400">{k}</div>
                    <div className="text-xs font-bold text-[#0a1f44]">{v}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Placeholders */}
        <div className="rounded-xl border border-dashed border-gray-200 p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Coming Soon to Deal Matcher+</div>
          <div className="flex flex-wrap gap-2">
            {["HUD/FHA 223(f)", "HUD 221(d)(4)", "HUD 232 Healthcare", "CMBS Conduit", "Bridge Financing", "Construction", "Life Company", "SBA 504", "Affordable / LIHTC", "Balance Sheet"].map(p => (
              <span key={p} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-400 rounded-full border border-gray-200">{p} →</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Intake Form ───────────────────────────────────────────────────────────
  if (step === "intake") {
    const program = deal.capitalType;
    const programLabel = PROGRAM_LABELS[program] || program;
    const terms = PROGRAM_TERMS[program] || [];
    const noi = parseMoney(deal.grossIncome) - parseMoney(deal.grossExpenses);
    const loanAmt = parseMoney(deal.loanAmount);
    const propVal = parseMoney(deal.estimatedValue);
    const ltv = propVal > 0 ? (loanAmt / propVal) * 100 : 0;
    const ltvTier = getLtvTier(ltv);
    const rateGrid = RATE_GRID[program]?.[deal.desiredTerm]?.[ltvTier];
    const isTier1 = deal.assets.some(a => a.msaResult?.tier === 1);

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("landing")} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-bold text-[#0a1f44]">Deal Matcher</span>
              <span className="text-xl font-black text-[#c9a84c] font-display">+</span>
            </div>
            <div className="text-xs text-gray-400">{programLabel}</div>
          </div>
          {/* Live Rate Badge */}
          {rates && rateGrid && (
            <div className="ml-auto bg-[#0a1f44] rounded-xl px-4 py-2 text-right">
              <div className="text-xs text-white/50">Est. Rate Range</div>
              <div className="text-sm font-bold text-[#c9a84c]">{rateGrid[0].toFixed(2)}% – {rateGrid[1].toFixed(2)}%</div>
              {isTier1 && <div className="text-xs text-green-400">✓ Major MSA pricing</div>}
            </div>
          )}
        </div>

        {/* Number of Assets */}
        <div className="rounded-2xl border border-[#c9a84c]/20 bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44] mb-4">How many properties?</div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setNumAssets(n)}
                className={`w-12 h-12 rounded-xl text-sm font-bold border-2 transition-all ${deal.numAssets === n ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0a1f44]/30"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setNumAssets(Math.min(10, deal.numAssets + 1))}
              className="w-12 h-12 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-400 hover:border-[#0a1f44]/30">
              +
            </button>
          </div>
        </div>

        {/* Asset Forms */}
        {deal.assets.map((asset, idx) => (
          <div key={asset.id} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44]">
                {deal.numAssets > 1 ? `Property ${idx + 1}` : "Property Details"}
              </div>
              {deal.numAssets > 1 && (
                <button type="button" onClick={() => {
                  const newAssets = deal.assets.filter((_, i) => i !== idx);
                  setDeal(p => ({ ...p, numAssets: p.numAssets - 1, assets: newAssets }));
                }} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-200 rounded-lg hover:bg-red-50">
                  ✕ Remove Property
                </button>
              )}
            </div>

            {/* Property Type */}
            <div>
              <label className={labelClass}>Property Type *</label>
              <div className="flex flex-wrap gap-2">
                {ELIGIBLE_PROPERTY_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => { updAsset(idx, "propertyType", t); updAsset(idx, "isMixedUse", t.includes("Mixed")); }}
                    className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${asset.propertyType === t ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0a1f44]/30"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Mixed Use Fields */}
            {asset.isMixedUse && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <label className={labelClass}>Commercial Space % of Rentable Area <span className="text-red-400">(max 35%)</span></label>
                  <input value={asset.mixedUseCommercialPct} onChange={e => updAsset(idx, "mixedUseCommercialPct", e.target.value)} placeholder="e.g. 20" className={inp} />
                </div>
                <div>
                  <label className={labelClass}>Commercial Income % of EGI <span className="text-red-400">(max 20%)</span></label>
                  <input value={asset.mixedUseIncomePct} onChange={e => updAsset(idx, "mixedUseIncomePct", e.target.value)} placeholder="e.g. 15" className={inp} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Number of Units *</label>
                <input value={asset.numUnits} onChange={e => updAsset(idx, "numUnits", e.target.value)} placeholder="e.g. 48" className={inp} />
              </div>
              <div>
                <label className={labelClass}>Years Owned</label>
                <input value={asset.timeOwned} onChange={e => updAsset(idx, "timeOwned", e.target.value)} placeholder="e.g. 3" className={inp} />
              </div>
            </div>

            {/* Address with Mapbox autocomplete */}
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">🔍 Search Address (auto-fills below)</label>
                <input
                  type="text"
                  placeholder="Start typing an address..."
                  className="w-full px-3 py-2 text-sm bg-[#c9a84c]/10 border border-[#c9a84c]/40 rounded-xl focus:outline-none focus:border-[#c9a84c] placeholder-gray-400"
                  onChange={async (e) => {
                    const q = e.target.value.trim();
                    if (q.length < 3) return;
                    try {
                      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
                      if (!token) return;
                      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=us&types=address&access_token=${token}`);
                      const data = await res.json();
                      if (data.features?.[0]) {
                        const f = data.features[0];
                        const ctx = f.context || [];
                        const get = (id: string) => ctx.find((x: any) => x.id.startsWith(id))?.text || "";
                        const getShort = (id: string) => ctx.find((x: any) => x.id.startsWith(id))?.short_code?.replace("US-","") || "";
                        const street = (f.place_name || "").split(",")[0]?.trim() || "";
                        const city = get("place") || get("locality");
                        const state = getShort("region");
                        const zip = get("postcode");
                        const lat = f.center?.[1] || null;
                        const lng = f.center?.[0] || null;
                        setDeal(p => ({ ...p, assets: p.assets.map((a, i) => i === idx ? { ...a, address: street, city, state, zip: zip || "", lat, lng } : a) }));
                        if (lat && lng) lookupMSA(idx, lat, lng, city);
                      }
                    } catch(err) { console.error("Mapbox:", err); }
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Street Address *</label>
                <input value={asset.address} onChange={e => updAsset(idx, "address", e.target.value)} placeholder="123 Main St" className={inp} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <label className={labelClass}>City</label>
                  <input value={asset.city} onChange={e => updAsset(idx, "city", e.target.value)} placeholder="Miami" className={inp} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input value={asset.state} onChange={e => updAsset(idx, "state", e.target.value.toUpperCase())} placeholder="FL" maxLength={2} className={inp} />
                </div>
                <div>
                  <label className={labelClass}>Zip</label>
                  <input value={(asset as any).zip || ""} onChange={e => updAsset(idx, "zip" as any, e.target.value)} placeholder="33101" className={inp} />
                </div>
              </div>
            </div>

            {/* MSA Lookup */}
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => lookupMSA(idx, asset.lat || 0, asset.lng || 0, asset.city)}
                disabled={msaLoading || !asset.city}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 rounded-xl hover:border-[#0a1f44]/30 disabled:opacity-50">
                {msaLoading ? "Checking MSA..." : "🔍 Check MSA"}
              </button>
              {asset.msaResult && (
                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${asset.msaResult.tier === 1 ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                  {asset.msaResult.tier === 1 ? "✓ Major MSA" : "Secondary Market"} — {asset.msaResult.msaName}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loan Details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44]">Loan Details</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Loan Purpose *</label>
              <select value={deal.loanPurpose} onChange={e => updDeal("loanPurpose", e.target.value)} className={sel}>
                <option value="acquisition">Acquisition</option>
                <option value="refinance">Refinance (Rate & Term)</option>
                <option value="cash-out-refinance">Cash-Out Refinance</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Desired Term *</label>
              <select value={deal.desiredTerm} onChange={e => updDeal("desiredTerm", e.target.value)} className={sel}>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Loan Amount *</label>
              <input value={deal.loanAmount} onChange={e => updDeal("loanAmount", formatCurrencyInput(e.target.value))} placeholder="$5,000,000" className={inp} />
            </div>
            <div>
              <label className={labelClass}>Estimated Property Value *</label>
              <input value={deal.estimatedValue} onChange={e => updDeal("estimatedValue", formatCurrencyInput(e.target.value))} placeholder="$7,500,000" className={inp} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Existing Debt (if refinance)</label>
            <input value={deal.existingDebt} onChange={e => updDeal("existingDebt", formatCurrencyInput(e.target.value))} placeholder="$0" className={inp} />
          </div>
        </div>

        {/* Financials */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44]">Property Financials</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Gross Income (Annual) *</label>
              <input value={deal.grossIncome} onChange={e => updDeal("grossIncome", formatCurrencyInput(e.target.value))} placeholder="$600,000" className={inp} />
            </div>
            <div>
              <label className={labelClass}>Gross Expenses (Annual) *</label>
              <input value={deal.grossExpenses} onChange={e => updDeal("grossExpenses", formatCurrencyInput(e.target.value))} placeholder="$200,000" className={inp} />
            </div>
          </div>
          {(noi > 0 || parseMoney(deal.estimatedValue) > 0 || parseMoney(deal.loanAmount) > 0) && (() => {
            const propValCalc = parseMoney(deal.estimatedValue);
            const loanAmtCalc = parseMoney(deal.loanAmount);
            const capRate = propValCalc > 0 && noi > 0 ? (noi / propValCalc) * 100 : 0;
            const debtYieldCalc = loanAmtCalc > 0 && noi > 0 ? (noi / loanAmtCalc) * 100 : 0;
            const equityCalc = propValCalc > 0 && loanAmtCalc > 0 ? propValCalc - loanAmtCalc : 0;
            const isRefi = deal.loanPurpose === "refinance" || deal.loanPurpose === "cash-out-refinance";
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="rounded-xl border border-[#0a1f44]/10 bg-[#0a1f44]/5 p-3">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">NOI</div>
                  <div className="text-sm font-bold text-[#0a1f44]">{noi > 0 ? formatMoney(noi) + "/yr" : "—"}</div>
                </div>
                <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-3">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Cap Rate</div>
                  <div className={`text-sm font-bold ${capRate >= 5 ? "text-green-600" : capRate > 0 ? "text-amber-500" : "text-gray-400"}`}>{capRate > 0 ? capRate.toFixed(2) + "%" : "—"}</div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Debt Yield</div>
                  <div className={`text-sm font-bold ${debtYieldCalc >= 7.5 ? "text-green-600" : debtYieldCalc > 0 ? "text-amber-500" : "text-gray-400"}`}>{debtYieldCalc > 0 ? debtYieldCalc.toFixed(2) + "%" : "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{isRefi ? "Equity" : "Equity Required"}</div>
                  <div className={`text-sm font-bold ${equityCalc > 0 ? "text-[#0a1f44]" : "text-gray-400"}`}>{equityCalc > 0 ? formatMoney(equityCalc) : "—"}</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Guarantors */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44]">Guarantor / Carve-Out Information</div>
            <span className="text-xs text-gray-400">(Non-recourse with standard carve-outs)</span>
          </div>
          <div className="mb-2">
            <label className={labelClass}>Recourse Preference</label>
            <div className="flex gap-2">
              {[["non-recourse", "Non-Recourse (Standard)"], ["recourse", "Full Recourse (Override)"], ["", "Program Default"]].map(([val, label]) => (
                <button key={val} type="button" onClick={() => updDeal("recourseOverride", val as any)}
                  className={`px-3 py-1.5 text-xs rounded-xl border font-medium transition-all ${deal.recourseOverride === val ? "bg-[#0a1f44] text-white border-[#0a1f44]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0a1f44]/30"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {deal.guarantors.map((g, gi) => (
            <div key={gi} className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-gray-400">{deal.guarantors.length > 1 ? `Guarantor ${gi + 1}` : "Primary Guarantor"}</div>
                {deal.guarantors.length > 1 && (
                  <button type="button" onClick={() => updDeal("guarantors", deal.guarantors.filter((_, i) => i !== gi))}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-400 border border-red-200 rounded-lg hover:bg-red-50">
                    ✕ Remove
                  </button>
                )}
              </div>
              <div>
                <label className={labelClass}>Guarantor Name</label>
                <input value={g.name} onChange={e => { const gs = [...deal.guarantors]; gs[gi] = { ...gs[gi], name: e.target.value }; updDeal("guarantors", gs); }} placeholder="Full name" className={inp} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Net Worth</label>
                  <input value={g.netWorth} onChange={e => { const gs = [...deal.guarantors]; gs[gi] = { ...gs[gi], netWorth: formatCurrencyInput(e.target.value) }; updDeal("guarantors", gs); }} placeholder="$5,000,000" className={inp} />
                </div>
                <div>
                  <label className={labelClass}>Liquidity</label>
                  <input value={g.liquidity} onChange={e => { const gs = [...deal.guarantors]; gs[gi] = { ...gs[gi], liquidity: formatCurrencyInput(e.target.value) }; updDeal("guarantors", gs); }} placeholder="$500,000" className={inp} />
                </div>
                <div>
                  <label className={labelClass}>Credit Score</label>
                  <input value={g.creditScore} onChange={e => { const gs = [...deal.guarantors]; gs[gi] = { ...gs[gi], creditScore: e.target.value }; updDeal("guarantors", gs); }} placeholder="720" className={inp} />
                </div>
              </div>
            </div>
          ))}
          {/* Combined guarantor summary */}
          {deal.guarantors.length > 1 && (() => {
            const combinedNW = deal.guarantors.reduce((s, g) => s + parseMoney(g.netWorth), 0);
            const combinedLiq = deal.guarantors.reduce((s, g) => s + parseMoney(g.liquidity), 0);
            const topScore = Math.max(...deal.guarantors.map(g => parseInt(g.creditScore || "0") || 0));
            const loanAmt = parseMoney(deal.loanAmount);
            return (
              <div className="mt-2 p-3 bg-[#0a1f44]/5 border border-[#0a1f44]/10 rounded-xl">
                <div className="text-xs font-bold text-[#0a1f44] mb-2 uppercase tracking-wide">Combined Guarantor Totals</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-gray-400">Total Net Worth</div>
                    <div className="text-sm font-bold text-[#0a1f44]">{formatMoney(combinedNW)}</div>
                    {loanAmt > 0 && combinedNW < loanAmt && <div className="text-xs text-amber-500">⚠️ Below 1x loan</div>}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Total Liquidity</div>
                    <div className="text-sm font-bold text-[#0a1f44]">{formatMoney(combinedLiq)}</div>
                    {loanAmt > 0 && combinedLiq < loanAmt * 0.05 && <div className="text-xs text-amber-500">⚠️ Below 5% min</div>}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Highest Score</div>
                    <div className="text-sm font-bold text-[#0a1f44]">{topScore || "—"}</div>
                    {topScore > 0 && topScore < 680 && <div className="text-xs text-amber-500">⚠️ Below 680</div>}
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Individual warnings when single guarantor */}
          {deal.guarantors.length === 1 && (() => {
            const g = deal.guarantors[0];
            const loanAmt = parseMoney(deal.loanAmount);
            return (
              <div className="space-y-1">
                {g.netWorth && parseMoney(g.netWorth) < loanAmt && loanAmt > 0 && <div className="text-xs text-amber-500">⚠️ Net worth below 1x loan amount guideline</div>}
                {g.liquidity && parseMoney(g.liquidity) < loanAmt * 0.05 && loanAmt > 0 && <div className="text-xs text-amber-500">⚠️ Liquidity below typical 5% minimum</div>}
                {g.creditScore && parseInt(g.creditScore) < 680 && <div className="text-xs text-amber-500">⚠️ Credit score below typical 680 minimum</div>}
              </div>
            );
          })()}
          <button type="button" onClick={() => updDeal("guarantors", [...deal.guarantors, { name: "", netWorth: "", liquidity: "", creditScore: "" }])}
            className="text-xs font-semibold text-[#0a1f44] hover:underline mt-1 block">
            + Add Additional Guarantor
          </button>
        </div>

        {/* Submit */}
        <button onClick={calculate} disabled={calculating || !deal.capitalType || !deal.loanAmount || !deal.estimatedValue || !deal.grossIncome || !deal.assets[0]?.propertyType}
          className="w-full py-4 text-base font-bold bg-[#c9a84c] text-[#0a1f44] rounded-2xl hover:bg-[#c9a84c]/80 disabled:opacity-50 flex items-center justify-center gap-2">
          {calculating ? "Analyzing..." : <><Zap className="h-5 w-5" /> Analyze Deal & Find Lenders</>}
        </button>
      </div>
    );
  }

  // ── Disqualified ──────────────────────────────────────────────────────────
  if (step === "disqualified") {
    const programLabel = PROGRAM_LABELS[deal.capitalType] || deal.capitalType;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <div className="font-bold text-red-800 text-lg">This deal doesn't fit {programLabel}</div>
              <div className="text-sm text-red-600">Here's why it doesn't meet program requirements:</div>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            {disqualReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-3 bg-white border border-red-200 rounded-xl">
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{r}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <div className="font-bold text-[#0a1f44] mb-1">But don't worry — let's find the right fit</div>
              <div className="text-sm text-gray-600 mb-4">
                We've already captured all your deal information. Let's take this into <strong>Deal Matcher</strong>, where we have access to hundreds of lenders across bridge, CMBS, bank, debt fund, and more — one of them may be a perfect match.
              </div>
              <button onClick={() => onSendToDealMatcher({
                loanAmount: deal.loanAmount, estimatedValue: deal.estimatedValue,
                grossIncome: deal.grossIncome, grossExpenses: deal.grossExpenses,
                assetType: deal.assets[0]?.propertyType || "", numUnits: deal.assets[0]?.numUnits || "",
                address: deal.assets[0]?.address || "", city: deal.assets[0]?.city || "", state: deal.assets[0]?.state || "",
                loanPurpose: deal.loanPurpose, numAssets: deal.numAssets,
              })}
                className="flex items-center gap-2 px-6 py-3 bg-[#0a1f44] text-white rounded-xl font-bold text-sm hover:bg-[#0a1f44]/80">
                <ArrowRight className="h-4 w-4" /> Take This Deal to Deal Matcher →
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => setStep("intake")} className="w-full py-3 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Go Back & Adjust
        </button>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (step === "results" && results) {
    const { loanAmt, propVal, noi, ltv, dscrAtMax, dscrAtMin, debtYield, maxPayment, minPayment, maxAnnualDebtService, maxLoanByDSCR, maxLoanByLTV80, maxLoanByLTV65, maxLoanByDY, rateRange, isTier1, matchedLenders, warnings } = results;
    const programLabel = PROGRAM_LABELS[deal.capitalType];

    const metricBoxes = [
      { label: "MAX DSCR (Worst Rate)", value: dscrAtMax.toFixed(2) + "x", ok: dscrAtMax >= 1.25, warn: dscrAtMax >= 1.15 },
      { label: "MIN DSCR (Best Rate)", value: dscrAtMin.toFixed(2) + "x", ok: dscrAtMin >= 1.25, warn: dscrAtMin >= 1.15 },
      { label: "Debt Yield", value: debtYield.toFixed(1) + "%", ok: debtYield >= 7.5, warn: debtYield >= 6.5 },
      { label: "LTV", value: ltv.toFixed(1) + "%", ok: ltv <= 65, warn: ltv <= 80 },
      { label: "MAX Payment/Mo", value: "$" + Math.round(maxPayment).toLocaleString(), ok: true, warn: false },
      { label: "MAX Annual DS", value: formatMoney(maxAnnualDebtService), ok: true, warn: false },
      { label: "NOI", value: formatMoney(noi), ok: noi > 0, warn: false },
      { label: "Max Loan by DSCR", value: formatMoney(maxLoanByDSCR), ok: maxLoanByDSCR >= loanAmt, warn: false },
      { label: "Max Loan by LTV 80%", value: formatMoney(maxLoanByLTV80), ok: maxLoanByLTV80 >= loanAmt, warn: false },
      { label: "Max Loan by DY", value: formatMoney(maxLoanByDY), ok: maxLoanByDY >= loanAmt, warn: false },
    ];

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("intake")} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-bold text-[#0a1f44]">Deal Matcher</span>
          <span className="font-display text-xl font-bold text-[#c9a84c]"> PLUS+</span>
              <span className="text-sm text-gray-400 ml-2">Results</span>
            </div>
            <div className="text-xs text-gray-400">{programLabel} · {deal.desiredTerm}</div>
          </div>
          <div className="ml-auto px-4 py-2 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs font-bold text-green-700">Qualifies</span>
          </div>
        </div>

        {/* Rate Banner */}
        <div className="rounded-2xl bg-[#0a1f44] p-5 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">Rate Range ({deal.desiredTerm})</div>
            <div className="text-xl font-bold text-[#c9a84c]">{rateRange[0].toFixed(2)}% – {rateRange[1].toFixed(2)}%</div>
            <div className="text-xs text-white/40">{isTier1 ? "✓ Major MSA pricing" : "Secondary market"}</div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-xs text-white/50 mb-1">Index</div>
            <div className="text-lg font-bold text-white">{rates?.t10?.toFixed(2)}%</div>
            <div className="text-xs text-white/40">10yr Treasury</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">LTV Tier</div>
            <div className="text-lg font-bold text-white">{results.ltvTier === "tier1" ? "80%" : results.ltvTier === "tier2" ? "65%" : "55%"}</div>
            <div className="text-xs text-white/40">{results.ltvTier === "tier1" ? "1.25x DSCR min" : results.ltvTier === "tier2" ? "1.35x DSCR min" : "1.55x DSCR min"}</div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wide">
              <AlertTriangle className="h-4 w-4" /> Below Market Indicators — Review with Lender
            </div>
            {warnings.map((w: string, i: number) => <div key={i} className="text-xs text-amber-700 flex items-start gap-2"><span>⚠️</span>{w}</div>)}
          </div>
        )}

        {/* Metric Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metricBoxes.map(m => (
            <div key={m.label} className={`rounded-xl p-3 border ${m.ok ? "bg-green-50 border-green-200" : m.warn ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-xs text-gray-500 mb-1">{m.label}</div>
              <div className={`text-sm font-bold ${m.ok ? "text-green-700" : m.warn ? "text-amber-700" : "text-red-700"}`}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Matched Lenders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0a1f44]">
              Matched Lenders <span className="ml-2 px-2 py-0.5 bg-[#c9a84c]/20 text-[#0a1f44] rounded-full">{matchedLenders.length}</span>
            </div>
            <div className="text-xs text-gray-400">Agency lenders active in {deal.assets[0]?.state || "this state"}</div>
          </div>
          {matchedLenders.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">No agency lenders found in registry for this state. Try adding lenders or use Deal Matcher for broader results.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {matchedLenders.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-sm font-bold text-[#0a1f44]">{l.lender}</div>
                    <div className="text-xs text-gray-400">{l.type} · {l.minLoan} – {l.maxLoan}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.states?.includes(deal.assets[0]?.state) && <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">✓ {deal.assets[0]?.state}</span>}
                    <span className="text-xs px-2 py-0.5 bg-[#0a1f44]/10 text-[#0a1f44] rounded-full">{l.recourse}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setStep("intake")} className="py-3 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Adjust Deal
          </button>
          <button onClick={() => {
            const deal_id = Date.now();
            const advisors = teamMembers.filter((m: any) => m.role === "advisor");
            onSubmitDeal({
              id: deal_id, submittedAt: new Date().toLocaleString(),
              seekerName: session?.user?.name || "Admin",
              seekerEmail: session?.user?.username || "",
              assets: deal.assets.map(a => ({
                assetType: a.propertyType, loanAmount: deal.loanAmount,
                propertyValue: deal.estimatedValue, numUnits: a.numUnits,
                address: { street: a.address, city: a.city, state: a.state },
                currentNetIncome: String(noi),
              })),
              capitalType: PROGRAM_LABELS[deal.capitalType] || deal.capitalType,
              status: "pending",
              assignedAdvisorIds: advisors.slice(0, 1).map((a: any) => a.id),
              dealNumber: "",
              source: "deal-matcher-plus",
            });
          }}
            className="py-3 text-sm font-bold bg-[#c9a84c] text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/80 flex items-center justify-center gap-2">
            Submit Deal <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
