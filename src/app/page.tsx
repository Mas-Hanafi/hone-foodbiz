import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold">H One FoodBiz</h1>
      <p className="text-mute">
        Kasir dan pencatatan untuk warung sampai restoran. Open source, data milik usahamu sendiri.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">Masuk</Link>
        <Link href="/signup" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">Daftarkan usaha</Link>
      </div>
    </main>
  );
}
