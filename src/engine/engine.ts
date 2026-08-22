// Trade Tariff Calculator engine.
// Mirrors the Flexport simulator for standard scenarios, validated case by case.

import { CalcInput, CalcResult, ResultLine, Scope, TariffRule } from './types';
import { computeHmf, computeMpf } from './fees';
import { RULES, FL_SECTION232_EXCLUSION_COUNTRIES } from './rules';
import { NOTE_52B_MAX_BASE_DUTY } from './baseRates';
import { formatHts, getBaseRate, HtsBaseRate } from './htsDb';

function inScope(scope: Scope, country: string): boolean {
  switch (scope.type) {
    case 'all':
      return true;
    case 'only':
      return scope.countries.includes(country);
    case 'allExcept':
      return !scope.excluded.includes(country);
  }
}

function inWindow(rule: TariffRule, entryDate: string): boolean {
  return rule.from <= entryDate && entryDate <= rule.to;
}

function condHolds(rule: TariffRule, ctx: {
  baseRateValue: number;
  chosenSpis: string[];
  has232: boolean;
}): boolean {
  const c = rule.condition;
  if (!c || c.kind === 'none') return true;
  switch (c.kind) {
    case 'baseGe':
      return ctx.baseRateValue >= c.value;
    case 'baseLt':
      return ctx.baseRateValue < c.value;
    case 'spiAny':
      return c.spis.some(s => ctx.chosenSpis.includes(s));
    case 'after232':
      return ctx.has232;
  }
}

/** HTS chapter (first 2 digits) from a 10-digit code string. */
function chapterOf(code: string): number {
  const ch = parseInt(code.slice(0, 2), 10);
  return Number.isFinite(ch) ? ch : 0;
}

function productMatches(rule: TariffRule, code: string): boolean {
  const ps = rule.productScope;
  if (!ps) return true;
  const ch = chapterOf(code);
  if (ps.excludeHeadings && ps.excludeHeadings.some(h => code.startsWith(h))) {
    return false;
  }
  if (ps.chapters && ps.chapters.includes(ch)) return true;
  if (ps.headings && ps.headings.some(h => code.startsWith(h))) return true;
  // Rule with only exclusion lists applies everywhere else.
  return !ps.chapters && !ps.headings;
}

function computeBase(input: CalcInput, rate: HtsBaseRate): { amount: number; rateValue: number } {
  switch (rate.kind) {
    case 'free':
    case 'text':
      return { amount: 0, rateValue: 0 };
    case 'adv':
      return { amount: input.valueUsd * rate.rate, rateValue: rate.rate };
    case 'spec':
      return { amount: (rate.centsPerUnit / 100) * quantityInUnit(input, rate.unit), rateValue: 0 };
    case 'compound':
      return {
        amount:
          input.valueUsd * rate.rate + (rate.centsPerUnit / 100) * quantityInUnit(input, rate.unit),
        rateValue: rate.rate,
      };
  }
}

function quantityInUnit(input: CalcInput, unit?: string): number {
  if (!unit || !input.units) {
    return 0;
  }
  const target = unit.toLowerCase();
  for (const [key, value] of Object.entries(input.units)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return 0;
}

export function calculate(input: CalcInput): CalcResult {
  const rate = getBaseRate(input.code);
  if (!rate) {
    throw new Error(`No base rate data for HTS code ${input.code}`);
  }
  const chosenSpis = input.chosenSpis ?? [];
  const surtaxLines: ResultLine[] = [];

  // 1) Base duty line
  const baseCalc = computeBase(input, rate);
  const baseLine: ResultLine = {
    code: formatHts(input.code),
    label: formatHts(input.code),
    rateDescription: rate.raw || 'Free',
    amount: Math.round(baseCalc.amount),
  };

  // 2) Additional-duty rules, applied in Flexport's display order:
  //    exclusions first, then 232, forced-labor 301, China 301, others.
  let has232 = false;
  let flExcludedBy232 = false;
  let flExcludedByNote52b = false;
  let flExcludedByUsmca = false;

  // Note 52(b): low-duty products (specific duty, or ad valorem below the
  // threshold) are exempt from the forced-labor Section 301.
  const advRate =
    rate.kind === 'adv' || rate.kind === 'compound' ? rate.rate : 0;
  const baseIsLowDuty =
    rate.kind === 'spec' ||
    rate.kind === 'free' ||
    (rate.kind === 'adv' && advRate <= NOTE_52B_MAX_BASE_DUTY);

  // First pass: detect Section 232 application and exclusion triggers.
  const applicable = RULES.filter(
    r =>
      productMatches(r, input.code) &&
      inScope(r.scope, input.country) &&
      inWindow(r, input.entryDate),
  );
  const usmcaSpis = ['S', 'S+'];
  const hasUsmcaSpi = usmcaSpis.some(s => chosenSpis.includes(s));

  for (const rule of applicable) {
    if (rule.kind === '232' && condHolds(rule, { baseRateValue: baseCalc.rateValue, chosenSpis, has232: false })) {
      has232 = true;
    }
  }
  if (has232 && FL_SECTION232_EXCLUSION_COUNTRIES.includes(input.country)) {
    flExcludedBy232 = true;
  }
  if (baseIsLowDuty) {
    flExcludedByNote52b = true;
  }

  // Second pass: build lines in display order.
  for (const rule of applicable) {
    const ctx = { baseRateValue: baseCalc.rateValue, chosenSpis, has232 };

    if (rule.kind === '301fl') {
      if (flExcludedBy232 && rule.excludedBy232) {
        continue; // the 232 exclusion line is shown once below
      }
      if (flExcludedByNote52b) {
        continue; // Note 52(b) exclusion line shown once below
      }
      if ((rule.code === '99030529' || rule.code === '99030555') && hasUsmcaSpi) {
        flExcludedByUsmca = true;
        continue; // USMCA S/S+ exclusion line shown below
      }
      if (!condHolds(rule, ctx)) {
        continue;
      }
      if (rule.flatRate !== undefined) {
        surtaxLines.push({
          code: rule.code,
          label: rule.label,
          rateDescription: rule.rateDescription,
          amount: Math.round(input.valueUsd * rule.flatRate),
        });
      } else {
        surtaxLines.push({
          code: rule.code,
          label: rule.label,
          rateDescription: rule.rateDescription,
          amount: Math.round(input.valueUsd * rule.penalty),
        });
      }
      continue;
    }

    if (rule.kind === 'exclusionUsmca') {
      continue; // rendered via the flExcludedByUsmca flag below
    }

    if (!condHolds(rule, ctx)) {
      continue;
    }

    surtaxLines.push({
      code: rule.code,
      label: rule.label,
      rateDescription: rule.rateDescription,
      amount: Math.round(input.valueUsd * rule.penalty),
    });
  }

  // Display-only exclusion lines (Flexport shows these as Free / No change).
  if (has232) {
    surtaxLines.unshift({
      code: '99030590',
      label: 'Section 301 "Forced Labor" Section 232 Exclusion',
      rateDescription: 'Free',
      amount: 0,
    });
    if (input.country === 'CA') {
      surtaxLines.unshift({
        code: '99030315',
        label: 'Section 338 Canada Note 51 (c) Section 232 Exclusion',
        rateDescription: 'No change',
        amount: 0,
      });
    }
  }
  if (flExcludedByNote52b && applicable.some(r => r.kind === '301fl') && !flExcludedBy232) {
    surtaxLines.unshift({
      code: '99030586',
      label: 'Section 301 "Forced Labor" Note 52 (b) Exclusion',
      rateDescription: 'Free',
      amount: 0,
    });
  }
  if (flExcludedByUsmca) {
    surtaxLines.unshift({
      code: input.country === 'CA' ? '99030593' : '99030594',
      label: input.country === 'CA'
        ? 'Section 301 "Forced Labor" CA USMCA Exclusion'
        : 'Section 301 "Forced Labor" MX USMCA Exclusion',
      rateDescription: 'No change',
      amount: 0,
    });
  }

  // 3) Fees
  const mpf = Math.round(computeMpf(input.valueUsd));
  const hmf = Math.round(computeHmf(input.valueUsd, input.transport));

  const totalDuties = baseLine.amount + surtaxLines.reduce((sum, l) => sum + l.amount, 0);
  const landedCost = input.valueUsd + totalDuties + mpf + hmf;

  return {
    base: baseLine,
    surtaxLines,
    totalDuties,
    mpf,
    hmf,
    landedCost,
    valueUsd: input.valueUsd,
  };
}
