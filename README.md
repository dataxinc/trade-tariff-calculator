# Trade Tariff Calculator 2026

US import duty calculator for Android/iOS (React Native). Replicates the
functionality of Flexport's public Tariff Simulator, built entirely on
official US government data.

## Architecture

- `src/engine/` — pure TypeScript calculation engine, no RN dependencies.
  - `types.ts` — input/output types, tariff rule shape
  - `fees.ts` — MPF (0.3464%, $32.71–$634.62) and HMF (0.125%, ocean)
  - `baseRates.ts` — base MFN duty rates (placeholder map until the full
    official HTS database is bundled)
  - `rules.ts` — Chapter 99 additional-duty rules (Section 232, 301, IEEPA),
    with country scopes and effective date windows
  - `engine.ts` — the calculator: base duty + surtaxes + fees, matching
    Flexport's line-by-line breakdown and dollar rounding
- `src/engine/__tests__/engine.test.ts` — cases validated one-by-one against
  the live Flexport simulator (headless Chrome on this VM).

## Data sources

- Base MFN duty rates: official USITC HTS (`hts.usitc.gov/reststop/`),
  bundled offline with a refresh button (full DB is the next milestone).
- Additional-duty rules: HTS Chapter 99 + presidential proclamations,
  transcribed into `rules.ts` (country scope, effective windows, rates).

## Validated scenarios (2026-08-22, matches Flexport to the dollar)

- Turkey aluminum 7601.10.60.90, $100k ocean → 232 50% = $50,000 + fees
- China aluminum 7601.10.60.90 → 232 50% + 301 25% = $75,000 + fees
- Canada aluminum 7601.10.60.90 → 232 50% = $50,000 (no exemption)
- Pakistan mangoes 0804.50.80.40, 5566 kg, $10k → 1.5¢/kg = $83 + fees
- Turkey copper 7403.11.00.00 (1% base) → Note 52(b) excludes FL 301
- Turkey sunglasses 9004.10.00.00 (2% base) → FL 301 12.5% applies

## Known gaps (backlog)

- Section 232 Auto Parts (9903.94.xx, 25%): full product annex not yet
  encoded — laptops (8471.30) confirmed covered by the simulator.
- Section 301 China product exclusion lists beyond phones/laptops.
- Note 52(b) exact threshold: probed 1% excluded / 2% applies; encoded as
  ≤1.5% pending the USTR notice text.
- Full HTS base-rate database (only probe codes bundled today).
- Rule history for backdated entry dates (currently active-on-2026-08-22).
- Column 2 countries (Russia, Belarus, Cuba, DPRK) are out of scope, same
  as Flexport.

## Build

Android builds happen on Fahad's Windows machine (never compile on the VM).
Code is verified with `npx tsc --noEmit` and `npx jest src/engine`.
