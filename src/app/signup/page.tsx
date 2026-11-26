import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Submit } from "@/components/submit-button";
import { Field, Notice, flash } from "@/components/ui";

export const metadata = { title: "Daftarkan usaha" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error } = await flash(searchParams);
  return (
    <AuthShell title="Daftarkan usaha" description="Akun ini jadi pemilik. Staf ditambahkan nanti dari menu Staf.">
      <Notice error={error} />
      <form action={signUp} className="grid gap-4">
        <Field label="Nama kamu" name="display_name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Kata sandi" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Minimal 8 karakter." />
        <Submit className="mt-2 w-full">Buat akun</Submit>
      </form>
      <p className="mt-6 text-sm text-on-surface-variant">
        Sudah punya akun? <Link href="/login" className="font-bold text-primary underline">Masuk</Link>
      </p>
    </AuthShell>
  );
}
