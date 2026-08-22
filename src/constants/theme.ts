// Shared theme for the Trade Tariff Calculator app.

export const C = {
  navy: '#0B1F3A',
  navyLight: '#123a63',
  blue: '#2563EB',
  blueLight: '#60A5FA',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  amber: '#B45309',
  red: '#DC2626',
};

/** Format a number as USD with thousands separators, no cents. */
export function fmtUsd(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded).toString();
  const parts: string[] = [];
  let i = abs.length;
  while (i > 0) {
    parts.unshift(abs.slice(Math.max(0, i - 3), i));
    i -= 3;
  }
  return `${sign}$${parts.join(',')}`;
}
