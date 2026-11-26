// Runs the migrations against PGlite (in-process Postgres) with a minimal Supabase auth stub,
// then checks money rules, idempotent sync, stock ledger, voids, shift close and RLS.
// Run: node --test supabase/tests/schema.test.mjs   (needs @electric-sql/pglite)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

// What a Supabase project provides before our migrations run.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create schema extensions;
  grant usage on schema auth, extensions, public to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`

const U = {
  ownerA:   '00000000-0000-0000-0000-00000000000a',
  manager:  '00000000-0000-0000-0000-00000000000b',
  cashier:  '00000000-0000-0000-0000-00000000000c',
  cashier2: '00000000-0000-0000-0000-00000000000d', // works at outlet 2 only
  ownerB:   '00000000-0000-0000-0000-00000000000e',
}
const id = (n) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`

const db = new PGlite({ extensions: { pgcrypto } })

// Run SQL as a signed-in Supabase user (role authenticated + JWT sub), inside its own transaction.
const as = (uid, sql, params = []) =>
  db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true),
      set_config('request.jwt.claims', json_build_object('sub', $1::text, 'email', $1::text || '@test')::text, true)`, [uid])
    await tx.exec('set local role authenticated')
    return (await tx.query(sql, params)).rows
  })

const sale = (n, over = {}) => ({
  id: id(1000 + n), outlet_id: S.outlet1, terminal_id: S.terminal, shift_id: S.shift,
  receipt_no: `JKT-T1-20261126-${String(n).padStart(4, '0')}`, business_date: '2026-11-26',
  tax_rate: 10, tax_total: 5500, total: 60500,
  items: [
    { product_id: S.nasi, product_name: 'Nasi Ayam', qty: 2, unit_price: 25000, line_total: 50000 },
    { product_id: S.teh, product_name: 'Es Teh', qty: 1, unit_price: 5000, line_total: 5000 },
  ],
  payments: [{ method: 'cash', amount: 60500, tendered: 100000 }],
  ...over,
})

const S = {}

test('migrations apply on a Supabase-like database', async () => {
  await db.exec(SUPABASE_STUB)
  for (const f of readdirSync(migrationsDir).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), 'utf8'))
  }
  await db.query(`insert into auth.users (id) select unnest($1::uuid[])`, [Object.values(U)])
})

test('owner bootstraps a business and staff', async () => {
  ;[{ b: S.business }] = await as(U.ownerA, `select public.create_business('Dapur Senja','Jakarta','jkt','Sari') as b`)
  const [own] = await as(U.ownerA, `select role, display_name, email from public.memberships`)
  assert.deepEqual(own, { role: 'owner', display_name: 'Sari', email: `${U.ownerA}@test` })
  ;[{ id: S.outlet1 }] = await as(U.ownerA, `select id from public.outlets where code = 'JKT'`)
  ;[{ id: S.outlet2 }] = await as(U.ownerA,
    `insert into public.outlets (business_id, code, name) values ($1,'YOG','Yogyakarta') returning id`, [S.business])
  await as(U.ownerA, `insert into public.memberships (business_id, outlet_id, user_id, role, display_name) values
    ($1,$2,$3,'manager','Budi'), ($1,$2,$4,'cashier','Rina'), ($1,$5,$6,'cashier','Dewi')`,
    [S.business, S.outlet1, U.manager, U.cashier, S.outlet2, U.cashier2])
  ;[{ id: S.terminal }] = await as(U.manager,
    `insert into public.terminals (business_id, outlet_id, code, name) values ($1,$2,'T1','Kasir 1') returning id`,
    [S.business, S.outlet1])
  ;[{ id: S.nasi }, { id: S.teh }] = await as(U.manager, `insert into public.products (business_id, name, price, cost_price, track_stock)
    values ($1,'Nasi Ayam',25000,12000,true), ($1,'Es Teh',5000,1500,false) returning id`, [S.business])
  await as(U.manager, `insert into public.stock_movements (business_id, outlet_id, product_id, qty_delta, kind)
    values ($1,$2,$3,10,'restock')`, [S.business, S.outlet1, S.nasi])
  await as(U.manager, `select public.set_my_pin('246810')`)
})

test('only the owner manages staff', async () => {
  const promoted = await as(U.manager, `update public.memberships set role = 'owner', outlet_id = null
    where user_id = $1 returning id`, [U.manager])
  assert.equal(promoted.length, 0)
  assert.deepEqual((await as(U.cashier, `select display_name from public.memberships`)).map((r) => r.display_name), ['Rina'])
  assert.equal((await as(U.manager, `select * from public.memberships`)).length, 2) // self + cashier at JKT
  const off = await as(U.ownerA, `update public.memberships set active = false where user_id = $1 returning id`, [U.cashier2])
  assert.equal(off.length, 1)
  assert.equal((await as(U.cashier2, `select * from public.outlets`)).length, 0) // deactivated = no access
  await as(U.ownerA, `update public.memberships set active = true where user_id = $1`, [U.cashier2])
})

test('cashiers cannot edit the catalog or restock', async () => {
  await assert.rejects(as(U.cashier, `insert into public.products (business_id, name, price) values ($1,'X',1)`, [S.business]))
  await assert.rejects(as(U.cashier, `insert into public.stock_movements (business_id, outlet_id, product_id, qty_delta, kind)
    values ($1,$2,$3,5,'restock')`, [S.business, S.outlet1, S.nasi]))
})

test('cashier opens a shift and records a sale; replay is idempotent', async () => {
  S.shift = id(1)
  await as(U.cashier, `insert into public.shifts (id, business_id, outlet_id, terminal_id, cashier_id, opening_float)
    values ($1,$2,$3,$4,$5,200000)`, [S.shift, S.business, S.outlet1, S.terminal, U.cashier])
  const p = sale(1)
  await as(U.cashier, `select public.record_sale($1)`, [p])
  await as(U.cashier, `select public.record_sale($1)`, [p]) // offline queue retry
  const [{ n }] = await as(U.cashier, `select count(*)::int n from public.sales`)
  assert.equal(n, 1)
  const [item] = await as(U.cashier, `select cost_price from public.sale_items where product_name = 'Nasi Ayam'`)
  assert.equal(item.cost_price, '12000.00')
  const [pay] = await as(U.cashier, `select change from public.payments`)
  assert.equal(pay.change, '39500.00')
})

test('stock ledger drives the balance; untracked products are skipped', async () => {
  const rows = await as(U.cashier, `select product_id, qty from public.stock_balances`)
  assert.deepEqual(rows, [{ product_id: S.nasi, qty: '8.000' }])
})

test('bad sales are rejected', async () => {
  await assert.rejects(as(U.cashier, `select public.record_sale($1)`, [sale(2, { total: 60000 })]), /check/)
  await assert.rejects(as(U.cashier, `select public.record_sale($1)`,
    [sale(3, { payments: [{ method: 'cash', amount: 50000, tendered: 50000 }] })]), /payments/)
  const lying = sale(4); lying.items[0].line_total = 1000
  await assert.rejects(as(U.cashier, `select public.record_sale($1)`, [lying]), /line_total/)
  await assert.rejects(as(U.cashier, `select public.record_sale($1)`, [sale(1, { id: id(1099) })]), /unique|duplicate/)
})

test('clients cannot write or rewrite sales directly', async () => {
  await assert.rejects(as(U.cashier, `insert into public.sales select * from public.sales`))
  const upd = await as(U.ownerA, `update public.sales set total = 1 returning id`)
  assert.equal(upd.length, 0)
  const del = await as(U.ownerA, `delete from public.sales returning id`)
  assert.equal(del.length, 0)
})

test('RLS isolates outlets and businesses', async () => {
  assert.equal((await as(U.cashier2, `select * from public.sales`)).length, 0)
  assert.equal((await as(U.cashier2, `select * from public.stock_balances`)).length, 0)
  assert.deepEqual((await as(U.cashier2, `select code from public.outlets`)).map((r) => r.code), ['YOG'])
  await assert.rejects(as(U.cashier2, `select public.record_sale($1)`, [sale(5)]), /no access/)
  assert.equal((await as(U.ownerB, `select * from public.businesses`)).length, 0)
  assert.equal((await as(U.ownerB, `select * from public.products`)).length, 0)
  assert.equal((await as(U.ownerA, `select * from public.member_pins`)).length, 0)
  await assert.rejects(as(U.cashier, `select public.check_approver_pin($1,$2,'246810')`, [S.outlet1, U.manager]), /permission/)
  await assert.rejects(as(U.cashier, `select public.apply_stock_movement()`), /permission/)
})

test('signed-out callers cannot run any RPC', async () => {
  const anon = (sql) => db.transaction(async (tx) => { await tx.exec('set local role anon'); return tx.query(sql) })
  await assert.rejects(anon(`select public.create_business('x','y','ZZ','z')`), /permission/)
  await assert.rejects(anon(`select public.record_sale('{}'::jsonb)`), /permission/)
  await assert.rejects(anon(`select public.set_my_pin('123456')`), /permission/)
})

test('void needs a manager PIN, returns stock, and can only happen once', async () => {
  const v = (rid, pin) => as(U.cashier, `select public.record_refund($1,$2,'void',null,null,null,'salah input',$3,$4)`,
    [rid, id(1001), U.manager, pin])
  await assert.rejects(v(id(2001), '000000'), /approval failed/)
  await assert.rejects(as(U.cashier, `select public.record_refund($1,$2,'void',null,null,null,'x',$3,'246810')`,
    [id(2002), id(1001), U.cashier]), /approval failed/) // cashier cannot approve
  await v(id(2003), '246810')
  await v(id(2003), '246810') // replay
  await assert.rejects(v(id(2004), '246810'), /already voided/)
  const [s] = await as(U.cashier, `select status from public.sales_with_status where id = $1`, [id(1001)])
  assert.equal(s.status, 'voided')
  const [b] = await as(U.cashier, `select qty from public.stock_balances where product_id = $1`, [S.nasi])
  assert.equal(b.qty, '10.000')
})

test('partial cash refund, then close shift with expected cash', async () => {
  await as(U.cashier, `select public.record_sale($1)`, [sale(6)])
  await as(U.cashier, `select public.record_refund($1,$2,'refund',5500,'cash',$3,'es teh tumpah',$4,'246810')`,
    [id(2010), id(1006), S.shift, U.manager])
  await assert.rejects(as(U.cashier, `select public.record_refund($1,$2,'refund',60000,'cash',$3,'x',$4,'246810')`,
    [id(2011), id(1006), S.shift, U.manager]), /between/)
  await as(U.cashier, `insert into public.cash_movements (id, business_id, outlet_id, shift_id, direction, amount, reason)
    values ($1,$2,$3,$4,'out',20000,'beli es batu')`, [id(3001), S.business, S.outlet1, S.shift])
  const [s] = await as(U.cashier, `select status from public.sales_with_status where id = $1`, [id(1006)])
  assert.equal(s.status, 'partially_refunded')
  // 200000 float + 60500 (sale 6; sale 1 voided) - 5500 refund - 20000 cash out
  const [{ e }] = await as(U.cashier, `select public.close_shift($1, 235000) as e`, [S.shift])
  assert.equal(e, '235000.00')
  await assert.rejects(as(U.cashier, `select public.close_shift($1, 1)`, [S.shift]), /already closed/)
})
