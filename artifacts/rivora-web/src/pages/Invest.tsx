import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGetMe, useListInvestmentPlans, useCreateInvestment, getListInvestmentsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VipPlanCard } from "@/components/VipPlanCard";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { VipPlan, calculateVipReturns, formatNaira as formatVipNaira } from "@/lib/vipPlans";

// Memoized plan mapper to prevent unnecessary recalculations
const mapDbPlanToVipPlan = (p: any): VipPlan => ({
  id: p.id,
  name: p.name,
  vipNumber: parseInt(p.name.replace(/[^0-9]/g, ""), 10) || 0,
  principal: Number(p.minAmount),
  dailyRate: Number(p.dailyRate),
  durationDays: p.durationDays,
});

export default function InvestPage() {
  const { data: user } = useGetMe();
  const { data: dbPlans, isLoading, isError } = useListInvestmentPlans({ activeOnly: true });
  const createInvestment = useCreateInvestment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [amount, setAmount] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize plans mapping to prevent recalculation on every render
  const plans = useMemo(() => (dbPlans ?? []).map(mapDbPlanToVipPlan), [dbPlans]);

  const totalSlides = plans.length;

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(((index % totalSlides) + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goNext = useCallback(() => goToSlide(currentIndex + 1), [goToSlide, currentIndex]);
  const goPrev = useCallback(() => goToSlide(currentIndex - 1), [goToSlide, currentIndex]);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(goNext, 4000);
    return () => clearInterval(interval);
  }, [goNext, totalSlides]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
  };

  const handleInvest = () => {
    if (!selectedPlan) return;
    const numAmount = Number(amount);
    const minAmount = selectedPlan.principal;
    if (!numAmount || numAmount < minAmount) {
      toast({ title: "Invalid amount", description: `Minimum for ${selectedPlan.name} is ${formatVipNaira(minAmount)}`, variant: "destructive" });
      return;
    }
    createInvestment.mutate({ data: { planId: selectedPlan.id, amount: numAmount } }, {
      onSuccess: () => {
        toast({ title: "Investment placed!", description: `You invested ${formatVipNaira(numAmount)} in ${selectedPlan.name}.` });
        queryClient.invalidateQueries({ queryKey: getListInvestmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setSelectedPlan(null);
        setAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Investment failed", description: err?.data?.message || err?.message, variant: "destructive" });
      },
    });
  };

  const handleSelectPlan = (plan: VipPlan) => {
    setSelectedPlan(plan);
    setAmount(String(plan.principal));
  };

  // Reset current index when plans change
  useEffect(() => {
    setCurrentIndex(0);
  }, [plans.length]);

  return (
    <AppLayout>
      <div style={{ padding: "20px 16px 40px" }}>

        {/* ── Header banner ─────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0d2044 50%, #0a1628 100%)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: 16, padding: "20px 18px", marginBottom: 20,
          textAlign: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{
              background: "linear-gradient(135deg, #1a5c2a, #22c55e)",
              borderRadius: 10, padding: "8px 16px", display: "inline-block",
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>10%</span>
              <span style={{ fontSize: 11, color: "#a7f3c0", display: "block", fontWeight: 700, letterSpacing: "0.05em" }}>EARNINGS PER DAY</span>
              <span style={{ fontSize: 9, color: "#86efac", letterSpacing: "0.08em" }}>CONSISTENT | SECURE | PROFITABLE</span>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 900, color: "#D4AF37", margin: 0, lineHeight: 1.1 }}>90-DAY PROFIT PLAN</p>
              <p style={{ fontSize: 11, color: "#9C9C9C", margin: "4px 0 0", letterSpacing: "0.05em" }}>GROW YOUR MONEY. SECURE YOUR FUTURE.</p>
            </div>
          </div>
        </div>

        {/* ── Balance ───────────────────────────────────────────── */}
        <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 16px" }}>
          Available Balance: <span style={{ color: "#D4AF37", fontWeight: 700 }}>{formatNaira(user?.balance ?? 0)}</span>
        </p>

        {/* ── Loading/Error/Empty States ───────────────────────── */}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D4AF37" }} />
          </div>
        )}

        {isError && (
          <div style={{
            background: "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            marginBottom: 16,
          }}>
            <p style={{ color: "#f87171", margin: 0 }}>Failed to load investment plans. Please try again.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              style={{ marginTop: 12 }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── VIP Plans Carousel ─────────────────────────────────── */}
        {!isLoading && !isError && plans.length > 0 && (
          <div style={{ marginBottom: 16 }} ref={containerRef}>
            {/* Carousel container */}
            <div
              style={{ overflow: "hidden", position: "relative" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                style={{
                  display: "flex",
                  transform: `translateX(calc(${currentIndex * -100}% - ${currentIndex * 32}px))`,
                  transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                  gap: 32,
                }}
              >
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      minWidth: "calc(100% - 32px)",
                      padding: "0 16px",
                      boxSizing: "border-box",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <VipPlanCard
                      plan={plan}
                      onInvest={handleSelectPlan}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation arrows */}
            {totalSlides > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                padding: "0 8px",
              }}>
                <button
                  onClick={goPrev}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "50%",
                    width: 40,
                    height: 40,
                    cursor: "pointer",
                    color: "#D4AF37",
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Dots */}
                <div style={{ display: "flex", gap: 8 }}>
                  {plans.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      style={{
                        width: index === currentIndex ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        background: index === currentIndex ? "#D4AF37" : "rgba(255,255,255,0.2)",
                        transition: "width 0.3s ease, background 0.3s ease",
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "50%",
                    width: 40,
                    height: 40,
                    cursor: "pointer",
                    color: "#D4AF37",
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            {/* Slide counter */}
            <p style={{
              textAlign: "center",
              fontSize: 12,
              color: "#9C9C9C",
              marginTop: 10,
            }}>
              {currentIndex + 1} / {totalSlides}
            </p>
          </div>
        )}

        {!isLoading && !isError && plans.length === 0 && (
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 24 }}>No investment plans available right now.</p>
        )}

        {/* ── Feature icons ────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24 }}>
          {[
            { icon: "🛡️", title: "100% SECURE",       desc: "Your investment is fully protected." },
            { icon: "📈", title: "CONSISTENT GROWTH", desc: "10% daily earnings for stable returns." },
            { icon: "💰", title: "COMPOUND POWER",    desc: "Earn daily and watch your wealth grow." },
            { icon: "🔓", title: "FLEXIBLE & EASY",   desc: "Simple, transparent platform." },
          ].map((f) => (
            <div key={f.title} style={{
              background: "rgba(13,32,68,0.5)", border: "1px solid rgba(212,175,55,0.15)",
              borderRadius: 10, padding: "12px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</div>
              <p style={{ fontSize: 9, fontWeight: 800, color: "#D4AF37", margin: "0 0 3px", letterSpacing: "0.06em" }}>{f.title}</p>
              <p style={{ fontSize: 10, color: "#9C9C9C", margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Invest dialog ────────────────────────────────────────── */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invest in {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (() => {
            const returns = calculateVipReturns(selectedPlan);
            return (
              <div style={{ marginBottom: 8 }}>
                {/* Plan summary */}
                <div style={{
                  background: "rgba(13,32,68,0.6)", border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 10, padding: "12px 14px", marginBottom: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#9C9C9C" }}>Daily profit (10%)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{formatVipNaira(returns.dailyProfit)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#9C9C9C" }}>Total profit (90 days)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{formatVipNaira(returns.profit90Days)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#9C9C9C" }}>Total return (principal + profit)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>{formatVipNaira(returns.totalReturn)}</span>
                  </div>
                </div>
                <label style={{ fontSize: 12, color: "#9C9C9C", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Amount (₦) — min {formatVipNaira(selectedPlan.principal)}
                </label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" />
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPlan(null)}>Cancel</Button>
            <Button onClick={handleInvest} disabled={createInvestment.isPending}>
              {createInvestment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Investment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

