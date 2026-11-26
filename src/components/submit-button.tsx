"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { buttonClass } from "./ui";

type Props = { children: ReactNode; look?: "filled" | "tonal" | "outlined" | "text" | "danger"; className?: string };

/** Submit button that disables itself and shows a spinner while its form's server action runs. */
export function Submit({ children, look = "filled", className = "" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(look, className)}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
