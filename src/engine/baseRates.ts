// Base duty rate notes. The full database lives in src/data/hts.json,
// served through src/engine/htsDb.ts.

/**
 * Note 52(b) exclusion threshold: forced-labor Section 301 does not apply
 * to products whose MFN base duty is below this level (or specific duty).
 * Boundary probed against the Flexport simulator: 1% excluded, 2% applies.
 * TODO: pin the exact threshold from the USTR notice of action.
 */
export const NOTE_52B_MAX_BASE_DUTY = 0.015;
