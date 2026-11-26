"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { queueKey } from "@/lib/sale-queue";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** Blocks closing the shift while this device still holds sales that never reached the server. */
export function QueueGate({ terminalId, children }: { terminalId: string; children: React.ReactNode }) {
  const pending = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = localStorage.getItem(queueKey(terminalId));
        return raw ? (JSON.parse(raw) as unknown[]).length : 0;
      } catch {
        return 0;
      }
    },
    () => 0,
  );

  return (
    <>
      {pending > 0 && (
        <p role="alert" className="mb-4 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
          {pending} transaksi offline belum terkirim dari perangkat ini. Buka <Link href="/kasir" className="underline">layar kasir</Link> saat online agar terkirim, baru tutup shift.
        </p>
      )}
      <fieldset disabled={pending > 0} className="contents">{children}</fieldset>
    </>
  );
}
