import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { getContext } from "@/lib/session";

export default async function DashboardPage() {
  const ctx = await getContext();
  const count = async (table: string) =>
    (await ctx.supabase.from(table).select("id", { count: "exact", head: true })).count ?? 0;
  const [outlets, products, staff] = await Promise.all([count("outlets"), count("products"), count("memberships")]);

  const tiles = [
    { label: "Outlet", value: outlets, href: "/app/outlets" },
    { label: "Produk", value: products, href: "/app/catalog" },
    { label: "Staf", value: staff, href: ctx.role === "owner" ? "/app/staff" : null },
  ];

  return (
    <>
      <PageHeader title={`Halo, ${ctx.displayName}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => {
          const body = (
            <Card>
              <p className="text-sm text-mute">{t.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{t.value}</p>
            </Card>
          );
          return t.href ? <Link key={t.label} href={t.href}>{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>
      <Card className="mt-6">
        <p className="text-sm text-mute">
          Layar kasir, shift, dan struk datang di M2. Sekarang siapkan dulu outlet, staf, dan menu.
        </p>
      </Card>
    </>
  );
}
