/**
 * CapMoon Program Guidelines
 * --------------------------
 * Single source of truth for every PLUS+ program's underwriting rules.
 *
 * Powers:
 *   - Field gating (which fields render for which program)
 *   - Property type allow-lists (DUS doesn't show retail, etc.)
 *   - Posture/scope eligibility (HUD 223(f) blocks construction)
 *   - Sizing constraint defaults (LTV/LTC/DSCR/Debt Yield floors and ceilings)
 *   - Soft warnings (FICO floor, occupancy floor, etc.)
 *   - Smart redirects ("221(d)(4) doesn't allow light rehab → try 223(f)")
 *
 * Source of truth: capmoon_field_spec_v3.md, Section G.
 *
 * REMOVED from PLUS+ per Justin (May 3, 2026):
 *   - Generic Bridge Loan (no published rulebook) → Premier
 *   - Generic Construction Loan (no published rulebook) → Premier
 *
 * Keep all 11 programs below as PLUS+ entries. Each PLUS+ program must have a
 * published guideline-set we can audit deals against; no exceptions.
 */

import type { Posture, Scope, AssetType } from "./deal-calcs";

// =============================================================================
// Types
// =============================================================================

export type ProgramId =
  | "fannie_dus"
  | "fannie_small"
  | "freddie_optigo"
  | "freddie_sbl"
  | "hud_223f"
  | "hud_221d4"
  | "hud_223a7"
  | "hud_232"
  | "cmbs_conduit"
  | "life_company"
  | "sba_504";

export type ProgramCategory =
  | "agency"        // Fannie / Freddie
  | "hud"           // HUD/FHA
  | "cmbs"
  | "life_co"
  | "sba";

export interface SizingGuideline {
  maxLtv?: number;          // 0.80 = 80%
  maxLtc?: number;
  maxArvLtv?: number;
  maxAivLtv?: number;
  minDscr?: number;         // 1.25 = 1.25x
  minDebtYield?: number;    // 0.08 = 8%
  minLoanSize?: number;     // dollars
  maxLoanSize?: number;     // null/undefined means no max
  minTermYears?: number;
  maxTermYears?: number;
  amortizationYearsTypical?: number;
  notes?: string;
}

export interface PropertyTypeRule {
  assetType: AssetType;
  override?: SizingGuideline;   // overrides default if this property type
}

export interface SoftWarning {
  id: string;                   // unique within program, used as React key
  field: string;                // dot-path to deal field
  test: "min" | "max" | "equals" | "contains";
  threshold: number | string | boolean;
  severity: "info" | "warn" | "block_admin";
  message: string;              // shown to user/admin
  recommendedProgram?: ProgramId;  // for smart redirects
}

export interface ProgramGuideline {
  id: ProgramId;
  category: ProgramCategory;
  displayName: string;
  shortDescription: string;     // For dropdown row, e.g. "80% LTV · 1.25x DSCR · 5–15yr"
  longDescription: string;      // For info tooltip / program detail page

  // Eligibility
  eligiblePostures: Posture[];
  eligibleScopes: Scope[];
  eligibleAssetTypes: AssetType[];

  // Default sizing for this program (typical asset)
  defaultSizing: SizingGuideline;

  // Asset-type-specific overrides (e.g. HUD 232 SNF DSCR floor 1.45 vs IL 1.30)
  assetTypeOverrides?: PropertyTypeRule[];

  // Required vs. optional fields beyond universal core
  requiredFields: string[];
  optionalFields?: string[];

  // Soft warnings — never blocking; fire when triggered
  warnings: SoftWarning[];

  // Auto-calc rules unique to this program (e.g. HUD MIP %)
  autoCalcRules?: {
    field: string;
    formula: string;            // human-readable, computed in form layer
    description: string;
  }[];

  // Recommended live-rate index from FRED
  baseRateIndex: "10yr_treasury" | "7yr_treasury" | "5yr_treasury" | "30yr_treasury" | "sofr_30d" | "prime";
  spreadRangeBps: [number, number];   // e.g. [120, 180] = 120-180bps over base
}

// =============================================================================
// Programs
// =============================================================================

export const PROGRAMS: Record<ProgramId, ProgramGuideline> = {
  // ---------------------------------------------------------------------------
  // FANNIE MAE CONVENTIONAL DUS
  // ---------------------------------------------------------------------------
  fannie_dus: {
    id: "fannie_dus",
    category: "agency",
    displayName: "Fannie Mae Conventional DUS",
    shortDescription: "80% LTV · 1.25x DSCR · 5–15yr",
    longDescription:
      "Standard Fannie Mae multifamily loan via the Delegated Underwriting and Servicing program. " +
      "Stabilized 5+ unit properties. Non-recourse with standard carve-outs. Single-asset entity required.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work", "light_rehab"],
    eligibleAssetTypes: [
      "apartments",
      "student_housing",
      "military_housing",
      "senior_il",
      "affordable_lihtc",
      "mfg_housing",
      "cooperative",
      "mixed_use_residential",
    ],
    defaultSizing: {
      maxLtv: 0.80,
      minDscr: 1.25,
      minLoanSize: 750_000,
      minTermYears: 5,
      maxTermYears: 15,
      amortizationYearsTypical: 30,
      notes: "75% LTV on refinance. 65% in Pre-Review markets without waiver.",
    },
    assetTypeOverrides: [
      {
        assetType: "affordable_lihtc",
        override: { maxLtv: 0.80, minDscr: 1.20 },
      },
    ],
    requiredFields: [
      "propertyType",
      "numberOfUnits",
      "address",
      "loanPurpose",
      "loanAmount",
      "purchasePrice",
      "grossIncome",
      "grossExpenses",
      "primaryGuarantor.name",
      "primaryGuarantor.netWorth",
      "primaryGuarantor.liquidity",
      "primaryGuarantor.fico",
    ],
    optionalFields: [
      "msaTier",
      "physicalOccupancyPct",
      "economicOccupancyPct",
      "studentConcentrationPct",
      "militaryConcentrationPct",
      "commercialNraPct",
      "commercialEgiPct",
      "yearBuilt",
      "yearRenovated",
      "saeConfirmed",
    ],
    warnings: [
      {
        id: "occupancy_below_85",
        field: "trailing3moOccupancyPct",
        test: "min",
        threshold: 0.85,
        severity: "warn",
        message: "Trailing 3-month physical occupancy below 85%. DUS standard underwriting requires 85%+.",
      },
      {
        id: "fico_below_680",
        field: "primaryGuarantor.fico",
        test: "min",
        threshold: 680,
        severity: "warn",
        message: "Guarantor FICO below 680. DUS typical floor is 680.",
      },
      {
        id: "student_over_80",
        field: "studentConcentrationPct",
        test: "max",
        threshold: 0.80,
        severity: "warn",
        message: "Student concentration above 80%. Switch to Fannie Mae Student Housing program.",
      },
      {
        id: "military_over_80",
        field: "militaryConcentrationPct",
        test: "max",
        threshold: 0.80,
        severity: "warn",
        message: "Military concentration above 80%. Switch to Fannie Mae Military Housing program.",
      },
      {
        id: "commercial_nra_over_35",
        field: "commercialNraPct",
        test: "max",
        threshold: 0.35,
        severity: "warn",
        message: "Commercial NRA over 35% — exceeds DUS limit.",
      },
      {
        id: "commercial_egi_over_20",
        field: "commercialEgiPct",
        test: "max",
        threshold: 0.20,
        severity: "warn",
        message: "Commercial EGI contribution over 20% — exceeds DUS limit.",
      },
      {
        id: "loan_below_750k",
        field: "loanAmount",
        test: "min",
        threshold: 750_000,
        severity: "warn",
        message: "Loan size below $750K — Fannie Mae Small Loan may be a better fit.",
        recommendedProgram: "fannie_small",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [110, 180],
  },

  // ---------------------------------------------------------------------------
  // FANNIE MAE SMALL LOAN
  // ---------------------------------------------------------------------------
  fannie_small: {
    id: "fannie_small",
    category: "agency",
    displayName: "Fannie Mae Small Loan",
    shortDescription: "$750K–$9M · 80% LTV · 1.25x DSCR",
    longDescription:
      "Streamlined Fannie Mae small-balance product for 5+ unit multifamily, $750K–$9M. " +
      "Less stringent docs than DUS Standard. Same DSCR/LTV as DUS but faster.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work", "light_rehab"],
    eligibleAssetTypes: [
      "apartments",
      "student_housing",
      "senior_il",
      "affordable_lihtc",
      "mfg_housing",
      "cooperative",
    ],
    defaultSizing: {
      maxLtv: 0.80,
      minDscr: 1.25,
      minLoanSize: 750_000,
      maxLoanSize: 9_000_000,
      minTermYears: 5,
      maxTermYears: 30,
      amortizationYearsTypical: 30,
      notes: "$5M cap in eligible MSAs (Baltimore/Boston/Chicago/LA/NY/Sacramento/SD/SF/SJ/Seattle/DC). Otherwise $3M.",
    },
    requiredFields: [
      "propertyType",
      "numberOfUnits",
      "address",
      "loanPurpose",
      "loanAmount",
      "grossIncome",
      "grossExpenses",
      "primaryGuarantor.name",
      "primaryGuarantor.fico",
    ],
    optionalFields: [
      "isInEligibleMsa",
      "seismicZone",
      "yearBuilt",
      "preMasonryPre1980",
    ],
    warnings: [
      {
        id: "loan_above_9m",
        field: "loanAmount",
        test: "max",
        threshold: 9_000_000,
        severity: "warn",
        message: "Loan above $9M — exceeds Small Loan cap. Use Fannie Mae Conventional DUS.",
        recommendedProgram: "fannie_dus",
      },
      {
        id: "fico_below_680",
        field: "primaryGuarantor.fico",
        test: "min",
        threshold: 680,
        severity: "warn",
        message: "Guarantor FICO below 680.",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [120, 200],
  },

  // ---------------------------------------------------------------------------
  // FREDDIE MAC OPTIGO CONVENTIONAL
  // ---------------------------------------------------------------------------
  freddie_optigo: {
    id: "freddie_optigo",
    category: "agency",
    displayName: "Freddie Mac Optigo Conventional",
    shortDescription: "80% LTV · 1.25x DSCR · 5–15yr",
    longDescription:
      "Freddie Mac's flagship multifamily program. Stabilized properties. " +
      "Non-recourse, fixed/floating, 5–15yr terms.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work", "light_rehab"],
    eligibleAssetTypes: [
      "apartments",
      "student_housing",
      "senior_il",
      "affordable_lihtc",
      "mfg_housing",
      "mixed_use_residential",
    ],
    defaultSizing: {
      maxLtv: 0.80,
      minDscr: 1.25,
      minLoanSize: 7_500_000,
      minTermYears: 5,
      maxTermYears: 15,
      amortizationYearsTypical: 30,
    },
    requiredFields: [
      "propertyType",
      "numberOfUnits",
      "address",
      "loanAmount",
      "purchasePrice",
      "grossIncome",
      "grossExpenses",
      "primaryGuarantor.name",
    ],
    warnings: [
      {
        id: "loan_below_7_5m",
        field: "loanAmount",
        test: "min",
        threshold: 7_500_000,
        severity: "warn",
        message: "Loan below $7.5M — Freddie Mac SBL is a better fit.",
        recommendedProgram: "freddie_sbl",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [110, 180],
  },

  // ---------------------------------------------------------------------------
  // FREDDIE MAC SMALL BALANCE LOAN (SBL)
  // ---------------------------------------------------------------------------
  freddie_sbl: {
    id: "freddie_sbl",
    category: "agency",
    displayName: "Freddie Mac Small Balance Loan",
    shortDescription: "$1M–$7.5M · 80% LTV · 1.20x DSCR",
    longDescription:
      "Freddie Mac's small-balance multifamily product, $1M–$7.5M (or $6M in smaller markets), " +
      "5–50 units. Non-recourse, hybrid ARM or fixed.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work", "light_rehab"],
    eligibleAssetTypes: ["apartments", "affordable_lihtc"],
    defaultSizing: {
      maxLtv: 0.80,
      minDscr: 1.20,
      minLoanSize: 1_000_000,
      maxLoanSize: 7_500_000,
      minTermYears: 5,
      maxTermYears: 20,
      amortizationYearsTypical: 30,
      notes: "DSCR varies by market tier (1.20 Top → 1.50 Small for IO).",
    },
    requiredFields: [
      "propertyType",
      "numberOfUnits",
      "address",
      "loanAmount",
      "grossIncome",
      "grossExpenses",
      "primaryGuarantor.name",
      "primaryGuarantor.fico",
      "primaryGuarantor.netWorth",
    ],
    optionalFields: [
      "marketTier",
      "trailing3moOccupancyPct",
      "yearsOfMultifamilyExperience",
      "numberOfPropertiesOwned",
    ],
    warnings: [
      {
        id: "fico_below_650",
        field: "primaryGuarantor.fico",
        test: "min",
        threshold: 650,
        severity: "warn",
        message: "FICO below 650 — SBL minimum is 650.",
      },
      {
        id: "net_worth_below_loan",
        field: "primaryGuarantor.netWorth",
        test: "min",
        threshold: "loanAmount", // Compared dynamically — engineer should resolve
        severity: "warn",
        message: "Net worth must equal or exceed the loan amount.",
      },
      {
        id: "occupancy_below_90",
        field: "trailing3moOccupancyPct",
        test: "min",
        threshold: 0.90,
        severity: "info",
        message: "Trailing 3-mo occupancy below 90%. SBL standard is 90%; 85% may apply with exceptions.",
      },
      {
        id: "loan_above_7_5m",
        field: "loanAmount",
        test: "max",
        threshold: 7_500_000,
        severity: "warn",
        message: "Loan above $7.5M — use Freddie Mac Optigo Conventional.",
        recommendedProgram: "freddie_optigo",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [130, 220],
  },

  // ---------------------------------------------------------------------------
  // HUD 223(f) — Acq/Refi
  // ---------------------------------------------------------------------------
  hud_223f: {
    id: "hud_223f",
    category: "hud",
    displayName: "HUD 223(f)",
    shortDescription: "Acq/Refi · 85% LTV · 1.18x DSCR · 35yr fixed",
    longDescription:
      "HUD/FHA-insured loan for acquisition or refinance of existing stabilized multifamily " +
      "(5+ units, ≥3 yrs post-construction). Non-recourse, fully amortizing, 35-yr fixed. " +
      "DOES NOT allow new construction or substantial rehab.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work", "light_rehab"],
    eligibleAssetTypes: [
      "apartments",
      "affordable_lihtc",
      "senior_il",
      "mfg_housing",
    ],
    defaultSizing: {
      maxLtv: 0.85,        // market-rate; 90% affordable/subsidized
      maxLtc: 0.85,
      minDscr: 1.18,       // market-rate; 1.11 affordable/subsidized
      minLoanSize: 1_500_000,
      maxTermYears: 35,
      amortizationYearsTypical: 35,
      notes: "Stabilized only — substantial rehab forces 221(d)(4).",
    },
    assetTypeOverrides: [
      {
        assetType: "affordable_lihtc",
        override: { maxLtv: 0.90, minDscr: 1.11 },
      },
    ],
    requiredFields: [
      "propertyType",
      "numberOfUnits",
      "address",
      "loanPurpose",
      "loanAmount",
      "grossIncome",
      "grossExpenses",
      "yearBuilt",
      "trailing3moOccupancyPct",
      "primaryGuarantor.name",
    ],
    optionalFields: [
      "rentalAssistancePct",
      "isMarketRateOrAffordable",
      "hudMultifamilyRegion",
      "mostRecentReacScore",
    ],
    warnings: [
      {
        id: "construction_not_allowed",
        field: "scope",
        test: "equals",
        threshold: "ground_up",
        severity: "warn",
        message: "HUD 223(f) does not allow new construction. Use HUD 221(d)(4).",
        recommendedProgram: "hud_221d4",
      },
      {
        id: "substantial_rehab_not_allowed",
        field: "scope",
        test: "equals",
        threshold: "substantial_rehab",
        severity: "warn",
        message: "HUD 223(f) does not allow substantial rehab. Use HUD 221(d)(4).",
        recommendedProgram: "hud_221d4",
      },
      {
        id: "year_built_too_recent",
        field: "yearBuilt",
        test: "max",
        threshold: 2023, // dynamic — calculate as currentYear - 3
        severity: "info",
        message: "Property must be at least 3 years post-construction for 223(f).",
      },
    ],
    autoCalcRules: [
      {
        field: "hudMip",
        formula: "loanAmount * 0.0060",
        description: "MIP: 0.60% market-rate, 0.45% Section 8/LIHTC, 0.25% green",
      },
      {
        field: "hudApplicationFee",
        formula: "loanAmount * 0.0030",
        description: "HUD application fee: 0.30% of mortgage amount",
      },
      {
        field: "hudInspectionFee",
        formula: "loanAmount * 0.0050",
        description: "HUD inspection fee: 0.50%",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [120, 200],
  },

  // ---------------------------------------------------------------------------
  // HUD 221(d)(4) — New Construction / Substantial Rehab
  // ---------------------------------------------------------------------------
  hud_221d4: {
    id: "hud_221d4",
    category: "hud",
    displayName: "HUD 221(d)(4)",
    shortDescription: "New Construction · 87% LTC · 1.15x DSCR · 40yr",
    longDescription:
      "HUD/FHA-insured construction or substantial rehab loan for 5+ unit multifamily. " +
      "3-year IO construction period + 40-year fully-amortizing perm. Non-recourse. " +
      "Davis-Bacon prevailing wages required. Min loan typically $4–10M.",
    eligiblePostures: ["land_or_demo", "existing_kept", "refinance"],
    eligibleScopes: ["ground_up", "substantial_rehab"],
    eligibleAssetTypes: [
      "apartments",
      "affordable_lihtc",
      "senior_il",
      "mixed_use_residential",
    ],
    defaultSizing: {
      maxLtv: 0.87,        // market-rate; 90% affordable/subsidized
      maxLtc: 0.87,        // market-rate; 90% affordable/subsidized
      minDscr: 1.15,       // market-rate; 1.11 affordable/subsidized
      minLoanSize: 4_000_000,
      maxTermYears: 43,    // 3yr construction + 40yr perm
      amortizationYearsTypical: 40,
      notes: "BSPRA adds up to 10% paper equity. Construction period IO 0-36 months.",
    },
    assetTypeOverrides: [
      {
        assetType: "affordable_lihtc",
        override: { maxLtv: 0.90, maxLtc: 0.90, minDscr: 1.11 },
      },
    ],
    requiredFields: [
      "propertyType",
      "numberOfUnits",
      "address",
      "scope",
      "loanAmount",
      "landCost",
      "softCosts",
      "hardCosts",
      "carryAndExitCosts",
      "totalProjectCost",
      "stabilizedNoi",
      "primaryGuarantor.name",
    ],
    optionalFields: [
      "isMarketRateOrAffordable",
      "rentalAssistancePct",
      "bspraRequested",
      "section220UrbanRenewal",
      "section8HapContract",
      "lihtcSelection",
      "gcSelected",
      "gcLiquidNetWorth",
      "gcBondingPct",
      "section220CommercialEgiPct",
      "commercialNraPct",
      "commercialEgiPct",
      "seismicZone",
      "hudMultifamilyRegion",
    ],
    warnings: [
      {
        id: "light_rehab_too_small",
        field: "scope",
        test: "equals",
        threshold: "light_rehab",
        severity: "warn",
        message:
          "221(d)(4) requires substantial rehab (≥15% replacement cost OR ≥$6,500/unit OR 2+ buildings). " +
          "For light rehab on stabilized assets, use HUD 223(f).",
        recommendedProgram: "hud_223f",
      },
      {
        id: "no_physical_work",
        field: "scope",
        test: "equals",
        threshold: "no_physical_work",
        severity: "warn",
        message: "221(d)(4) is a construction loan. For stabilized refi, use HUD 223(f).",
        recommendedProgram: "hud_223f",
      },
      {
        id: "loan_below_4m",
        field: "loanAmount",
        test: "min",
        threshold: 4_000_000,
        severity: "warn",
        message: "221(d)(4) typically requires $4M+ minimum. Many lenders require $10M+.",
      },
      {
        id: "commercial_nra_over_25",
        field: "commercialNraPct",
        test: "max",
        threshold: 0.25,
        severity: "warn",
        message: "Commercial NRA over 25% — exceeds 221(d)(4) limit (30% in Section 220 areas).",
      },
      {
        id: "commercial_egi_over_15",
        field: "commercialEgiPct",
        test: "max",
        threshold: 0.15,
        severity: "warn",
        message: "Commercial EGI over 15% — exceeds 221(d)(4) limit.",
      },
      {
        id: "davis_bacon_required",
        field: "scope",
        test: "contains",
        threshold: "ground_up",
        severity: "info",
        message: "Davis-Bacon prevailing wages apply. Add ~5–15% to hard costs in budget.",
      },
    ],
    autoCalcRules: [
      {
        field: "hudMip",
        formula: "loanAmount * 0.0065",
        description: "MIP during construction & perm: 0.65% market, 0.45% Section 8/LIHTC, 0.25% green",
      },
      {
        field: "workingCapitalReserve",
        formula: "loanAmount * 0.04",
        description: "Working capital reserve: 4% of loan (cash or LOC)",
      },
      {
        field: "operatingDeficitReserve",
        formula: "loanAmount * 0.03",
        description: "Operating deficit reserve: 3% of loan",
      },
      {
        field: "hudApplicationFee",
        formula: "loanAmount * 0.0030",
        description: "HUD application fee: 0.30%",
      },
      {
        field: "hudInspectionFee",
        formula: "loanAmount * 0.0050",
        description: "HUD inspection fee: 0.50% ($5/thousand)",
      },
      {
        field: "bspraCredit",
        formula: "totalProjectCost * 0.10",
        description: "BSPRA: up to 10% paper equity (if requested)",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [150, 250],
  },

  // ---------------------------------------------------------------------------
  // HUD 223(a)(7) — HUD-to-HUD Refinance
  // ---------------------------------------------------------------------------
  hud_223a7: {
    id: "hud_223a7",
    category: "hud",
    displayName: "HUD 223(a)(7)",
    shortDescription: "HUD-to-HUD Refinance · 100% eligible costs",
    longDescription:
      "Streamlined refinance of an existing HUD-insured loan. Quick close, no new appraisal, " +
      "no new third-party reports beyond the original. Up to 100% of eligible costs.",
    eligiblePostures: ["refinance"],
    eligibleScopes: ["none"],
    eligibleAssetTypes: [
      "apartments",
      "affordable_lihtc",
      "senior_il",
      "senior_al",
      "senior_snf",
      "memory_care",
    ],
    defaultSizing: {
      maxLtv: 1.00,        // 100% of eligible costs
      maxTermYears: 12,    // up to 12 years beyond original
      amortizationYearsTypical: 35,
      notes: "Term may extend up to 12 years beyond original maturity.",
    },
    requiredFields: [
      "currentUpb",
      "originalCostBasis",
      "address",
      "loanAmount",
      "primaryGuarantor.name",
    ],
    optionalFields: ["existingHudFhaCaseNumber", "originalLoanType"],
    warnings: [
      {
        id: "must_have_existing_hud",
        field: "originalLoanType",
        test: "contains",
        threshold: "hud",
        severity: "warn",
        message: "223(a)(7) requires an existing HUD-insured loan. If not, use 223(f).",
        recommendedProgram: "hud_223f",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [100, 170],
  },

  // ---------------------------------------------------------------------------
  // HUD 232 — Senior / Healthcare
  // ---------------------------------------------------------------------------
  hud_232: {
    id: "hud_232",
    category: "hud",
    displayName: "HUD 232",
    shortDescription: "Senior / Healthcare · 75% LTC · 1.45x DSCR · 40yr",
    longDescription:
      "HUD/FHA-insured loan for skilled nursing, assisted living, board & care, and memory care. " +
      "Non-recourse, 35-yr fixed (40-yr if construction). Operator quality is heavily underwritten.",
    eligiblePostures: ["land_or_demo", "existing_kept", "refinance"],
    eligibleScopes: ["ground_up", "substantial_rehab", "light_rehab", "no_physical_work", "none"],
    eligibleAssetTypes: ["senior_al", "senior_snf", "memory_care"],
    defaultSizing: {
      maxLtv: 0.80,
      maxLtc: 0.75,
      minDscr: 1.45,
      minLoanSize: 5_000_000,
      maxTermYears: 40,
      amortizationYearsTypical: 35,
    },
    assetTypeOverrides: [
      {
        assetType: "senior_il",
        override: { minDscr: 1.30 },  // independent living
      },
      {
        assetType: "senior_al",
        override: { minDscr: 1.40 },  // 50%+ AL
      },
      {
        assetType: "memory_care",
        override: { minDscr: 1.45 },  // 100% memory/dementia
      },
    ],
    requiredFields: [
      "propertyType",
      "numberOfUnits",      // licensed bed count
      "address",
      "loanAmount",
      "grossIncome",
      "grossExpenses",
      "operatorName",
      "operatorYearsExperience",
      "primaryGuarantor.name",
    ],
    optionalFields: [
      "cmsStarRating",
      "medicaidMixPct",
      "medicareMixPct",
      "privatePayPct",
      "qualityMixIndex",
      "mostRecentStateSurveyResults",
      "operatingLeaseTerms",
    ],
    warnings: [
      {
        id: "cms_below_3_stars",
        field: "cmsStarRating",
        test: "min",
        threshold: 3,
        severity: "warn",
        message: "CMS star rating below 3 — may face additional scrutiny.",
      },
      {
        id: "high_medicaid_mix",
        field: "medicaidMixPct",
        test: "max",
        threshold: 0.70,
        severity: "info",
        message: "Medicaid mix above 70% — payor concentration risk.",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [200, 300],
  },

  // ---------------------------------------------------------------------------
  // CMBS CONDUIT
  // ---------------------------------------------------------------------------
  cmbs_conduit: {
    id: "cmbs_conduit",
    category: "cmbs",
    displayName: "CMBS Conduit",
    shortDescription: "65–75% LTV · 1.25x DSCR · 5/7/10yr fixed",
    longDescription:
      "Securitized commercial mortgage. Non-recourse, fixed rate, 5/7/10-year terms with 25–30yr amortization. " +
      "All major asset classes. Asset-focused underwriting with debt yield as third metric. " +
      "Defeasance or yield maintenance prepayment.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work"],
    eligibleAssetTypes: [
      "apartments",
      "office",
      "retail",
      "industrial_warehouse",
      "ios",
      "hotel",
      "self_storage",
      "mfg_housing",
      "student_housing",
      "mixed_use_commercial",
      "mixed_use_residential",
      "urgent_care",
      "car_wash",
      "car_dealership",
    ],
    defaultSizing: {
      maxLtv: 0.75,
      minDscr: 1.25,
      minDebtYield: 0.08,
      minLoanSize: 2_000_000,
      minTermYears: 5,
      maxTermYears: 10,
      amortizationYearsTypical: 30,
    },
    assetTypeOverrides: [
      {
        assetType: "hotel",
        override: { minDscr: 1.40, minDebtYield: 0.10 },  // flagged hotels
      },
    ],
    requiredFields: [
      "propertyType",
      "address",
      "loanAmount",
      "purchasePrice",
      "noi",
      "primaryGuarantor.name",
      "primaryGuarantor.netWorth",
      "primaryGuarantor.liquidity",
    ],
    optionalFields: [
      "majorTenantRollover5yr",
      "topTenantsList",
      "isSingleTenant",
      "prepaymentStructure",
      "mezzAmount",
      "prefEquityAmount",
      "yearBuilt",
    ],
    warnings: [
      {
        id: "net_worth_below_25pct",
        field: "primaryGuarantor.netWorth",
        test: "min",
        threshold: "loanAmount * 0.25",
        severity: "warn",
        message: "Net worth below 25% of loan — CMBS standard requirement.",
      },
      {
        id: "liquidity_below_5pct",
        field: "primaryGuarantor.liquidity",
        test: "min",
        threshold: "loanAmount * 0.05",
        severity: "warn",
        message: "Liquidity below 5% of loan — CMBS standard requirement.",
      },
      {
        id: "single_tenant_risk",
        field: "isSingleTenant",
        test: "equals",
        threshold: true,
        severity: "info",
        message: "Single-tenant deals get binary risk treatment — expect tighter terms.",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [150, 280],
  },

  // ---------------------------------------------------------------------------
  // LIFE COMPANY
  // ---------------------------------------------------------------------------
  life_company: {
    id: "life_company",
    category: "life_co",
    displayName: "Life Company",
    shortDescription: "55–65% LTV · 1.25x DSCR · 10–25yr fixed",
    longDescription:
      "Insurance company portfolio loan. Top-quality assets, conservative leverage, long fixed terms. " +
      "Typically primary/secondary markets, institutional sponsorship preferred.",
    eligiblePostures: ["existing_kept", "refinance"],
    eligibleScopes: ["none", "no_physical_work"],
    eligibleAssetTypes: [
      "apartments",
      "office",
      "retail",
      "industrial_warehouse",
      "self_storage",
      "mixed_use_commercial",
      "hotel",
    ],
    defaultSizing: {
      maxLtv: 0.65,
      minDscr: 1.25,
      minLoanSize: 5_000_000,
      minTermYears: 10,
      maxTermYears: 25,
      amortizationYearsTypical: 25,
      notes: "Class A/B+ assets only. Tertiary markets generally avoided.",
    },
    requiredFields: [
      "propertyType",
      "address",
      "loanAmount",
      "purchasePrice",
      "noi",
      "primaryGuarantor.name",
      "primaryGuarantor.netWorth",
      "yearBuilt",
    ],
    optionalFields: [
      "marketTier",
      "propertyClass",
      "topTenantsList",
    ],
    warnings: [
      {
        id: "loan_below_5m",
        field: "loanAmount",
        test: "min",
        threshold: 5_000_000,
        severity: "warn",
        message: "Loan below $5M — most life cos won't engage below this size.",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [100, 180],
  },

  // ---------------------------------------------------------------------------
  // SBA 504 — Owner-Occupied CRE
  // ---------------------------------------------------------------------------
  sba_504: {
    id: "sba_504",
    category: "sba",
    displayName: "SBA 504",
    shortDescription: "90% LTC · owner-occupied · 10/20/25yr",
    longDescription:
      "SBA-backed financing for owner-occupied CRE (≥51% existing, ≥60% new construction). " +
      "Two-loan structure: 50% bank first / 40% CDC SBA-debenture second / 10% borrower equity " +
      "(15% if special-use or new business).",
    eligiblePostures: ["land_or_demo", "existing_kept", "refinance"],
    eligibleScopes: ["ground_up", "substantial_rehab", "light_rehab", "no_physical_work", "none"],
    eligibleAssetTypes: [
      "office",
      "retail",
      "industrial_warehouse",
      "ios",
      "hotel",
      "self_storage",
      "urgent_care",
      "car_wash",
      "car_dealership",
      "mixed_use_commercial",
    ],
    defaultSizing: {
      maxLtc: 0.90,
      minLoanSize: 250_000,
      maxLoanSize: 5_500_000,  // SBA portion only — total project up to ~$20M+
      minTermYears: 10,
      maxTermYears: 25,
      amortizationYearsTypical: 25,
      notes: "Two-loan structure. CDC second is fixed-rate. Bank first varies.",
    },
    requiredFields: [
      "propertyType",
      "address",
      "loanAmount",
      "purchasePrice",
      "operatingBusinessName",
      "naicsCode",
      "ownerOccupancyPct",
      "businessTangibleNetWorth",
      "businessAvgNetIncome2yr",
      "jobsCreatedOrRetained",
      "primaryGuarantor.name",
      "primaryGuarantor.fico",
    ],
    optionalFields: [
      "isSpecialUseProperty",
      "isNewBusiness",
      "cdcSelected",
    ],
    warnings: [
      {
        id: "owner_occupancy_below_51",
        field: "ownerOccupancyPct",
        test: "min",
        threshold: 0.51,
        severity: "warn",
        message: "Owner-occupancy below 51% — SBA 504 requires minimum 51% existing or 60% new.",
      },
      {
        id: "business_net_worth_too_high",
        field: "businessTangibleNetWorth",
        test: "max",
        threshold: 20_000_000,
        severity: "warn",
        message: "Business tangible net worth above $20M — exceeds SBA 504 cap.",
      },
      {
        id: "business_income_too_high",
        field: "businessAvgNetIncome2yr",
        test: "max",
        threshold: 6_500_000,
        severity: "warn",
        message: "Avg net income above $6.5M — exceeds SBA 504 cap.",
      },
      {
        id: "special_use_higher_equity",
        field: "isSpecialUseProperty",
        test: "equals",
        threshold: true,
        severity: "info",
        message: "Special-use property — borrower equity requirement increases to 15%.",
      },
    ],
    baseRateIndex: "10yr_treasury",
    spreadRangeBps: [100, 200],
  },
};

// =============================================================================
// Public helpers
// =============================================================================

/** Get program by id, throws if unknown (use the type system to avoid this). */
export function getProgram(id: ProgramId): ProgramGuideline {
  const p = PROGRAMS[id];
  if (!p) throw new Error(`Unknown program: ${id}`);
  return p;
}

/** All programs as a sorted array for dropdown rendering. */
export function listPrograms(): ProgramGuideline[] {
  const order: ProgramId[] = [
    "fannie_dus",
    "fannie_small",
    "freddie_optigo",
    "freddie_sbl",
    "hud_223f",
    "hud_221d4",
    "hud_223a7",
    "hud_232",
    "cmbs_conduit",
    "life_company",
    "sba_504",
  ];
  return order.map((id) => PROGRAMS[id]);
}

/** Returns true if given posture+scope combo is allowed by the program. */
export function isAllowed(
  programId: ProgramId,
  posture: Posture,
  scope: Scope,
): boolean {
  const p = PROGRAMS[programId];
  if (!p) return false;
  return p.eligiblePostures.includes(posture) && p.eligibleScopes.includes(scope);
}

/** Returns true if program supports given asset type. */
export function supportsAsset(programId: ProgramId, asset: AssetType): boolean {
  const p = PROGRAMS[programId];
  if (!p) return false;
  return p.eligibleAssetTypes.includes(asset);
}

/** Resolves effective sizing constraints for a program + asset type (applies overrides). */
export function effectiveSizing(
  programId: ProgramId,
  asset: AssetType,
): SizingGuideline {
  const p = PROGRAMS[programId];
  if (!p) return {};
  const override = p.assetTypeOverrides?.find((r) => r.assetType === asset)?.override;
  return { ...p.defaultSizing, ...(override ?? {}) };
}

/**
 * Suggest alternate programs when current one rejects the deal posture/scope.
 * Returns programs that DO accept the combo, sorted by category alignment.
 */
export function suggestAlternates(
  posture: Posture,
  scope: Scope,
  asset: AssetType,
): ProgramId[] {
  return listPrograms()
    .filter(
      (p) =>
        p.eligiblePostures.includes(posture) &&
        p.eligibleScopes.includes(scope) &&
        p.eligibleAssetTypes.includes(asset),
    )
    .map((p) => p.id);
}
