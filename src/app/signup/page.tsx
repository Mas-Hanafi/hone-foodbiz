import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Field, Notice, Submit, flash } from "@/components/ui";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error } = await flash(searchParams);
  return (
    <AuthShell title="Daftarkan usaha">
      <Notice error={error} />
      <form action={signUp} className="grid gap-4">
        <Field label="Nama kamu" name="display_name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Kata sandi" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Minimal 8 karakter." />
        <Submit>Daftar</Submit>
      </form>
      <p className="mt-5 text-sm text-mute">
        Sudah punya akun? <Link href="/login" className="font-medium text-foreground underline">Masuk</Link>
      </p>
      <p className="mt-2 text-xs text-mute">Akun staf dibuat oleh pemilik usaha dari menu Staf, bukan lewat halaman ini.</p>
    </AuthShell>
  );
}
