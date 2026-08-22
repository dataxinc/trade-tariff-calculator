// Core types for the Trade Tariff Calculator engine.

export type Transport = 'OCEAN' | 'AIR' | 'RAIL';

export interface CalcInput {
  /** 10-digit HTS code without dots, e.g. "7601106090" */
  code: string;
  /** ISO2 country code of origin, e.g. "TR" */
  country: string;
  /** Entry date as YYYY-MM-DD (local importer date) */
  entryDate: string;
  /** Customs value in USD */
  valueUsd: number;
  /** Quantity per unit of measure, e.g. { KG: 5566 } */
  units?: Record<string, number>;
  /** Mode of transport (HMF applies to ocean) */
  transport: Transport;
  /** Special program indicators chosen by the user, e.g. ["S"] */
  chosenSpis?: string[];
}

export type Scope =
  | { type: 'all' }
  | { type: 'only'; countries: string[] }
  | { type: 'allExcept'; excluded: string[] };

/**
 * Condition evaluated by the engine when deciding whether a rule applies.
 * - none: always applies when scope + dates match
 * - baseGe / baseLt: base duty rate comparisons (EU/JP/KR/CH/TW tier rows)
 * - spiAny: applies only when one of the listed SPIs is chosen (USMCA S/S+)
 * - after232: applies only when a Section 232 rule already applied
 */
export type RuleCondition =
  | { kind: 'none' }
  | { kind: 'baseGe'; value: number }
  | { kind: 'baseLt'; value: number }
  | { kind: 'spiAny'; spis: string[] }
  | { kind: 'after232' };

export type RuleKind = '232' | '301fl' | '301cn' | 'exclusionUsmca' | 'other';

export interface TariffRule {
  /** Chapter 99 / additional duty code, e.g. "99038202" */
  code: string;
  label: string;
  rateDescription: string;
  kind: RuleKind;
  scope: Scope;
  /** Effective window, dates inclusive, YYYY-MM-DD */
  from: string;
  to: string;
  /** Additive rate on top of base duty, e.g. 0.5 = +50% */
  penalty: number;
  /** Flat rate applied instead of the additive penalty (EU <10% tier) */
  flatRate?: number;
  condition?: RuleCondition;
  /** Excluded when a Section 232 rule applies (forced-labor rows) */
  excludedBy232?: boolean;
  /** Product coverage: applies only to these chapters / heading prefixes */
  productScope?: {
    chapters?: number[];
    headings?: string[];
    excludeHeadings?: string[];
  };
  /** Display-only exclusion line shown when its condition holds */
  exclusionLine?: {
    code: string;
    label: string;
  };
}

export interface BaseRate {
  code: string;
  description: string;
  kind: 'adValorem' | 'specific';
  /** ad valorem rate (0.026 = 2.6%) */
  rate?: number;
  /** specific duty: cents per unit, e.g. 1.5 = 1.5¢/kg */
  centsPerUnit?: number;
  /** unit of measure for specific duties */
  unit?: string;
}

export interface ResultLine {
  code: string;
  label: string;
  rateDescription: string;
  amount: number; // rounded, display
}

export interface CalcResult {
  base: ResultLine;
  surtaxLines: ResultLine[]; // includes $0 exclusion display lines
  totalDuties: number;
  mpf: number;
  hmf: number;
  landedCost: number;
  valueUsd: number;
}
