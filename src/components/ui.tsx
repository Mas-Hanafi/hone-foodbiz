import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { messageText } from "@/lib/messages";

const control =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground placeholder:text-mute focus:outline-2 focus:outline-offset-1 focus:outline-foreground";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

export function Notice({ error, ok }: { error?: string; ok?: string }) {
  const errorText = messageText(error);
  const okText = messageText(ok);
  if (errorText) {
    return <p role="alert" className="mb-4 rounded-lg border border-accent px-4 py-3 text-sm text-accent">{errorText}</p>;
  }
  if (okText) {
    return <p role="status" className="mb-4 rounded-lg border border-ok px-4 py-3 text-sm text-ok">{okText}</p>;
  }
  return null;
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Field({ label, hint, ...input }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input className={control} {...input} />
      {hint && <span className="text-xs text-mute">{hint}</span>}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode };

export function SelectField({ label, children, ...select }: SelectProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select className={control} {...select}>{children}</select>
    </label>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function TextArea({ label, ...area }: TextAreaProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <textarea className={control} rows={2} {...area} />
    </label>
  );
}

export function Check({ label, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 py-1 text-sm">
      <input type="checkbox" className="size-4 accent-foreground" {...input} />
      {label}
    </label>
  );
}

export function Submit({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "quiet" | "danger" }) {
  const look = {
    primary: "bg-foreground text-background border-foreground",
    quiet: "border-line text-foreground",
    danger: "border-accent text-accent",
  }[tone];
  return (
    <button type="submit" className={`rounded-lg border px-4 py-2 text-sm font-semibold ${look}`}>
      {children}
    </button>
  );
}

export const table = "w-full border-collapse text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-mute";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function flash(searchParams: SearchParams): Promise<{ error?: string; ok?: string }> {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return { error: one(sp.error), ok: one(sp.ok) };
}
