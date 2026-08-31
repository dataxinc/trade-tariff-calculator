import { calculate } from '../engine';

describe('Trade Tariff Calculator engine — validated against Flexport simulator (2026-08-22)', () => {
  test('Turkey aluminum 7601.10.60.90 $100k ocean', () => {
    const r = calculate({
      code: '7601106090',
      country: 'TR',
      entryDate: '2026-08-22',
      valueUsd: 100000,
      transport: 'OCEAN',
    });
    expect(r.base).toMatchObject({ code: '7601.10.60.90', rateDescription: 'Free', amount: 0 });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030590', '99038202']);
    expect(r.surtaxLines[1].amount).toBe(50000);
    expect(r.totalDuties).toBe(50000);
    expect(r.mpf).toBe(346);
    expect(r.hmf).toBe(125);
    expect(r.landedCost).toBe(150471);
  });

  test('China aluminum 7601.10.60.90 $100k ocean: 232 50% + 301 25%', () => {
    const r = calculate({
      code: '7601106090',
      country: 'CN',
      entryDate: '2026-08-22',
      valueUsd: 100000,
      transport: 'OCEAN',
    });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030590', '99038202', '99039101']);
    expect(r.surtaxLines.map(l => l.amount)).toEqual([0, 50000, 25000]);
    expect(r.totalDuties).toBe(75000);
    expect(r.landedCost).toBe(175471);
  });

  test('Canada aluminum 7601.10.60.90 $100k ocean: 232 50%, no exemption', () => {
    const r = calculate({
      code: '7601106090',
      country: 'CA',
      entryDate: '2026-08-22',
      valueUsd: 100000,
      transport: 'OCEAN',
    });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030315', '99030590', '99038202']);
    expect(r.totalDuties).toBe(50000);
    expect(r.landedCost).toBe(150471);
  });

  test('Pakistan dried mangoes 0804.50.80.40, 5566 kg, $10k ocean', () => {
    const r = calculate({
      code: '0804508040',
      country: 'PK',
      entryDate: '2026-08-22',
      valueUsd: 10000,
      units: { KG: 5566 },
      transport: 'OCEAN',
    });
    expect(r.base).toMatchObject({ code: '0804.50.80.40', rateDescription: '1.5¢/kg', amount: 83 });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030586']);
    expect(r.totalDuties).toBe(83);
    expect(r.hmf).toBe(13);
    expect(r.mpf).toBe(35);
    expect(r.landedCost).toBe(10131);
  });

  test('Mango by air has no HMF', () => {
    const r = calculate({
      code: '0804508040',
      country: 'PK',
      entryDate: '2026-08-22',
      valueUsd: 10000,
      units: { KG: 5566 },
      transport: 'AIR',
    });
    expect(r.hmf).toBe(0);
  });

  test('Turkey copper 7403.11.00.00, 1% base: Note 52(b) excludes forced-labor 301', () => {
    const r = calculate({
      code: '7403110000',
      country: 'TR',
      entryDate: '2026-08-22',
      valueUsd: 100000,
      transport: 'OCEAN',
    });
    expect(r.base).toMatchObject({ amount: 1000 });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030586']);
    expect(r.totalDuties).toBe(1000);
  });

  test('Turkey sunglasses 9004.10.00.00, 2% base: forced-labor 12.5% applies', () => {
    const r = calculate({
      code: '9004100000',
      country: 'TR',
      entryDate: '2026-08-22',
      valueUsd: 100000,
      transport: 'AIR',
    });
    expect(r.base).toMatchObject({ amount: 2000 });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030579']);
    expect(r.surtaxLines[0].amount).toBe(12500);
    expect(r.totalDuties).toBe(14500);
    expect(r.hmf).toBe(0);
  });

  test('Turkey cotton t-shirts 6109.10.00.40, 16.5% base + FL 12.5% (probed)', () => {
    const r = calculate({
      code: '6109100040',
      country: 'TR',
      entryDate: '2026-08-22',
      valueUsd: 100000,
      transport: 'AIR',
    });
    expect(r.base).toMatchObject({ code: '6109.10.00.40', amount: 16500 });
    expect(r.surtaxLines.map(l => l.code)).toEqual(['99030579']);
    expect(r.surtaxLines[0].amount).toBe(12500);
    expect(r.totalDuties).toBe(29000);
  });

  test('Germany sedan 8703.23.01: Section 232 autos 25% on top of 2.5% base', () => {
    const r = calculate({
      code: '87032301',
      country: 'DE',
      entryDate: '2026-08-31',
      valueUsd: 40000,
      transport: 'OCEAN',
    });
    expect(r.base).toMatchObject({ amount: 1000 });
    const auto = r.surtaxLines.find(l => l.code === '99039401');
    expect(auto?.amount).toBe(10000);
    expect(r.totalDuties).toBe(11000);
  });

  test('China laptop 8471.30.01.00: auto parts 25%, 301 China list excluded (README-confirmed)', () => {
    const r = calculate({
      code: '8471300100',
      country: 'CN',
      entryDate: '2026-08-31',
      valueUsd: 40000,
      transport: 'AIR',
    });
    expect(r.base).toMatchObject({ code: '8471.30.01.00', amount: 0 });
    const auto = r.surtaxLines.find(l => l.code === '99039405');
    expect(auto?.amount).toBe(10000);
    // 8471 is excluded from the China 301 list (phones/laptops carve-out)
    expect(r.surtaxLines.some(l => l.code === '99039101')).toBe(false);
    expect(r.totalDuties).toBe(10000);
  });

  test('Japan transmission 8708.40.11: auto parts 25%', () => {
    const r = calculate({
      code: '87084011',
      country: 'JP',
      entryDate: '2026-08-31',
      valueUsd: 40000,
      transport: 'AIR',
    });
    const auto = r.surtaxLines.find(l => l.code === '99039405');
    expect(auto?.amount).toBe(10000);
    expect(r.totalDuties).toBe(10000);
  });

  test('Single-axle tractor 8701.10.00.10 (Ch 87, not in auto annex): no auto tariff', () => {
    const r = calculate({
      code: '8701100100',
      country: 'DE',
      entryDate: '2026-08-31',
      valueUsd: 40000,
      transport: 'AIR',
    });
    expect(r.surtaxLines.some(l => l.code === '99039401')).toBe(false);
    expect(r.surtaxLines.some(l => l.code === '99039405')).toBe(false);
  });
});
