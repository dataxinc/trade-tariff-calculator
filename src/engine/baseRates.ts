// Base (column 1 general) duty rates. Small curated map for the validated
// scenarios; the full HTS database (bundled from the official USITC export)
// replaces this in the next iteration.

import { BaseRate } from './types';

export const BASE_RATES: Record<string, BaseRate> = {
  // Unwrought aluminum, not alloyed, >=99.9% purity — MFN Free
  '7601106090': {
    code: '7601106090',
    description: 'Free',
    kind: 'adValorem',
    rate: 0,
  },
  // Dried mangoes — 1.5 cents per kg (specific duty)
  '0804508040': {
    code: '0804508040',
    description: '1.5¢/kg',
    kind: 'specific',
    centsPerUnit: 1.5,
    unit: 'KG',
  },
  // Unwrought copper cathodes — 1% (probed: Note 52(b) applies)
  '7403110000': {
    code: '7403110000',
    description: '1%',
    kind: 'adValorem',
    rate: 0.01,
  },
  // Sunglasses — 2% (probed: forced-labor 301 applies)
  '9004100000': {
    code: '9004100000',
    description: '2%',
    kind: 'adValorem',
    rate: 0.02,
  },
};

/**
 * Note 52(b) exclusion threshold: forced-labor Section 301 does not apply
 * to products whose MFN base duty is below this level (or specific duty).
 * Boundary probed against the Flexport simulator: 1% excluded, 2% applies.
 * TODO: pin the exact threshold from the USTR notice of action.
 */
export const NOTE_52B_MAX_BASE_DUTY = 0.015;
