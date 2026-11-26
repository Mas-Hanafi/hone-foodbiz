import { KeyRound } from "lucide-react";
import { Submit } from "@/components/submit-button";
import { Card, Field, IconTile, Notice, PageHeader, flash } from "@/components/ui";
import { ROLE_LABEL, getContext, requireUser } from "@/lib/session";
import { setPin } from "./actions";

export const metadata = { title: "Akun" };

export default async function AkunPage({ searchParams }: PageProps<"/app/akun">) {
  const ctx = await getContext();
  const { email } = await requireUser();
  const { error, ok } = await flash(searchParams);

  return (
    <>
      <PageHeader title="Akun" description={`${ctx.displayName} · ${ROLE_LABEL[ctx.role]} · ${email}`} />
      <Notice error={error} ok={ok} />
      {ctx.role === "cashier" ? (
        <Card>
          <p className="text-on-surface-variant">Kasir tidak memerlukan PIN. Void dan refund disetujui oleh manajer atau pemilik.</p>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <div className="mb-5 flex items-start gap-4">
            <IconTile icon={<KeyRound className="size-5" />} tone="secondary" />
            <div>
              <h2 className="text-xl font-bold">PIN persetujuan</h2>
              <p className="text-sm text-on-surface-variant">
                6 angka. Kamu memasukkannya di perangkat kasir saat menyetujui void atau refund. Jangan bagikan ke kasir.
              </p>
            </div>
          </div>
          <form action={setPin} className="grid gap-4 sm:grid-cols-2">
            <Field label="PIN baru" name="pin" type="password" inputMode="numeric" autoComplete="new-password" minLength={6} maxLength={6} pattern="\d{6}" required />
            <Field label="Ulangi PIN" name="confirm" type="password" inputMode="numeric" autoComplete="new-password" minLength={6} maxLength={6} pattern="\d{6}" required />
            <div className="sm:col-span-2"><Submit>Simpan PIN</Submit></div>
          </form>
        </Card>
      )}
    </>
  );
}
