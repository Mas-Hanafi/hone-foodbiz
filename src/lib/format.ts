const IDR = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function rupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return `${n < 0 ? "−" : ""}Rp${IDR.format(Math.abs(n))}`;
}
