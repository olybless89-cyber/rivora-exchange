import { useState, useEffect } from "react";
import type { UserInvestment } from "@workspace/api-client-react";

/**
 * Per-investment countdown to the next daily ROI payout.
 *
 * Logic: each investment pays out every 24 hours from its exact createdAt
 * timestamp (same time-of-day each day). We find the next multiple of that
 * epoch offset and count down to it.
 *
 * Returns { h, m, s, isMatured } where isMatured = endDate has passed.
 */
export function useInvestmentCountdown(inv: UserInvestment) {
  const getSecsUntilNext = (): number => {
    const now = Date.now();
    const created = new Date(inv.createdAt).getTime();
    const end = new Date(inv.endDate).getTime();

    if (now >= end) return 0; // already matured

    const cycleMs = 24 * 60 * 60 * 1000; // 24 hours in ms
    const elapsed = now - created;
    const secsUntilNext = cycleMs - (elapsed % cycleMs);
    return Math.max(0, Math.floor(secsUntilNext / 1000));
  };

  const [secs, setSecs] = useState(getSecsUntilNext);

  useEffect(() => {
    const id = setInterval(() => setSecs(getSecsUntilNext()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.createdAt, inv.endDate]);

  const isMatured = new Date(inv.endDate).getTime() <= Date.now();
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");

  return { h, m, s, isMatured };
}
