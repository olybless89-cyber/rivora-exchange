// Client-side mirror of the server's withdrawal-window check (artifacts/
// api-server/src/lib/withdrawal-window.ts) -- used only for immediate UX
// feedback (disabling the submit button / showing a warning). The server
// re-validates independently and is the real source of truth.
export function isWithinWithdrawalWindow(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value;

  if (weekday === "Sun") return false;
  return hour >= 19 && hour < 23;
}
