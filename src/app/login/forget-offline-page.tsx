"use client";

import { useEffect } from "react";

/**
 * On the sign-in screen nobody is signed in, so drop the saved cashier page (it holds business data).
 * Unsent sales in the device queue are kept: they are money already taken.
 */
export function ForgetOfflinePage() {
  useEffect(() => {
    if ("caches" in window) void caches.delete("pos-pages-v1");
  }, []);
  return null;
}
