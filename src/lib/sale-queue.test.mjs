import { test } from "node:test";
import assert from "node:assert/strict";
import { flushQueue } from "./sale-queue.ts";

const item = (id, extra = {}) => ({ input: { id }, total: 1000, queuedAt: 0, ...extra });

test("accepted sales leave the queue", async () => {
  const { queue, sent } = await flushQueue([item("a"), item("b")], async () => ({ ok: true }));
  assert.equal(sent, 2);
  assert.deepEqual(queue, []);
});

test("first network failure stops the run and keeps order", async () => {
  const calls = [];
  const { queue, sent } = await flushQueue([item("a"), item("b"), item("c")], async ({ id }) => {
    calls.push(id);
    return id === "b" ? "offline" : { ok: true };
  });
  assert.deepEqual(calls, ["a", "b"]);
  assert.equal(sent, 1);
  assert.deepEqual(queue.map((q) => q.input.id), ["b", "c"]);
});

test("refused sale is marked and not retried", async () => {
  const first = await flushQueue([item("a"), item("b")], async ({ id }) => (id === "a" ? { ok: false, message: "Shift belum dibuka." } : { ok: true }));
  assert.equal(first.sent, 1);
  assert.equal(first.queue[0].error, "Shift belum dibuka.");
  let called = false;
  const second = await flushQueue(first.queue, async () => ((called = true), { ok: true }));
  assert.equal(called, false);
  assert.equal(second.queue.length, 1);
});

test("resending the same id twice is the server's job: the queue sends each item once per run", async () => {
  const seen = [];
  await flushQueue([item("a")], async ({ id }) => (seen.push(id), { ok: true }));
  assert.deepEqual(seen, ["a"]);
});
