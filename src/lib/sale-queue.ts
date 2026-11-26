/**
 * Offline sale queue. A sale that could not reach the server is kept on the device and sent again later.
 * Resending is safe: the sale id is generated on the device and record_sale ignores an id it already has.
 */

export type QueuedSale<T> = {
  input: T & { id: string };
  total: number;
  queuedAt: number;
  /** Set when the server answered and refused the sale; it stays visible until the cashier removes it. */
  error?: string;
};

/** What happened when one sale was sent: accepted, refused by the server, or no connection. */
export type SendOutcome = { ok: true } | { ok: false; message: string } | "offline";

export const queueKey = (terminalId: string) => `pos-queue:${terminalId}`;

/**
 * Sends pending sales oldest first. Accepted sales leave the queue, refused ones are marked,
 * and the first network failure stops the run so the order of the rest is kept.
 */
export async function flushQueue<T>(
  queue: QueuedSale<T>[],
  send: (input: QueuedSale<T>["input"]) => Promise<SendOutcome>,
): Promise<{ queue: QueuedSale<T>[]; sent: number }> {
  const rest: QueuedSale<T>[] = [];
  let sent = 0;
  let offline = false;
  for (const item of queue) {
    if (offline || item.error) {
      rest.push(item);
      continue;
    }
    const outcome = await send(item.input);
    if (outcome === "offline") {
      offline = true;
      rest.push(item);
    } else if (outcome.ok) {
      sent += 1;
    } else {
      rest.push({ ...item, error: outcome.message });
    }
  }
  return { queue: rest, sent };
}

export function readQueue<T>(terminalId: string): QueuedSale<T>[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(queueKey(terminalId)) ?? "[]");
    return Array.isArray(parsed) ? (parsed as QueuedSale<T>[]) : [];
  } catch {
    return [];
  }
}

/** Returns false when the device refused to store it (storage full or blocked). */
export function writeQueue<T>(terminalId: string, queue: QueuedSale<T>[]): boolean {
  try {
    if (queue.length) localStorage.setItem(queueKey(terminalId), JSON.stringify(queue));
    else localStorage.removeItem(queueKey(terminalId));
    return true;
  } catch {
    return false;
  }
}
