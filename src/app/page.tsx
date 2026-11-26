import { ButtonLink } from "@/components/ui";

export default function Home() {
  return (
    <main className="grid flex-1 place-items-center bg-primary-container px-4 py-16 text-on-primary-container">
      <div className="w-full max-w-2xl">
        <p className="font-display text-xl font-extrabold">H One FoodBiz</p>
        <h1 className="mt-6 text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
          Kasir dan catatan untuk warung sampai restoran.
        </h1>
        <p className="mt-5 max-w-lg text-lg opacity-90">Open source, gratis dipakai sendiri, dan data tetap milik usahamu.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/signup">Daftarkan usaha</ButtonLink>
          <ButtonLink href="/login" look="outlined">Masuk</ButtonLink>
        </div>
      </div>
    </main>
  );
}
