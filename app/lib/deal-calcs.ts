/**
 * CapMoon Deal Calculations Library
 * ----------------------------------
 * Pure functions for every underwriting ratio used by Deal Matcher PLUS+ and Premier.
 *
 * RULES:
 *   - All functions are pure: no side effects, no I/O.
 *   - Never throw. Return `null` when inputs are insufficient or invalid.
 *   - Decimal percentages by default (0.75 = 75%). Functions ending in `Pct`
 *     return human-readable percent numbers (75 = 75%) for display.
 *   - All money inputs are in dollars (numbers, not strings).
 *
 * Source of truth: capmoon_field_spec_v3.md, Section E.
 */

// =============================================================================
// Types
// =============================================================================

export type Posture = "land_or_demo" | "existing_kept" | "refinance";

export type Scope =
  | "ground_up"
  | "substantial_rehab"
  | "light_rehab"
  | "no_physical_work"
  | "mixed_light_and_metric"
  | "none"; // for straight refinance

export type AssetType =
  | "apartments"
  | "office"
  | "retail"
  | "industrial_warehouse"
  | "ios"
  | "hotel"
  | "self_storage"
  | "mfg_housing"
  | "student_housing"
  | "military_housing"
  | "senior_il"
  | "senior_al"
  | "senior_snf"
  | "memory_care"
  | "affordable_lihtc"
  | "cooperative"
  | "mixed_use_residential"
  | "mixed_use_commercial"
  | "short_term_rental"
  | "condo_inventory"
  | "urgent_care"
  | "casino"
  | "car_wash"
  | "car_dealership"
  | "land"
  | "other";

export interface DealInputs {
  // ----- Core financials -----
  loanAmount?: number | null;
  propertyValue?: number | null;
  acquisitionPrice?: number | null;
  totalProjectCost?: number | null;
  noi?: number | null;
  stabilizedNoi?: number | null;
  egi?: number | null;
  pgi?: number | null;
  opex?: number | null;
  grossIncome?: number | null;
  grossExpenses?: number | null;

  // ----- Stabilized / value-add -----
  arv?: number | null;
  aiv?: number | null;
  stabilizedCapRate?: number | null;

  // ----- Construction -----
  landCost?: number | null;
  softCosts?: number | null;
  hardCosts?: number | null;
  carryAndExitCosts?: number | null;

  // ----- Debt -----
  interestRate?: number | null;
  amortizationYears?: number | null;
  termYears?: number | null;
  isInterestOnly?: boolean | null;
  ioYears?: number | null;

  // ----- Refi-specific -----
  currentUpb?: number | null;
  originalCostBasis?: number | null;
  costToDate?: number | null;
  cashOutSought?: number | null;

  // ----- Operations -----
  physicalOccupancyPct?: number | null;
  economicOccupancyPct?: number | null;
  trailing3moOccupancyPct?: number | null;

  // ----- Sponsor -----
  sponsorNetWorth?: number | null;
  sponsorLiquidity?: number | null;
  sponsorFico?: number | null;

  // ----- Equity stack -----
  sponsorEquity?: number | null;
  lpEquity?: number | null;
  mezzAmount?: number | null;
  prefEquityAmount?: number | null;
}

// =============================================================================
// Helpers
// =============================================================================

const isPos = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

const isNonNeg = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;

const round = (n: number, places = 4): number => {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
};

// =============================================================================
// Debt service
// =============================================================================

export function annualDebtService(d: DealInputs): number | null {
  const { loanAmount, interestRate, amortizationYears, isInterestOnly } = d;
  if (!isPos(loanAmount) || !isPos(interestRate)) return null;

  if (isInterestOnly) {
    return round(loanAmount * interestRate, 2);
  }

  if (!isPos(amortizationYears)) return null;

  const monthlyRate = interestRate / 12;
  const months = amortizationYears * 12;
  const monthlyPmt =
    (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return round(monthlyPmt * 12, 2);
}

export function mortgageConstant(d: DealInputs): number | null {
  const ads = annualDebtService(d);
  if (ads === null || !isPos(d.loanAmount)) return null;
  return round(ads / d.loanAmount, 6);
}

// =============================================================================
// Core ratios
// =============================================================================

export function ltv(d: DealInputs): number | null {
  if (!isPos(d.loanAmount) || !isPos(d.propertyValue)) return null;
  return round(d.loanAmount / d.propertyValue, 4);
}

export function ltc(d: DealInputs): number | null {
  if (!isPos(d.loanAmount) || !isPos(d.totalProjectCost)) return null;
  return round(d.loanAmount / d.totalProjectCost, 4);
}

export function arvLtv(d: DealInputs): number | null {
  if (!isPos(d.loanAmount) || !isPos(d.arv)) return null;
  return round(d.loanAmount / d.arv, 4);
}

export function aivLtv(d: DealInputs): number | null {
  if (!isPos(d.loanAmount) || !isPos(d.aiv)) return null;
  return round(d.loanAmount / d.aiv, 4);
}

export function dscr(d: DealInputs): number | null {
  const ads = annualDebtService(d);
  if (ads === null || !isPos(d.noi)) return null;
  return round(d.noi / ads, 4);
}

export function stabilizedDscr(d: DealInputs): number | null {
  const ads = annualDebtService(d);
  if (ads === null || !isPos(d.stabilizedNoi)) return null;
  return round(d.stabilizedNoi / ads, 4);
}

export function debtYield(d: DealInputs): number | null {
  if (!isPos(d.noi) || !isPos(d.loanAmount)) return null;
  return round(d.noi / d.loanAmount, 4);
}

export function debtYieldPct(d: DealInputs): number | null {
  const dy = debtYield(d);
  return dy === null ? null : round(dy * 100, 2);
}

// =============================================================================
// Cap rates and yield on cost
// =============================================================================

export function goingInCapRate(d: DealInputs): number | null {
  if (!isPos(d.noi)) return null;
  const denom = isPos(d.acquisitionPrice) ? d.acquisitionPrice : d.propertyValue;
  if (!isPos(denom)) return null;
  return round(d.noi / denom, 4);
}

export function stabilizedCapRate(d: DealInputs): number | null {
  if (!isPos(d.stabilizedNoi)) return null;
  const exit = isPos(d.arv) ? d.arv : d.aiv;
  if (!isPos(exit)) return null;
  return round(d.stabilizedNoi / exit, 4);
}

export function yieldOnCost(d: DealInputs): number | null {
  if (!isPos(d.stabilizedNoi) || !isPos(d.totalProjectCost)) return null;
  return round(d.stabilizedNoi / d.totalProjectCost, 4);
}

export function profitMargin(d: DealInputs): number | null {
  if (!isPos(d.arv) || !isPos(d.totalProjectCost)) return null;
  return round((d.arv - d.totalProjectCost) / d.totalProjectCost, 4);
}

export function capRateCompressionBps(d: DealInputs): number | null {
  const going = goingInCapRate(d);
  const exit = stabilizedCapRate(d);
  if (going === null || exit === null) return null;
  return round((going - exit) * 10000, 0);
}

// =============================================================================
// NOI helpers
// =============================================================================

export function deriveNoi(d: DealInputs): number | null {
  if (isPos(d.noi)) return d.noi;
  if (isPos(d.egi) && isNonNeg(d.opex)) return round(d.egi - d.opex, 2);
  if (isPos(d.grossIncome) && isNonNeg(d.grossExpenses)) {
    return round(d.grossIncome - d.grossExpenses, 2);
  }
  return null;
}

export function opexRatio(d: DealInputs): number | null {
  if (!isPos(d.egi) || !isNonNeg(d.opex)) return null;
  return round(d.opex / d.egi, 4);
}

export function noiGrowthPct(d: DealInputs): number | null {
  if (!isPos(d.noi) || !isPos(d.stabilizedNoi)) return null;
  return round((d.stabilizedNoi - d.noi) / d.noi, 4);
}

// =============================================================================
// Sizing — max loan amount given each constraint test
// =============================================================================

export interface SizingInputs {
  noi?: number | null;
  stabilizedNoi?: number | null;
  propertyValue?: number | null;
  totalProjectCost?: number | null;
  arv?: number | null;
  aiv?: number | null;
  interestRate?: number | null;
  amortizationYears?: number | null;
  isInterestOnly?: boolean | null;
}

export interface SizingConstraints {
  maxLtv?: number | null;
  maxLtc?: number | null;
  maxArvLtv?: number | null;
  maxAivLtv?: number | null;
  minDscr?: number | null;
  minDebtYield?: number | null;
}

export interface SizingResult {
  maxLoan: number | null;
  bindingConstraint: string | null;
  byConstraint: Record<string, number | null>;
}

export function sizeLoan(
  inputs: SizingInputs,
  constraints: SizingConstraints,
): SizingResult {
  const results: Record<string, number | null> = {};

  if (isPos(constraints.maxLtv) && isPos(inputs.propertyValue)) {
    results.ltv = round(inputs.propertyValue * constraints.maxLtv, 2);
  }

  if (isPos(constraints.maxLtc) && isPos(inputs.totalProjectCost)) {
    results.ltc = round(inputs.totalProjectCost * constraints.maxLtc, 2);
  }

  if (isPos(constraints.maxArvLtv) && isPos(inputs.arv)) {
    results.arvLtv = round(inputs.arv * constraints.maxArvLtv, 2);
  }

  if (isPos(constraints.maxAivLtv) && isPos(inputs.aiv)) {
    results.aivLtv = round(inputs.aiv * constraints.maxAivLtv, 2);
  }

  if (
    isPos(constraints.minDscr) &&
    isPos(inputs.noi) &&
    isPos(inputs.interestRate)
  ) {
    let mortConstant: number | null = null;
    if (inputs.isInterestOnly) {
      mortConstant = inputs.interestRate;
    } else if (isPos(inputs.amortizationYears)) {
      const monthlyRate = inputs.interestRate / 12;
      const months = inputs.amortizationYears * 12;
      mortConstant =
        (12 * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }
    if (mortConstant && mortConstant > 0) {
      results.dscr = round(
        inputs.noi / (constraints.minDscr * mortConstant),
        2,
      );
    }
  }

  if (isPos(constraints.minDebtYield) && isPos(inputs.noi)) {
    results.debtYield = round(inputs.noi / constraints.minDebtYield, 2);
  }

  const valid = Object.entries(results).filter(
    ([, v]) => v !== null && v !== undefined && v > 0,
  ) as [string, number][];

  if (valid.length === 0) {
    return { maxLoan: null, bindingConstraint: null, byConstraint: results };
  }

  const [binding, maxLoan] = valid.reduce((min, curr) =>
    curr[1] < min[1] ? curr : min,
  );

  return {
    maxLoan: round(maxLoan, 2),
    bindingConstraint: binding,
    byConstraint: results,
  };
}

// =============================================================================
// Stress tests
// =============================================================================

export function stressedDscr(
  d: DealInputs,
  bpsIncrease: number,
): number | null {
  if (!isPos(d.noi) || !isPos(d.interestRate)) return null;
  const stressedRate = d.interestRate + bpsIncrease / 10000;
  const stressedAds = annualDebtService({ ...d, interestRate: stressedRate });
  if (stressedAds === null) return null;
  return round(d.noi / stressedAds, 4);
}

export function stressedNoiDscr(
  d: DealInputs,
  noiHaircutPct: number,
): number | null {
  if (!isPos(d.noi)) return null;
  const stressedNoi = d.noi * (1 - noiHaircutPct);
  const ads = annualDebtService(d);
  if (ads === null) return null;
  return round(stressedNoi / ads, 4);
}

export function breakEvenOccupancy(d: DealInputs): number | null {
  if (!isPos(d.pgi) || !isNonNeg(d.opex)) return null;
  const ads = annualDebtService(d);
  if (ads === null) return null;
  return round((d.opex + ads) / d.pgi, 4);
}

// =============================================================================
// Refi gap
// =============================================================================

export function refiGap(
  d: DealInputs,
  projectedFutureValue: number,
  takeoutMaxLtv: number,
): number | null {
  if (!isPos(d.loanAmount) || !isPos(d.interestRate)) return null;
  if (!isPos(d.amortizationYears) || !isPos(d.termYears)) return null;
  if (!isPos(projectedFutureValue) || !isPos(takeoutMaxLtv)) return null;

  const monthlyRate = d.interestRate / 12;
  const totalMonths = d.amortizationYears * 12;
  const elapsedMonths = d.termYears * 12;
  const monthlyPmt =
    (d.loanAmount * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -totalMonths));

  const remainingBalance =
    d.loanAmount * Math.pow(1 + monthlyRate, elapsedMonths) -
    monthlyPmt *
      ((Math.pow(1 + monthlyRate, elapsedMonths) - 1) / monthlyRate);

  const takeoutProceeds = projectedFutureValue * takeoutMaxLtv;
  return round(remainingBalance - takeoutProceeds, 2);
}

// =============================================================================
// Capital stack helpers
// =============================================================================

export function totalCapitalization(d: DealInputs): number | null {
  const parts = [
    d.loanAmount,
    d.mezzAmount,
    d.prefEquityAmount,
    d.sponsorEquity,
    d.lpEquity,
  ].filter(isNonNeg);
  if (parts.length === 0) return null;
  return round(parts.reduce((a, b) => a + b, 0), 2);
}

export function equityAvailable(d: DealInputs): number | null {
  const tpc = isPos(d.totalProjectCost)
    ? d.totalProjectCost
    : d.acquisitionPrice;
  if (!isPos(tpc) || !isPos(d.loanAmount)) return null;
  return round(tpc - d.loanAmount, 2);
}

// =============================================================================
// Deriving ARV / AIV from stabilized NOI + cap rate
// =============================================================================

export function deriveArvFromCap(d: DealInputs): number | null {
  if (!isPos(d.stabilizedNoi) || !isPos(d.stabilizedCapRate)) return null;
  return round(d.stabilizedNoi / d.stabilizedCapRate, 2);
}

export function deriveAivFromCap(d: DealInputs): number | null {
  return deriveArvFromCap(d);
}

// =============================================================================
// All-in summary — call this once and get every ratio for display
// =============================================================================

export interface RatioSummary {
  ltv: number | null;
  ltc: number | null;
  arvLtv: number | null;
  aivLtv: number | null;
  dscr: number | null;
  stabilizedDscr: number | null;
  debtYieldPct: number | null;
  goingInCapRate: number | null;
  stabilizedCapRate: number | null;
  yieldOnCost: number | null;
  profitMargin: number | null;
  capRateCompressionBps: number | null;
  noiGrowthPct: number | null;
  opexRatio: number | null;
  mortgageConstant: number | null;
  totalCapitalization: number | null;
  equityAvailable: number | null;
  annualDebtService: number | null;
  breakEvenOccupancy: number | null;
}

export function computeAllRatios(d: DealInputs): RatioSummary {
  const enriched: DealInputs = { ...d };
  if (!isPos(enriched.noi)) {
    const derived = deriveNoi(d);
    if (derived !== null) enriched.noi = derived;
  }

  return {
    ltv: ltv(enriched),
    ltc: ltc(enriched),
    arvLtv: arvLtv(enriched),
    aivLtv: aivLtv(enriched),
    dscr: dscr(enriched),
    stabilizedDscr: stabilizedDscr(enriched),
    debtYieldPct: debtYieldPct(enriched),
    goingInCapRate: goingInCapRate(enriched),
    stabilizedCapRate: stabilizedCapRate(enriched),
    yieldOnCost: yieldOnCost(enriched),
    profitMargin: profitMargin(enriched),
    capRateCompressionBps: capRateCompressionBps(enriched),
    noiGrowthPct: noiGrowthPct(enriched),
    opexRatio: opexRatio(enriched),
    mortgageConstant: mortgageConstant(enriched),
    totalCapitalization: totalCapitalization(enriched),
    equityAvailable: equityAvailable(enriched),
    annualDebtService: annualDebtService(enriched),
    breakEvenOccupancy: breakEvenOccupancy(enriched),
  };
}

// =============================================================================
// Display formatters (for UI)
// =============================================================================

export const fmt = {
  pct: (n: number | null, places = 2): string =>
    n === null ? "—" : `${(n * 100).toFixed(places)}%`,
  ratio: (n: number | null, places = 2): string =>
    n === null ? "—" : `${n.toFixed(places)}x`,
  money: (n: number | null): string =>
    n === null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`,
  bps: (n: number | null): string => (n === null ? "—" : `${n} bps`),
  number: (n: number | null, places = 2): string =>
    n === null ? "—" : n.toFixed(places),
};
