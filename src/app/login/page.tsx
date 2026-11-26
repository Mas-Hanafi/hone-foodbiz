import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Submit } from "@/components/submit-button";
import { Field, Notice, flash } from "@/components/ui";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, ok } = await flash(searchParams);
  return (
    <AuthShell title="Masuk" description="Pakai email dan kata sandi akunmu. Staf mendapat akun dari pemilik usaha.">
      {!supabaseEnv() && (
        <p className="mb-5 rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
          Supabase belum dikonfigurasi. Salin <code>.env.example</code> ke <code>.env.local</code>, isi URL dan anon key, lalu
          jalankan ulang <code>npm run dev</code>.
        </p>
      )}
      <Notice error={error} ok={ok} />
      <form action={signIn} className="grid gap-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Kata sandi" name="password" type="password" autoComplete="current-password" minLength={8} required />
        <Submit className="mt-2 w-full">Masuk</Submit>
      </form>
      <p className="mt-6 text-sm text-on-surface-variant">
        Punya usaha dan belum terdaftar?{" "}
        <Link href="/signup" className="font-bold text-primary underline">Daftarkan usaha</Link>
      </p>
    </AuthShell>
  );
}
