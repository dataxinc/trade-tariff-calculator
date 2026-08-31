# Trade Tariff Calculator 2026

US import duty calculator for Android/iOS (React Native). Replicates the
functionality of Flexport's public Tariff Simulator, built entirely on
official US government data.

## Architecture

- `src/engine/` — pure TypeScript calculation engine, no RN dependencies.
  - `types.ts` — input/output types, tariff rule shape
  - `fees.ts` — MPF (0.3464%, $32.71–$634.62) and HMF (0.125%, ocean)
  - `baseRates.ts` — Note 52(b) exclusion threshold + base-rate notes (the
    full official HTS database lives in `src/data/hts.json`, served through `htsDb.ts`)
  - `htsDb.ts` — lookup/search over the bundled official USITC HTS schedule
  - `rules.ts` — Chapter 99 additional-duty rules (Section 232, 301, IEEPA),
    with country scopes and effective date windows
  - `engine.ts` — the calculator: base duty + surtaxes + fees, matching
    Flexport's line-by-line breakdown and dollar rounding
- `src/engine/__tests__/engine.test.ts` — cases validated one-by-one against
  the live Flexport simulator (headless Chrome on this VM).

## Data sources

- Base MFN duty rates: official USITC HTS (`hts.usitc.gov/reststop/`),
  bundled offline in `src/data/hts.json` (29,847 rows, rate parser in `htsDb.ts`)
  with an in-app refresh.
- Additional-duty rules: HTS Chapter 99 + presidential proclamations,
  transcribed into `rules.ts` (country scope, effective windows, rates).
  Includes Section 232 autos/auto parts via Proclamation 10908 Annex I.

## Validated scenarios (2026-08-22, matches Flexport to the dollar)

- Turkey aluminum 7601.10.60.90, $100k ocean → 232 50% = $50,000 + fees
- China aluminum 7601.10.60.90 → 232 50% + 301 25% = $75,000 + fees
- Canada aluminum 7601.10.60.90 → 232 50% = $50,000 (no exemption)
- Pakistan mangoes 0804.50.80.40, 5566 kg, $10k → 1.5¢/kg = $83 + fees
- Turkey copper 7403.11.00.00 (1% base) → Note 52(b) excludes FL 301
- Turkey sunglasses 9004.10.00.00 (2% base) → FL 301 12.5% applies

## Known gaps (backlog)

- Section 232 Auto Parts: passenger vehicles + light trucks (9903.94.01) and
  the Annex I parts list (9903.94.05, incl. 8471 laptops) are encoded as
  6-digit heading prefixes. USMCA-certified parts (full 0% exemption) and
  USMCA non-U.S.-content vehicle treatment are NOT yet wired to SPI S/S+
  — pending an engine change + simulator probe.
- Section 232 MHDV trucks/buses (Nov 1, 2025, 25%; buses 8702 at 10%)
  not yet encoded.
- Auto 232 "decoupled" from reciprocal IEEPA tariffs (no stacking) — no
  reciprocal rule is currently encoded, so stacking is moot until one lands.
- Section 301 China product exclusion lists beyond phones/laptops.
- Note 52(b) exact threshold: probed 1% excluded / 2% applies; encoded as
  ≤1.5% pending the USTR notice text.
- Rule history for backdated entry dates (currently active-on-2026-08-22).
- Column 2 countries (Russia, Belarus, Cuba, DPRK) are out of scope, same
  as Flexport.
- The Annex I parts list is transcribed as 6-digit prefixes; a handful of
  the 130 lines are 10-digit-specific (e.g. 8708.99.53/.55/.58/.68), so a
  couple of non-covered statistical breakouts inside those subheadings may
  be over-included at the dollar level.

## Build

Android builds happen on Fahad's Windows machine (never compile on the VM).
Code is verified with `npx tsc --noEmit` and `npx jest src/engine`.
