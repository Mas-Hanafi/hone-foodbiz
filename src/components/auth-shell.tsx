import type { ReactNode } from "react";
import { Card } from "./ui";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <p className="mb-2 text-sm font-semibold tracking-wide text-mute">H One FoodBiz</p>
      <Card>
        <h1 className="mb-5 text-2xl font-bold">{title}</h1>
        {children}
      </Card>
    </main>
  );
}
