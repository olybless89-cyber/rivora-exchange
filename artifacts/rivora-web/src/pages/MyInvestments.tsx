import { useGetMe, useListInvestments } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

// Returns seconds until next 00:01 UTC (when the daily cron fires)
function useNextMiningCountdown() {
  const getSecondsUntilNextMining = () => {
    const now = new Date();
    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1, // tomorrow
      0, 1, 0             // 00:01:00 UTC
    ));
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  };

  const [secs, setSecs] = useState(getSecondsUntilNextMining);

  useEffect(() => {
    const id = setInterval(() => setSecs(getSecondsUntilNextMining()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");

  // Next mining date label
  const nextDate = new Date();
  if (new Date().getUTCHours() > 0 || new Date().getUTCMinutes() >= 1) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  const dateLabel = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;

  return { h, m, s, dateLabel };
}

function NextMiningBox() {
  const { h, m, s, dateLabel } = useNextMiningCountdown();
  return (
    <div style={{
      background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
      borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 120,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", margin: 0, letterSpacing: 1 }}>
        {dateLabel}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b", margin: "2px 0", fontVariantNumeric: "tabular-nums", letterSpacing: 2 }}>
        {h}:{m}:{s}
      </p>
      <p style={{ fontSize: 10, color: "#9C9C9C", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Next Mining
      </p>
    </div>
  );
}

export default function MyInvestmentsPage() {
  const { data: user } = useGetMe();
  const { data: investments, isLoading } = useListInvestments(
    user ? { userId: user.id } : undefined,
    { query: { enabled: !!user } },
  );

  const active = (investments ?? []).filter((inv) => inv.status === "active");
  const completed = (investments ?? []).filter((inv) => inv.status === "completed");

  const totalDailyIncome = active.reduce((sum, inv) => {
    return sum + (Number(inv.amount) * Number(inv.dailyRate)) / 100;
  }, 0);
  const totalIncome = active.reduce((sum, inv) => {
    const daily = (Number(inv.amount) * Number(inv.dailyRate)) / 100;
    const days = differenceInDays(new Date(inv.endDate), new Date(inv.startDate));
    return sum + daily * days;
  }, 0);

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>My Investments</h1>
        <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 20px" }}>Track your active and completed investments</p>

        {active.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24,
          }}>
            {[
              { label: "Active Plans", value: active.length.toString() },
              { label: "Daily Income", value: formatNaira(totalDailyIncome) },
              { label: "Total Income", value: formatNaira(totalIncome) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "14px 10px", textAlign: "center",
              }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{value}</p>
                <p style={{ fontSize: 10, color: "#9C9C9C", margin: "4px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {isLoading && <p style={{ color: "#9C9C9C", textAlign: "center", padding: 32 }}>Loading investments…</p>}

        {active.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {active.map((inv) => {
                const dailyIncome = (Number(inv.amount) * Number(inv.dailyRate)) / 100;
                const daysTotal = differenceInDays(new Date(inv.endDate), new Date(inv.startDate));
                const invTotalIncome = dailyIncome * daysTotal;
                const daysRemaining = Math.max(0, differenceInDays(new Date(inv.endDate), new Date()));
                const progress = Math.min(100, ((daysTotal - daysRemaining) / daysTotal) * 100);
                const nearEnd = daysRemaining <= 7;
                return (
                  <Card key={inv.id} style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#D4AF37", fontStyle: "italic" }}>{inv.planName}</p>
                        <p style={{ fontSize: 12, color: "#9C9C9C", margin: "3px 0 0" }}>Started {format(new Date(inv.startDate), "MMM d, yyyy")}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      <StatBox label="Deposited" value={formatNaira(inv.amount)} />
                      <StatBox label="Total return" value={formatNaira(invTotalIncome)} />
                    </div>
                    {/* Daily income + Next Mining row */}
                    <div style={{ display: "flex", gap: 10, alignItems: "stretch", marginBottom: 14 }}>
                      <StatBox label="Daily income" value={formatNaira(dailyIncome)} highlight flex1 />
                      <NextMiningBox />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#9C9C9C" }}>{daysTotal - daysRemaining} of {daysTotal} days</span>
                        <span style={{ fontSize: 11, color: nearEnd ? "#f59e0b" : "#D4AF37", fontWeight: 600 }}>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 10, width: `${progress}%`, background: nearEnd ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#D4AF37,#B8960C)", transition: "width 0.4s ease" }} />
                      </div>
                      <p style={{ fontSize: 11, color: "#9C9C9C", margin: "6px 0 0" }}>Ends {format(new Date(inv.endDate), "MMM d, yyyy")}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {completed.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#9C9C9C", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Completed</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completed.map((inv) => {
                const dailyIncome = (Number(inv.amount) * Number(inv.dailyRate)) / 100;
                const daysTotal = differenceInDays(new Date(inv.endDate), new Date(inv.startDate));
                return (
                  <Card key={inv.id} style={{ padding: 16, opacity: 0.7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#fff" }}>{inv.planName}</p>
                        <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>{format(new Date(inv.startDate), "MMM d")} – {format(new Date(inv.endDate), "MMM d, yyyy")}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37", margin: 0 }}>{formatNaira(dailyIncome * daysTotal)}</p>
                        <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>Total earned</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {!isLoading && active.length === 0 && completed.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <TrendingUp size={40} color="#333" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>No investments yet</p>
            <p style={{ color: "#9C9C9C", fontSize: 13, margin: 0 }}>Go to the Invest tab to start earning daily income.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatBox({ label, value, highlight, flex1 }: { label: string; value: string; highlight?: boolean; flex1?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 8px", textAlign: "center", border: highlight ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)", flex: flex1 ? 1 : undefined }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? "#D4AF37" : "#fff", margin: 0 }}>{value}</p>
      <p style={{ fontSize: 10, color: "#9C9C9C", margin: "3px 0 0" }}>{label}</p>
    </div>
  );
}
