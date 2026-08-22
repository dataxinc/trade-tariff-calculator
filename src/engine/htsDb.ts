// Lookup layer over the bundled official HTS database (src/data/hts.json).
// Source: USITC exportList, full schedule, snapshot 2026-08-22.

import htsData from '../data/hts.json';

export type HtsRow = [string, string, string, number, number, string, string[], string];
// [digits, description, kind, advRate, centsPerUnit, unit, units[], rawRateText]

const rows = (htsData as unknown as { rows: HtsRow[] }).rows;
const byCode = new Map<string, HtsRow>();
for (const r of rows) {
  byCode.set(r[0], r);
}

export interface HtsBaseRate {
  /** Code that carries the rate (may be a parent of the requested code) */
  code: string;
  kind: 'free' | 'adv' | 'spec' | 'compound' | 'text';
  /** Ad valorem rate (0.026 = 2.6%) */
  rate: number;
  /** Specific duty in cents per unit */
  centsPerUnit: number;
  /** Unit code for specific duty, e.g. "kg", "No.", "doz." */
  unit?: string;
  /** Raw rate text from the schedule, e.g. "1.5¢/kg" */
  raw: string;
}

/** Find the base rate for a 10-digit code, walking up to 8/6/4-digit parents. */
export function getBaseRate(code: string): HtsBaseRate | null {
  for (let digits = 10; digits >= 4; digits -= 2) {
    const c = code.slice(0, digits);
    const row = byCode.get(c);
    if (row && row[2]) {
      return {
        code: c,
        kind: row[2] as HtsBaseRate['kind'],
        rate: row[3],
        centsPerUnit: row[4],
        unit: row[5] || row[6]?.[0] || undefined,
        raw: row[7] || row[1],
      };
    }
  }
  return null;
}

/** Full description chain for display, e.g. "Unwrought aluminum: > Aluminum, not alloyed: > Other" */
export function describeCode(code: string): string {
  const parts: string[] = [];
  for (let digits = 10; digits >= 4; digits -= 2) {
    const row = byCode.get(code.slice(0, digits));
    if (row && row[1]) {
      parts.unshift(row[1]);
    }
  }
  return parts.join(' > ') || code;
}

/** Format 10 digits as a dotted HTS code, e.g. 7601.10.60.90 */
export function formatHts(code: string): string {
  const d = code.replace(/\D/g, '');
  if (d.length !== 10) {
    return code;
  }
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}.${d.slice(8, 10)}`;
}

/** Simple search over code prefixes and descriptions. Returns up to `limit` rows. */
export function searchHts(query: string, limit = 25): { code: string; description: string; hasRate: boolean }[] {
  const q = query.trim().toLowerCase().replace(/\D/g, '');
  if (!q) {
    return [];
  }
  const out: { code: string; description: string; hasRate: boolean }[] = [];
  for (const r of rows) {
    if (out.length >= limit) {
      break;
    }
    const code = r[0];
    const desc = r[1].toLowerCase();
    if (code.startsWith(q) || desc.includes(q)) {
      out.push({ code, description: describeCode(code), hasRate: !!r[2] });
    }
  }
  return out;
}
