// Withdrawals are only allowed 7PM-11PM (19:00-23:00, exclusive of 23:00
// itself), Monday through Saturday, in Nigeria time (Africa/Lagos, WAT,
// UTC+1, no DST) -- NOT server local time, which on Render is UTC. Using
// plain `new Date().getHours()` here would silently be off by an hour for
// every real user.
export function isWithinWithdrawalWindow(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value; // "Sun".."Sat"

  if (weekday === "Sun") return false;
  return hour >= 19 && hour < 23;
}
