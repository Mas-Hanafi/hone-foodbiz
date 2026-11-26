import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Field, Notice, Submit, flash } from "@/components/ui";
import { supabaseEnv } from "@/lib/supabase/env";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, ok } = await flash(searchParams);
  return (
    <AuthShell title="Masuk">
      {!supabaseEnv() && (
        <p className="mb-4 rounded-lg border border-line px-4 py-3 text-sm text-mute">
          Supabase belum dikonfigurasi. Salin <code>.env.example</code> ke <code>.env.local</code>, isi URL dan anon key,
          lalu jalankan ulang <code>npm run dev</code>.
        </p>
      )}
      <Notice error={error} ok={ok} />
      <form action={signIn} className="grid gap-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Kata sandi" name="password" type="password" autoComplete="current-password" minLength={8} required />
        <Submit>Masuk</Submit>
      </form>
      <p className="mt-5 text-sm text-mute">
        Belum punya usaha terdaftar?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">Daftar</Link>
      </p>
    </AuthShell>
  );
}
