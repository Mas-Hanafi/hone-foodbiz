import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { ROLE_LABEL, getContext } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ctx = await getContext();
  const nav = [
    { href: "/app", label: "Beranda" },
    { href: "/app/catalog", label: "Katalog" },
    { href: "/app/outlets", label: "Outlet" },
    ...(ctx.role === "owner" ? [{ href: "/app/staff", label: "Staf" }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/app" className="font-bold">{ctx.businessName}</Link>
          <nav className="flex gap-4 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="text-mute hover:text-foreground">{item.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-mute">{ctx.displayName} · {ROLE_LABEL[ctx.role]}</span>
            <form action={signOut}>
              <button type="submit" className="font-medium underline">Keluar</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
