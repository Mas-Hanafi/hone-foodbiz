import type { Tone } from "@/components/ui";

export const SALE_STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: "Lunas", tone: "tertiary" },
  voided: { label: "Void", tone: "error" },
  refunded: { label: "Refund penuh", tone: "error" },
  partially_refunded: { label: "Refund sebagian", tone: "secondary" },
};

export const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", transfer: "Transfer" };
