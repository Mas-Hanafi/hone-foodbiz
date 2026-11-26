# H One FoodBiz

Open-source point of sale and bookkeeping for small food businesses, from a warung to a restaurant. Ring up orders on a phone or tablet, print or share receipts (58 mm, 80 mm, A4 PDF), track shifts, cash, expenses, and stock, and keep selling when the internet drops.

The demo business ("Dapur Senja") and all data are fictional.

> Status: M0 done (planning + database), M1 in progress. See [docs/PRD.md](docs/PRD.md).

## Docs

- [Product requirements](docs/PRD.md)
- [Data model and access rules](docs/ERD.md)
- [POS wireframe](docs/wireframes/pos.html)

## Stack

Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase (Postgres, Row-Level Security, Auth, Storage), IndexedDB for offline sales, jsPDF.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev
```

Apply the database schema to your Supabase project with the Supabase CLI (`supabase db push`) or by running `supabase/migrations/*.sql` in the SQL editor.

## Tests

```bash
npm run test:db     # migrations + RLS against in-process Postgres (PGlite), no Docker needed
npm run typecheck
```

## License

[MIT](LICENSE)
