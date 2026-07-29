import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

interface PlanCarouselProps {
  plans: any[];
  /** If provided, clicking a card / INVEST NOW calls this. If omitted, cards link to /invest. */
  onSelect?: (plan: any) => void;
  /** Full-width mode: one plan per slide with all stats displayed */
  fullWidth?: boolean;
}

const CARD_W = 160;
const GAP = 12;
const INTERVAL_MS = 2500;

export function PlanCarousel({ plans, onSelect, fullWidth = false }: PlanCarouselProps) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = plans.length;

  const goTo = (idx: number) => setActive(((idx % total) + total) % total);

  const startAuto = () => {
    if (total < 2) return;
    timerRef.current = setInterval(() => setActive((p) => (p + 1) % total), INTERVAL_MS);
  };
  const stopAuto = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    startAuto();
    return stopAuto;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; stopAuto(); };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
    startAuto();
  };

  if (total === 0) return null;

  // ── Full-width single-plan slideshow ──────────────────────────────────────
  if (fullWidth) {
    return (
      <div style={{ marginBottom: 24 }} ref={containerRef}>
        {/* Track */}
        <div style={{ overflow: "hidden" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div style={{
            display: "flex",
            transform: `translateX(${active * -100}%)`,
            transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
            willChange: "transform",
          }}>
            {plans.map((plan, i) => {
              const principal = Number(plan.minAmount);
              const daily     = (principal * Number(plan.dailyRate)) / 100;
              const profit30  = daily * 30;
              const profit90  = daily * plan.durationDays;
              const totalRet  = principal + profit90;
              const isActive  = i === active;

              return (
                <div key={plan.id} style={{ minWidth: "100%", boxSizing: "border-box", padding: "0 2px" }}>
                  <Card style={{
                    padding: "20px 18px",
                    border: "1px solid rgba(212,175,55,0.45)",
                    background: "linear-gradient(160deg, rgba(13,32,68,0.95) 0%, rgba(8,20,45,0.95) 100%)",
                    boxShadow: "0 0 32px rgba(212,175,55,0.08)",
                    transition: "box-shadow 0.35s ease",
                  }}>
                    {/* Plan name badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{
                        background: "linear-gradient(135deg,#0d2044,#1a3a6a)",
                        border: "1px solid rgba(96,165,250,0.4)",
                        borderRadius: 8, padding: "4px 14px",
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: "#60a5fa", letterSpacing: "0.05em" }}>{plan.name}</span>
                      </div>
                      <div style={{
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: 8, padding: "4px 12px",
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>{Number(plan.dailyRate)}%</span>
                        <span style={{ fontSize: 10, color: "#86efac", marginLeft: 3 }}>daily</span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    {[
                      { label: "Principal",      value: fmt(principal), color: "#e8eaec", sub: "Minimum deposit" },
                      { label: "Daily Profit",   value: fmt(daily),     color: "#22c55e", sub: "5% per day" },
                      { label: "30-Day Profit",  value: fmt(profit30),  color: "#22c55e", sub: "Monthly earnings" },
                      { label: "90-Day Profit",  value: fmt(profit90),  color: "#D4AF37", sub: "Full term earnings" },
                      { label: "Total Return",   value: fmt(totalRet),  color: "#D4AF37", sub: "Principal + profit", highlight: true },
                    ].map((row) => (
                      <div key={row.label} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", marginBottom: 6, borderRadius: 8,
                        background: row.highlight
                          ? "rgba(212,175,55,0.1)"
                          : "rgba(255,255,255,0.03)",
                        border: row.highlight
                          ? "1px solid rgba(212,175,55,0.3)"
                          : "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#e8eaec", margin: 0 }}>{row.label}</p>
                          <p style={{ fontSize: 10, color: "#9C9C9C", margin: "2px 0 0" }}>{row.sub}</p>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: row.color }}>{row.value}</span>
                      </div>
                    ))}

                    {/* Invest button */}
                    <button
                      onClick={() => onSelect && onSelect(plan)}
                      style={{
                        marginTop: 12, width: "100%",
                        background: "linear-gradient(135deg,#D4AF37,#A6821F)",
                        border: "none", borderRadius: 10,
                        color: "#0A0A0A", fontSize: 14, fontWeight: 900,
                        padding: "14px 0", cursor: "pointer",
                        letterSpacing: "0.06em",
                        boxShadow: "0 4px 16px rgba(212,175,55,0.25)",
                      }}
                    >
                      INVEST IN {plan.name}
                    </button>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prev / Next arrows + dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
          <button onClick={() => { stopAuto(); goTo(active - 1); startAuto(); }}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#9C9C9C", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>

          <div style={{ display: "flex", gap: 6 }}>
            {plans.map((_, i) => (
              <button key={i} onClick={() => { stopAuto(); goTo(i); startAuto(); }}
                style={{
                  width: i === active ? 20 : 6, height: 6, borderRadius: 3,
                  border: "none", cursor: "pointer", padding: 0,
                  background: i === active ? "#D4AF37" : "rgba(255,255,255,0.2)",
                  transition: "width 0.3s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>

          <button onClick={() => { stopAuto(); goTo(active + 1); startAuto(); }}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#9C9C9C", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>

        {/* Plan counter */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#9C9C9C", margin: "8px 0 0" }}>
          {active + 1} / {total} plans
        </p>
      </div>
    );
  }

  // ── Compact horizontal strip (Dashboard) ─────────────────────────────────
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ overflow: "hidden" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{
          display: "flex", gap: GAP,
          transform: `translateX(calc(${active * -(CARD_W + GAP)}px + 20px))`,
          transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform", paddingBottom: 6,
        }}>
          {plans.map((plan, i) => {
            const principal = Number(plan.minAmount);
            const daily     = (principal * Number(plan.dailyRate)) / 100;
            const profit90  = daily * plan.durationDays;
            const isActive  = i === active;

            const cardContent = (
              <Card style={{
                flexShrink: 0, width: CARD_W, padding: 16, cursor: "pointer",
                border: isActive ? "1px solid rgba(212,175,55,0.65)" : "1px solid rgba(255,255,255,0.06)",
                background: isActive ? "rgba(212,175,55,0.08)" : "rgba(13,32,68,0.5)",
                transform: isActive ? "scale(1.04)" : "scale(0.97)",
                transition: "transform 0.35s ease, border-color 0.35s ease, background 0.35s ease",
                boxShadow: isActive ? "0 0 20px rgba(212,175,55,0.13)" : "none",
              }}
                onClick={() => onSelect && onSelect(plan)}
              >
                <p style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", margin: 0, letterSpacing: "0.03em" }}>{plan.name}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", margin: "6px 0 0", lineHeight: 1 }}>
                  {fmt(daily)}<span style={{ fontSize: 9, color: "#9C9C9C", fontWeight: 400 }}>/day</span>
                </p>
                <p style={{ fontSize: 10, color: "#9C9C9C", margin: "4px 0 2px" }}>Min {fmt(principal)}</p>
                <p style={{ fontSize: 10, color: "#D4AF37", margin: 0 }}>90d total: {fmt(profit90)}</p>
                {isActive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect ? onSelect(plan) : undefined; }}
                    style={{
                      marginTop: 10, width: "100%",
                      background: "linear-gradient(135deg,#D4AF37,#A6821F)",
                      border: "none", borderRadius: 7, color: "#0A0A0A",
                      fontSize: 10, fontWeight: 800, padding: "7px 0",
                      cursor: "pointer", letterSpacing: "0.04em",
                    }}
                  >INVEST NOW</button>
                )}
              </Card>
            );

            return onSelect ? (
              <div key={plan.id} style={{ flexShrink: 0, width: CARD_W }}>{cardContent}</div>
            ) : (
              <Link key={plan.id} href="/invest" style={{ textDecoration: "none", flexShrink: 0, width: CARD_W }}>{cardContent}</Link>
            );
          })}
        </div>
      </div>

      {total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
          {plans.map((_, i) => (
            <button key={i} onClick={() => { stopAuto(); goTo(i); startAuto(); }}
              style={{
                width: i === active ? 18 : 6, height: 6, borderRadius: 3,
                border: "none", cursor: "pointer", padding: 0,
                background: i === active ? "#D4AF37" : "rgba(255,255,255,0.2)",
                transition: "width 0.3s ease, background 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

