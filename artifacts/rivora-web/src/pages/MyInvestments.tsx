import { useGetMe, useListInvestments } from "@workspace/api-client-react";
import type { UserInvestment } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import { useInvestmentCountdown } from "@/hooks/useInvestmentCountdown";
import { differenceInDays, format } from "date-fns";
import { TrendingUp, Timer } from "lucide-react";

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

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>My Investments</h1>
        <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 20px" }}>Track your active and completed investments</p>

        {active.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, #141414, #050505)", border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: "0 0 40px rgba(212,175,55,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ color: "#9C9C9C", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Total Daily Income</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#D4AF37", margin: "6px 0 0" }}>{formatNaira(totalDailyIncome)}</p>
              <p style={{ color: "#9C9C9C", fontSize: 12, margin: "4px 0 0" }}>Across {active.length} active plan{active.length > 1 ? "s" : ""}</p>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={22} color="#D4AF37" />
            </div>
          </div>
        )}

        {isLoading && <p style={{ color: "#9C9C9C", textAlign: "center", padding: 32 }}>Loading investments…</p>}

        {active.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {active.map((inv) => (
                <ActiveInvestmentCard key={inv.id} inv={inv} />
              ))}
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

/** Full active-investment card with per-investment countdown next to "Invest More" */
function ActiveInvestmentCard({ inv }: { inv: UserInvestment }) {
  const { h, m, s, isMatured } = useInvestmentCountdown(inv);
  const dailyIncome = (Number(inv.amount) * Number(inv.dailyRate)) / 100;
  const daysTotal = differenceInDays(new Date(inv.endDate), new Date(inv.startDate));
  const totalIncome = dailyIncome * daysTotal;
  const daysRemaining = Math.max(0, differenceInDays(new Date(inv.endDate), new Date()));
  const progress = Math.min(100, ((daysTotal - daysRemaining) / daysTotal) * 100);
  const nearEnd = daysRemaining <= 7;

  return (
    <Card style={{ padding: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#D4AF37", fontStyle: "italic" }}>{inv.planName}</p>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "3px 0 0" }}>Started {format(new Date(inv.startDate), "MMM d, yyyy")}</p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: "#22c55e",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 20, padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em",
        }}>Active</span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <StatBox label="Deposited" value={formatNaira(inv.amount)} />
        <StatBox label="Daily income" value={formatNaira(dailyIncome)} highlight />
        <StatBox label="Total return" value={formatNaira(totalIncome)} />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#9C9C9C" }}>{daysTotal - daysRemaining} of {daysTotal} days</span>
          <span style={{ fontSize: 11, color: nearEnd ? "#f59e0b" : "#D4AF37", fontWeight: 600 }}>
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
          </span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 10, width: `${progress}%`,
            background: nearEnd ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#D4AF37,#B8960C)",
            transition: "width 0.4s ease",
          }} />
        </div>
        <p style={{ fontSize: 11, color: "#9C9C9C", margin: "6px 0 0" }}>Ends {format(new Date(inv.endDate), "MMM d, yyyy")}</p>
      </div>

      {/* Countdown row — sits directly above "invest more" context, adjacent to the order action */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: isMatured ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.05)",
        border: `1px solid ${isMatured ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.15)"}`,
        borderRadius: 10, padding: "10px 14px",
      }}>
        <div>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9C9C9C", margin: 0 }}>
            {isMatured ? "Status" : "Next payout in"}
          </p>
          {isMatured ? (
            <p style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", margin: "3px 0 0" }}>Matured ✓</p>
          ) : (
            <p className="tabular-nums" style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b", margin: "3px 0 0", letterSpacing: 2 }}>
              {h}:{m}:{s}
            </p>
          )}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isMatured ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${isMatured ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Timer size={18} color={isMatured ? "#22c55e" : "#f59e0b"} />
        </div>
      </div>
    </Card>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 8px", textAlign: "center", border: highlight ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? "#D4AF37" : "#fff", margin: 0 }}>{value}</p>
      <p style={{ fontSize: 10, color: "#9C9C9C", margin: "3px 0 0" }}>{label}</p>
    </div>
  );
}
