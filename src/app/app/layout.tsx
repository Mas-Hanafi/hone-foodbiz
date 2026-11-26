import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { AppNav } from "@/components/app-nav";
import { ROLE_LABEL, getContext } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ctx = await getContext();
  const initials = ctx.displayName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-1">
      <AppNav showStaff={ctx.role === "owner"} showReports={ctx.role !== "cashier"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <span className="min-w-0 flex-1 truncate font-display text-lg font-extrabold">{ctx.businessName}</span>
          <span className="hidden text-sm text-on-surface-variant sm:block">
            {ctx.displayName} · {ROLE_LABEL[ctx.role]}
          </span>
          <Link
            href="/app/akun"
            aria-label="Akun dan PIN"
            className="press grid size-10 place-items-center rounded-full bg-tertiary-container text-sm font-extrabold text-on-tertiary-container"
          >
            {initials}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="press grid size-12 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </form>
        </header>
        <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-32 sm:px-8 md:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
