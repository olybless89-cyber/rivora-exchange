import { useState } from "react";
import { useGetMe, useListInvestmentPlans, useCreateInvestment, getListInvestmentsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function fmt(n: number) { return "₦ " + n.toLocaleString("en-NG"); }

export default function InvestPage() {
  const { data: user } = useGetMe();
  const { data: plans, isLoading } = useListInvestmentPlans({ activeOnly: true });
  const createInvestment = useCreateInvestment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [amount, setAmount] = useState("");

  const handleInvest = () => {
    if (!selectedPlan) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount < Number(selectedPlan.minAmount)) {
      toast({ title: "Invalid amount", description: `Minimum for ${selectedPlan.name} is ${formatNaira(selectedPlan.minAmount)}`, variant: "destructive" });
      return;
    }
    createInvestment.mutate({ data: { planId: selectedPlan.id, amount: numAmount } }, {
      onSuccess: () => {
        toast({ title: "Investment placed!", description: `You invested ${formatNaira(numAmount)} in ${selectedPlan.name}.` });
        queryClient.invalidateQueries({ queryKey: getListInvestmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setSelectedPlan(null); setAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Investment failed", description: err?.data?.message || err?.message, variant: "destructive" });
      },
    });
  };

  return (
    <AppLayout>
      <div style={{ padding: "20px 16px 40px" }}>
        {/* Header banner */}
        <div style={{ background:"linear-gradient(135deg,#0a1628 0%,#0d2044 50%,#0a1628 100%)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:16, padding:"20px 18px", marginBottom:20, textAlign:"center" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
            <div style={{ background:"linear-gradient(135deg,#1a5c2a,#22c55e)", borderRadius:10, padding:"8px 16px" }}>
              <span style={{ fontSize:22, fontWeight:900, color:"#fff" }}>5%</span>
              <span style={{ fontSize:11, color:"#a7f3c0", display:"block", fontWeight:700, letterSpacing:"0.05em" }}>EARNINGS PER DAY</span>
              <span style={{ fontSize:9, color:"#86efac", letterSpacing:"0.08em" }}>CONSISTENT | SECURE | PROFITABLE</span>
            </div>
            <div>
              <p style={{ fontSize:22, fontWeight:900, color:"#D4AF37", margin:0, lineHeight:1.1 }}>90-DAY PROFIT PLAN</p>
              <p style={{ fontSize:11, color:"#9C9C9C", margin:"4px 0 0", letterSpacing:"0.05em" }}>GROW YOUR MONEY. SECURE YOUR FUTURE.</p>
            </div>
          </div>
        </div>

        <p style={{ color:"#9C9C9C", fontSize:13, margin:"0 0 16px" }}>
          Available Balance: <span style={{ color:"#D4AF37", fontWeight:700 }}>{formatNaira(user?.balance ?? 0)}</span>
        </p>

        {isLoading && <p style={{ color:"#9C9C9C", textAlign:"center", padding:24 }}>Loading plans…</p>}

        {!isLoading && (plans ?? []).length > 0 && (<>
          {/* Column headers */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 80px", gap:2, marginBottom:4 }}>
            {[{label:"PLAN",sub:"LEVEL"},{label:"PRINCIPAL",sub:"AMOUNT (₦)"},{label:"DAILY",sub:"PROFIT (₦)"},{label:"90-DAY",sub:"TOTAL PROFIT (₦)"},{label:"",sub:""}].map((h,i) => (
              <div key={i} style={{ background:i<2?"#0d2044":i<4?"#1a4a1a":"transparent", borderRadius:6, padding:"6px 8px", textAlign:"center", border:i<4?"1px solid rgba(212,175,55,0.2)":"none" }}>
                <p style={{ fontSize:9, fontWeight:800, color:"#D4AF37", margin:0, letterSpacing:"0.06em" }}>{h.label}</p>
                <p style={{ fontSize:8, color:"#9C9C9C", margin:0 }}>{h.sub}</p>
              </div>
            ))}
          </div>

          {/* Plan rows */}
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {(plans ?? []).map((plan, idx) => {
              const principal = Number(plan.minAmount);
              const dailyProfit = (principal * Number(plan.dailyRate)) / 100;
              const totalProfit = dailyProfit * plan.durationDays;
              return (
                <div key={plan.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 80px", gap:2, alignItems:"center", background:idx%2===0?"rgba(13,32,68,0.6)":"rgba(8,20,45,0.6)", borderRadius:8, padding:"10px 6px", border:"1px solid rgba(212,175,55,0.1)" }}>
                  <div style={{ textAlign:"center" }}><span style={{ fontSize:13, fontWeight:800, color:"#60a5fa" }}>{plan.name}</span></div>
                  <div style={{ textAlign:"center" }}><span style={{ fontSize:12, fontWeight:700, color:"#e8eaec" }}>{fmt(principal)}</span></div>
                  <div style={{ textAlign:"center" }}><span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>{fmt(dailyProfit)}</span></div>
                  <div style={{ textAlign:"center" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>{fmt(totalProfit)}</span>
                    <p style={{ fontSize:9, color:"#9C9C9C", margin:"2px 0 0" }}>Return: {fmt(principal + totalProfit)}</p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <button onClick={() => { setSelectedPlan(plan); setAmount(String(plan.minAmount)); }} style={{ background:"linear-gradient(135deg,#D4AF37,#A6821F)", border:"none", borderRadius:8, color:"#0A0A0A", fontSize:11, fontWeight:800, padding:"8px 10px", cursor:"pointer", width:"100%" }}>INVEST</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ROI badge */}
          <div style={{ marginTop:16, textAlign:"center", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:10, padding:"10px 16px" }}>
            <span style={{ fontSize:18, fontWeight:900, color:"#D4AF37" }}>450% ROI</span>
            <span style={{ fontSize:12, color:"#9C9C9C", marginLeft:8 }}>after 90 days on all plans</span>
          </div>

          {/* Feature icons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
            {[{icon:"🛡️",title:"100% SECURE",desc:"Your investment is fully protected."},{icon:"📈",title:"CONSISTENT GROWTH",desc:"5% daily for stable returns."},{icon:"💰",title:"COMPOUND POWER",desc:"Earn daily and watch wealth grow."},{icon:"🔓",title:"FLEXIBLE & EASY",desc:"Simple, transparent platform."}].map(f => (
              <div key={f.title} style={{ background:"rgba(13,32,68,0.5)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{f.icon}</div>
                <p style={{ fontSize:9, fontWeight:800, color:"#D4AF37", margin:"0 0 3px", letterSpacing:"0.06em" }}>{f.title}</p>
                <p style={{ fontSize:10, color:"#9C9C9C", margin:0, lineHeight:1.4 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </>)}

        {!isLoading && (plans ?? []).length === 0 && <p style={{ color:"#9C9C9C", textAlign:"center", padding:24 }}>No investment plans available right now.</p>}
      </div>

      {/* Invest dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invest in {selectedPlan?.name}</DialogTitle></DialogHeader>
          {selectedPlan && (() => {
            const p = Number(selectedPlan.minAmount);
            const daily = (p * Number(selectedPlan.dailyRate)) / 100;
            const total = daily * selectedPlan.durationDays;
            return (
              <div style={{ marginBottom:8 }}>
                <div style={{ background:"rgba(13,32,68,0.6)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:12, color:"#9C9C9C" }}>Daily profit (5%)</span><span style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>{fmt(daily)}</span></div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:12, color:"#9C9C9C" }}>Total profit (90 days)</span><span style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>{fmt(total)}</span></div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:12, color:"#9C9C9C" }}>Total return</span><span style={{ fontSize:13, fontWeight:700, color:"#D4AF37" }}>{fmt(p + total)}</span></div>
                </div>
                <label style={{ fontSize:12, color:"#9C9C9C", textTransform:"uppercase", letterSpacing:"0.05em" }}>Amount (₦) — min {fmt(p)}</label>
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
