// Run: node --test src/lib/pos-math.test.mjs   (Node 22.18+/24 strips TypeScript types natively)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { businessDate, computeTotals, receiptNo, suggestTendered } from './pos-math.ts'

const lines = [{ unitPrice: 25000, qty: 2 }, { unitPrice: 5000, qty: 1 }] // 55.000, as in the DB tests

// The same identity the sales CHECK constraint enforces.
const satisfiesCheck = (t, inclusive) =>
  t.total === t.subtotal + t.service + (inclusive ? 0 : t.tax) + t.rounding

test('PB1 10% exclusive, no service: matches the wireframe and DB test (60.500)', () => {
  const t = computeTotals({ lines, serviceRate: 0, taxRate: 10, taxInclusive: false, cashRounding: 0, method: 'cash' })
  assert.deepEqual(t, { subtotal: 55000, service: 0, tax: 5500, rounding: 0, total: 60500 })
  assert.ok(satisfiesCheck(t, false))
})

test('service is taxed: 5% service then 10% PB1 on food + service', () => {
  const t = computeTotals({ lines, serviceRate: 5, taxRate: 10, taxInclusive: false, cashRounding: 0, method: 'qris' })
  assert.deepEqual(t, { subtotal: 55000, service: 2750, tax: 5775, rounding: 0, total: 63525 })
})

test('cash rounding to Rp500 applies to cash only', () => {
  const base = { lines, serviceRate: 5, taxRate: 10, taxInclusive: false, cashRounding: 500 }
  const cash = computeTotals({ ...base, method: 'cash' })
  assert.equal(cash.total, 63500)
  assert.equal(cash.rounding, -25)
  assert.ok(satisfiesCheck(cash, false))
  assert.equal(computeTotals({ ...base, method: 'transfer' }).total, 63525)
})

test('tax-inclusive prices: tax is shown but not added', () => {
  const t = computeTotals({ lines, serviceRate: 0, taxRate: 10, taxInclusive: true, cashRounding: 0, method: 'cash' })
  assert.equal(t.total, 55000)
  assert.equal(t.tax, 5000)
  assert.ok(satisfiesCheck(t, true))
})

test('empty cart totals zero', () => {
  assert.equal(computeTotals({ lines: [], serviceRate: 5, taxRate: 10, taxInclusive: false, cashRounding: 500, method: 'cash' }).total, 0)
})

test('tender suggestions: exact first, then banknote steps', () => {
  assert.deepEqual(suggestTendered(60500), [60500, 65000, 70000, 80000])
  assert.deepEqual(suggestTendered(50000), [50000, 60000, 100000])
  assert.deepEqual(suggestTendered(0), [])
})

test('receipt number and business date', () => {
  assert.equal(receiptNo('JKT', 'T1', '2026-11-26', 7), 'JKT-T1-20261126-0007')
  // 23:30 UTC on the 26th is already the 27th in Jakarta (UTC+7)
  assert.equal(businessDate(new Date('2026-11-26T23:30:00Z'), 'Asia/Jakarta'), '2026-11-27')
})
