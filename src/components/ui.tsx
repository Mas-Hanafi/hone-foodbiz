import Link from "next/link";
import type {
  ComponentProps, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { messageText } from "@/lib/messages";

// ── tones: M3 container roles ──
export type Tone = "primary" | "secondary" | "tertiary" | "error" | "surface";
const TONE: Record<Tone, string> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  error: "bg-error-container text-on-error-container",
  surface: "bg-surface-lowest text-on-surface",
};

// ── buttons ──
type ButtonLook = "filled" | "tonal" | "outlined" | "text" | "danger";
const LOOK: Record<ButtonLook, string> = {
  filled: "bg-primary text-on-primary shadow-card hover:shadow-raised",
  tonal: "bg-secondary-container text-on-secondary-container hover:brightness-95",
  outlined: "border border-outline text-primary hover:bg-primary/8",
  text: "text-primary hover:bg-primary/8 px-3",
  danger: "border border-error text-error hover:bg-error/8",
};
export const buttonClass = (look: ButtonLook = "filled", extra = "") =>
  `press inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-bold ` +
  `disabled:pointer-events-none disabled:opacity-40 ${LOOK[look]} ${extra}`;

export function ButtonLink({ look = "filled", className = "", ...props }: ComponentProps<typeof Link> & { look?: ButtonLook }) {
  return <Link className={buttonClass(look, className)} {...props} />;
}

// ── layout ──
export function PageHeader({ title, description, children, size = "md" }: {
  title: string; description?: string; children?: ReactNode; size?: "md" | "lg";
}) {
  const titleSize = size === "lg" ? "text-[2.6rem] sm:text-6xl" : "text-[1.9rem] sm:text-4xl";
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className={`${titleSize} leading-[1.05] font-extrabold tracking-tight`}>{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-on-surface-variant">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Card({ title, action, tone = "surface", children, className = "", id }: {
  title?: string; action?: ReactNode; tone?: Tone; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <section id={id} className={`rounded-(--radius-card) p-5 sm:p-6 ${TONE[tone]} ${tone === "surface" ? "shadow-card" : ""} ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function IconTile({ icon, tone = "primary", size = "md" }: { icon: ReactNode; tone?: Tone; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-14 rounded-[1.25rem]" : "size-11 rounded-2xl";
  return <span aria-hidden className={`grid shrink-0 place-items-center ${box} ${TONE[tone]}`}>{icon}</span>;
}

export function StatusChip({ tone = "surface", children }: { tone?: Tone; children: ReactNode }) {
  const look = tone === "surface" ? "border border-outline-variant text-on-surface-variant" : TONE[tone];
  return <span className={`inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-bold whitespace-nowrap ${look}`}>{children}</span>;
}

export function ListRow({ href, leading, title, supporting, trailing, muted = false }: {
  href?: string; leading?: ReactNode; title: ReactNode; supporting?: ReactNode; trailing?: ReactNode; muted?: boolean;
}) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${muted ? "text-on-surface-variant" : ""}`}>{title}</span>
        {supporting && <span className="block text-sm text-on-surface-variant">{supporting}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = "flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2.5";
  return href ? (
    <Link href={href} className={`press ${cls} hover:bg-surface-container`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-outline-variant px-6 py-10 text-center">
      <IconTile icon={icon} tone="secondary" size="lg" />
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="max-w-sm text-sm text-on-surface-variant">{children}</div>}
    </div>
  );
}

// ── feedback ──
export function Notice({ error, ok }: { error?: string; ok?: string }) {
  const errorText = messageText(error);
  const okText = messageText(ok);
  if (!errorText && !okText) return null;
  const isError = Boolean(errorText);
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold ${isError ? TONE.error : TONE.tertiary}`}
    >
      {isError ? <CircleAlert className="size-5 shrink-0" aria-hidden /> : <CircleCheck className="size-5 shrink-0" aria-hidden />}
      {errorText ?? okText}
    </p>
  );
}

// ── form controls ──
const control =
  "w-full min-h-12 rounded-(--radius-field) border border-outline bg-surface-lowest px-4 text-base text-on-surface " +
  "placeholder:text-on-surface-variant/70 transition-[border-color,box-shadow] duration-150 " +
  "hover:border-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; prefix?: string };

export function Field({ label, hint, prefix, className = "", ...input }: FieldProps) {
  return (
    <label className={`grid content-start gap-1.5 text-sm ${className}`}>
      <span className="font-bold">{label}</span>
      {prefix ? (
        <span className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-on-surface-variant">{prefix}</span>
          <input className={`${control} num pl-11`} {...input} />
        </span>
      ) : (
        <input className={control} {...input} />
      )}
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode };

export function SelectField({ label, children, className = "", ...select }: SelectProps) {
  return (
    <label className={`grid content-start gap-1.5 text-sm ${className}`}>
      <span className="font-bold">{label}</span>
      <span className="relative block">
        <select className={`${control} cursor-pointer appearance-none pr-11`} {...select}>{children}</select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-primary" aria-hidden />
      </span>
    </label>
  );
}

export function TextArea({ label, className = "", ...area }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={`grid content-start gap-1.5 text-sm ${className}`}>
      <span className="font-bold">{label}</span>
      <textarea className={`${control} py-3`} rows={2} {...area} />
    </label>
  );
}

export function Check({ label, hint, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2 text-sm">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary" {...input} />
      <span>
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
}

/** Checkbox drawn as an M3 switch; still a native checkbox for forms and screen readers. */
export function Switch({ label, hint, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2 text-sm">
      <span>
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...input} />
        <span className="h-8 w-[3.25rem] rounded-full border-2 border-outline bg-surface-high transition-colors duration-200 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
        <span className="absolute top-2 left-2 size-4 rounded-full bg-outline transition-[translate,scale,background-color] duration-300 ease-(--ease-spring) peer-checked:translate-x-5 peer-checked:scale-150 peer-checked:bg-on-primary" />
      </span>
    </label>
  );
}

/** Checkbox drawn as an M3 filter chip. */
export function ChipCheck({ label, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="press cursor-pointer">
      <input type="checkbox" className="peer sr-only" {...input} />
      <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-current/40 px-4 text-sm font-bold peer-checked:border-transparent peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-3 peer-focus-visible:outline-primary">
        {label}
      </span>
    </label>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function flash(searchParams: SearchParams): Promise<{ error?: string; ok?: string }> {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return { error: one(sp.error), ok: one(sp.ok) };
}
