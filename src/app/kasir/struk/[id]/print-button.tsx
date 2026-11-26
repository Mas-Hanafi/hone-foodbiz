"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function PrintButton({ look = "filled" }: { look?: "filled" | "tonal" | "outlined" }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass(look)}>
      <Printer className="size-4" aria-hidden />
      Cetak / simpan PDF
    </button>
  );
}
