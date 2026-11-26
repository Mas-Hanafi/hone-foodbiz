const IDR = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function rupiah(value: number | string | null | undefined): string {
  return value === null || value === undefined ? "—" : `Rp${IDR.format(Number(value))}`;
}
