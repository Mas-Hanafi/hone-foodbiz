// Flash messages travel as keys in ?error= / ?ok=, never as free text,
// so a crafted link cannot put arbitrary words on our pages.
export const MESSAGES = {
  generic: "Gagal menyimpan. Coba lagi.",
  invalid: "Data tidak valid. Periksa isian.",
  duplicate: "Sudah ada data dengan kode atau nama itu.",
  forbidden: "Kamu tidak punya akses untuk ini.",
  missing: "Data terkait tidak ditemukan.",
  login: "Email atau kata sandi salah.",
  emailTaken: "Email ini sudah terdaftar.",
  noServiceKey: "SUPABASE_SERVICE_ROLE_KEY belum diisi di server, jadi akun staf belum bisa dibuat.",
  password: "Kata sandi minimal 8 karakter.",
  email: "Format email tidak valid.",
  name: "Nama wajib diisi.",
  outletCode: "Kode outlet 2–8 huruf atau angka, mis. JKT.",
  terminalCode: "Kode terminal 1–4 huruf atau angka, mis. T1.",
  price: "Harga harus angka, mis. 25000 atau 25.000.",
  percent: "Persen harus angka 0–100.",
  linkInvalid: "Tautan konfirmasi tidak valid atau sudah kedaluwarsa.",
  checkEmail: "Akun dibuat. Buka email konfirmasi, lalu masuk.",
  noTerminal: "Terminal tidak ditemukan atau bukan di outletmu. Pilih lagi.",
  shiftOpened: "Shift dibuka. Selamat jualan!",
  shiftClosed: "Shift ditutup.",
  noShift: "Belum ada shift terbuka di terminal ini.",
  pin: "PIN harus 6 angka.",
  pinMismatch: "Kedua PIN tidak sama.",
  pinSaved: "PIN tersimpan. Pakai PIN ini untuk menyetujui void dan refund.",
  cashMoved: "Kas tercatat.",
  reason: "Alasan wajib diisi.",
  voided: "Transaksi dibatalkan (void).",
  refunded: "Refund tercatat.",
  approval: "Persetujuan gagal: PIN salah atau bukan manajer outlet ini.",
  alreadyVoided: "Transaksi ini sudah dibatalkan.",
  shiftClosedVoid: "Shift transaksi ini sudah ditutup. Pakai refund.",
  refundAmount: "Jumlah refund melebihi sisa yang bisa dikembalikan.",
  needShift: "Refund tunai perlu shift terbuka di terminal ini.",
  expenseSaved: "Pengeluaran tercatat.",
  drawerShift: "Untuk \"dibayar dari laci\", buka shift di perangkat ini pada outlet yang sama.",
  stockSaved: "Stok diperbarui.",
  stockNoChange: "Jumlah fisik sama dengan stok sistem. Tidak ada yang diubah.",
  saved: "Tersimpan.",
  created: "Dibuat.",
  deleted: "Dihapus.",
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function messageText(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key in MESSAGES ? MESSAGES[key as MessageKey] : MESSAGES.generic;
}
