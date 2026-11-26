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
  saved: "Tersimpan.",
  created: "Dibuat.",
  deleted: "Dihapus.",
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function messageText(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key in MESSAGES ? MESSAGES[key as MessageKey] : MESSAGES.generic;
}
