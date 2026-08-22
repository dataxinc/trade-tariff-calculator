// Merchandise Processing Fee and Harbor Maintenance Fee.
// Official CBP formulas, values current for 2026.

export const MPF_RATE = 0.003464; // 0.3464%
export const MPF_MIN = 32.71;
export const MPF_MAX = 634.62;

export const HMF_RATE = 0.00125; // 0.125% of value, ocean only

export function computeMpf(valueUsd: number): number {
  const raw = valueUsd * MPF_RATE;
  return Math.min(Math.max(raw, MPF_MIN), MPF_MAX);
}

export function computeHmf(valueUsd: number, transport: string): number {
  if (transport === 'OCEAN') {
    return valueUsd * HMF_RATE;
  }
  return 0;
}
