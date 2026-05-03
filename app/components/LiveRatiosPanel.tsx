"use client";

/**
 * CapMoon — Live Ratios Panel
 * ----------------------------
 * Displays every underwriting ratio live as the user fills in a deal form.
 *
 * Drop into:
 *   - PLUS+ program forms (e.g. Fannie DUS): pass `programId` to get pass/fail coloring
 *   - Premier Asset Details: omit `programId` — neutral display, no thresholds
 *
 * Usage:
 *   <LiveRatiosPanel
 *     deal={{ loanAmount, propertyValue, noi, interestRate: 0.0525, amortizationYears: 30 }}
 *     programId="fannie_dus"
 *   />
 *
 * Source of truth: capmoon_field_spec_v3.md, Section E.
 */

import {
  computeAllRatios,
  type DealInputs,
  type RatioSummary,
  fmt,
} from "../lib/deal-calcs";
import {
  PROGRAMS,
  type ProgramId,
  effectiveSizing,
  type SizingGuideline,
} from "../lib/program-guidelines";
import type { AssetType } from "../lib/deal-calcs";

// =============================================================================
// Types
// =============================================================================

export interface LiveRatiosPanelProps {
  deal: DealInputs;
  programId?: ProgramId;          // optional — enables program-aware coloring
  assetType?: AssetType;          // optional — enables asset-type sizing overrides
  className?: string;
  compact?: boolean;              // dense layout (fewer rows visible)
  hideEmpty?: boolean;            // default true — hide ratios with null values
  title?: string;
}

type Tone = "pass" | "warn" | "fail" | "neutral";

interface MetricRow {
  key: keyof RatioSummary;
  label: string;
  value: number | null;
  formatted: string;
  tone: Tone;
  tooltip?: string;
}

// =============================================================================
// Tone evaluation — given a metric and (optionally) program guideline
// =============================================================================

function evalTone(
  key: keyof RatioSummary,
  value: number | null,
  guide?: SizingGuideline,
): Tone {
  if (value === null) return "neutral";
  if (!guide) return "neutral";

  // Tolerance bands: pass if within program rule, warn if within 5%, fail beyond
  const within = (test: number, threshold: number, isMaxRule: boolean): Tone => {
    if (isMaxRule) {
      // Max rule: lower is better
      if (test <= threshold) return "pass";
      if (test <= threshold * 1.05) return "warn";
      return "fail";
    } else {
      // Min rule: higher is better
      if (test >= threshold) return "pass";
      if (test >= threshold * 0.95) return "warn";
      return "fail";
    }
  };

  switch (key) {
    case "ltv":
      return guide.maxLtv != null ? within(value, guide.maxLtv, true) : "neutral";
    case "ltc":
      return guide.maxLtc != null ? within(value, guide.maxLtc, true) : "neutral";
    case "arvLtv":
      return guide.maxArvLtv != null ? within(value, guide.maxArvLtv, true) : "neutral";
    case "aivLtv":
      return guide.maxAivLtv != null ? within(value, guide.maxAivLtv, true) : "neutral";
    case "dscr":
    case "stabilizedDscr":
      return guide.minDscr != null ? within(value, guide.minDscr, false) : "neutral";
    case "debtYieldPct":
      // value here is in % units (8.5 = 8.5%); guide.minDebtYield is decimal (0.085)
      return guide.minDebtYield != null
        ? within(value / 100, guide.minDebtYield, false)
        : "neutral";
    default:
      return "neutral";
  }
}

// =============================================================================
// Row builder
// =============================================================================

function buildRows(
  ratios: RatioSummary,
  guide?: SizingGuideline,
): MetricRow[] {
  return [
    {
      key: "ltv",
      label: "LTV",
      value: ratios.ltv,
      formatted: fmt.pct(ratios.ltv, 1),
      tone: evalTone("ltv", ratios.ltv, guide),
      tooltip: "Loan / Property Value",
    },
    {
      key: "ltc",
      label: "LTC",
      value: ratios.ltc,
      formatted: fmt.pct(ratios.ltc, 1),
      tone: evalTone("ltc", ratios.ltc, guide),
      tooltip: "Loan / Total Project Cost (construction)",
    },
    {
      key: "arvLtv",
      label: "ARV-LTV",
      value: ratios.arvLtv,
      formatted: fmt.pct(ratios.arvLtv, 1),
      tone: evalTone("arvLtv", ratios.arvLtv, guide),
      tooltip: "Loan / After Repair Value (physical-work value-add)",
    },
    {
      key: "aivLtv",
      label: "AIV-LTV",
      value: ratios.aivLtv,
      formatted: fmt.pct(ratios.aivLtv, 1),
      tone: evalTone("aivLtv", ratios.aivLtv, guide),
      tooltip: "Loan / After Improved Value (operational value-add)",
    },
    {
      key: "dscr",
      label: "DSCR",
      value: ratios.dscr,
      formatted: fmt.ratio(ratios.dscr, 2),
      tone: evalTone("dscr", ratios.dscr, guide),
      tooltip: "NOI / Annual Debt Service",
    },
    {
      key: "stabilizedDscr",
      label: "Stab DSCR",
      value: ratios.stabilizedDscr,
      formatted: fmt.ratio(ratios.stabilizedDscr, 2),
      tone: evalTone("stabilizedDscr", ratios.stabilizedDscr, guide),
      tooltip: "Stabilized NOI / Annual Debt Service",
    },
    {
      key: "debtYieldPct",
      label: "Debt Yield",
      value: ratios.debtYieldPct,
      formatted: ratios.debtYieldPct === null ? "—" : `${ratios.debtYieldPct.toFixed(2)}%`,
      tone: evalTone("debtYieldPct", ratios.debtYieldPct, guide),
      tooltip: "NOI / Loan — independent of rate/amort",
    },
    {
      key: "goingInCapRate",
      label: "Going-in Cap",
      value: ratios.goingInCapRate,
      formatted: fmt.pct(ratios.goingInCapRate, 2),
      tone: "neutral",
      tooltip: "Current NOI / Acquisition Price",
    },
    {
      key: "stabilizedCapRate",
      label: "Stab Cap",
      value: ratios.stabilizedCapRate,
      formatted: fmt.pct(ratios.stabilizedCapRate, 2),
      tone: "neutral",
      tooltip: "Stabilized NOI / ARV (or AIV)",
    },
    {
      key: "yieldOnCost",
      label: "Yield on Cost",
      value: ratios.yieldOnCost,
      formatted: fmt.pct(ratios.yieldOnCost, 2),
      tone: "neutral",
      tooltip: "Stabilized NOI / Total Project Cost",
    },
    {
      key: "profitMargin",
      label: "Profit Margin",
      value: ratios.profitMargin,
      formatted: fmt.pct(ratios.profitMargin, 1),
      tone: "neutral",
      tooltip: "(ARV − Total Project Cost) / Total Project Cost",
    },
    {
      key: "capRateCompressionBps",
      label: "Cap Compression",
      value: ratios.capRateCompressionBps,
      formatted: fmt.bps(ratios.capRateCompressionBps),
      tone: "neutral",
      tooltip: "Going-in cap minus stabilized cap, in basis points",
    },
    {
      key: "noiGrowthPct",
      label: "NOI Growth",
      value: ratios.noiGrowthPct,
      formatted: fmt.pct(ratios.noiGrowthPct, 1),
      tone: "neutral",
      tooltip: "(Stabilized NOI − In-place NOI) / In-place NOI",
    },
    {
      key: "opexRatio",
      label: "OpEx Ratio",
      value: ratios.opexRatio,
      formatted: fmt.pct(ratios.opexRatio, 1),
      tone: "neutral",
      tooltip: "Operating Expenses / Effective Gross Income",
    },
    {
      key: "annualDebtService",
      label: "Annual Debt Service",
      value: ratios.annualDebtService,
      formatted: fmt.money(ratios.annualDebtService),
      tone: "neutral",
      tooltip: "Annualized P&I (or interest-only) at current rate/amort",
    },
    {
      key: "totalCapitalization",
      label: "Total Capital",
      value: ratios.totalCapitalization,
      formatted: fmt.money(ratios.totalCapitalization),
      tone: "neutral",
      tooltip: "Sum of all sources (debt + mezz + pref + sponsor + LP equity)",
    },
    {
      key: "equityAvailable",
      label: "Equity to Close",
      value: ratios.equityAvailable,
      formatted: fmt.money(ratios.equityAvailable),
      tone: "neutral",
      tooltip: "Total Project Cost minus loan amount",
    },
    {
      key: "breakEvenOccupancy",
      label: "Break-even Occ",
      value: ratios.breakEvenOccupancy,
      formatted: fmt.pct(ratios.breakEvenOccupancy, 1),
      tone: "neutral",
      tooltip: "Physical occupancy needed to cover OpEx + debt service",
    },
    {
      key: "mortgageConstant",
      label: "Mortgage Constant",
      value: ratios.mortgageConstant,
      formatted: fmt.pct(ratios.mortgageConstant, 3),
      tone: "neutral",
      tooltip: "Annual debt service / loan — quick comparison across structures",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

const toneClasses: Record<Tone, string> = {
  pass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  warn: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  fail: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  neutral: "text-slate-200 bg-slate-700/30 border-slate-600/30",
};

const toneDot: Record<Tone, string> = {
  pass: "bg-emerald-400",
  warn: "bg-amber-400",
  fail: "bg-rose-400",
  neutral: "bg-slate-500",
};

export default function LiveRatiosPanel({
  deal,
  programId,
  assetType,
  className = "",
  compact = false,
  hideEmpty = true,
  title,
}: LiveRatiosPanelProps) {
  const ratios = computeAllRatios(deal);

  // Resolve program guideline if both program + asset type provided
  let guide: SizingGuideline | undefined;
  if (programId) {
    const program = PROGRAMS[programId];
    if (program) {
      guide =
        assetType && program.eligibleAssetTypes.includes(assetType)
          ? effectiveSizing(programId, assetType)
          : program.defaultSizing;
    }
  }

  let rows = buildRows(ratios, guide);
  if (hideEmpty) rows = rows.filter((r) => r.value !== null);

  const headerLabel =
    title ??
    (programId
      ? `Live Underwriting — ${PROGRAMS[programId]?.displayName ?? "Custom"}`
      : "Live Underwriting Metrics");

  // Constraint summary
  const constraintBadges: { label: string; value: string }[] = [];
  if (guide) {
    if (guide.maxLtv != null) constraintBadges.push({ label: "Max LTV", value: fmt.pct(guide.maxLtv, 0) });
    if (guide.maxLtc != null) constraintBadges.push({ label: "Max LTC", value: fmt.pct(guide.maxLtc, 0) });
    if (guide.minDscr != null) constraintBadges.push({ label: "Min DSCR", value: fmt.ratio(guide.minDscr, 2) });
    if (guide.minDebtYield != null)
      constraintBadges.push({ label: "Min DY", value: fmt.pct(guide.minDebtYield, 1) });
  }

  return (
    <div
      className={`rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          {headerLabel}
        </h3>
        {constraintBadges.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {constraintBadges.map((b) => (
              <span
                key={b.label}
                className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50"
                title={`Program threshold: ${b.label} = ${b.value}`}
              >
                {b.label}: <span className="text-slate-200 font-mono">{b.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Enter loan, value, NOI, and rate/amort to see live metrics.
        </p>
      ) : (
        <div
          className={`grid gap-2 ${
            compact
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {rows.map((row) => (
            <div
              key={String(row.key)}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${toneClasses[row.tone]}`}
              title={row.tooltip}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${toneDot[row.tone]}`} />
                <span className="text-xs uppercase tracking-wider text-slate-400 truncate">
                  {row.label}
                </span>
              </div>
              <span className="text-sm font-mono font-semibold flex-shrink-0">
                {row.formatted}
              </span>
            </div>
          ))}
        </div>
      )}

      {programId && (
        <p className="text-[10px] text-slate-500 mt-3 italic">
          🟢 within program · 🟡 within 5% tolerance · 🔴 outside program guidelines · ⚪ informational only
        </p>
      )}
    </div>
  );
}
