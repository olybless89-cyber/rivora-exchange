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

const PLAN_TABLE = [
  { name:"RIVO-LV1",  principal:  20000, daily:  1000, p30:    30000, p90:    90000, total:    110000 },
  { name:"RIVO-LV2",  principal:  50000, daily:  2500, p30:    75000, p90:   225000, total:    275000 },
  { name:"RIVO-LV3",  principal:  80000, daily:  4000, p30:   120000, p90:   360000, total:    440000 },
  { name:"RIVO-LV4",  principal: 120000, daily:  6000, p30:   180000, p90:   540000, total:    660000 },
  { name:"RIVO-LV5",  principal: 150000, daily:  7500, p30:   225000, p90:   675000, total:    825000 },
  { name:"RIVO-LV6",  principal: 180000, daily:  9000, p30:   270000, p90:   810000, total:    990000 },
  { name:"RIVO-LV7",  principal: 220000, daily: 11000, p30:   330000, p90:   990000, total:  1210000 },
  { name:"RIVO-LV8",  principal: 250000, daily: 12500, p30:   375000, p90: 1125000, total:  1375000 },
  { name:"RIVO-LV9",  principal: 500000, daily: 25000, p30:   750000, p90: 2250000, total:  2750000 },
  { name:"RIVO-LV10", principal: 890000, daily: 44500, p30: 1335000, p90: 4005000, total:  4895000 },
];

function N(n) { return "₦" + n.toLocaleString("en-NG"); }

export default function InvestPage() {
  const { data: user } = useGetMe();
  const { data: plans } = useListInvestmentPlans({ activeOnly: true });
  const createInvestment = useCreateInvestment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRow, setSelectedRow] = useState(null);
  const [amount, setAmount] = useState("");

  const getPlanId = (name) => plans?.find((p) => p.name === name)?.id;

  const handleInvest = () => {
    if (!selectedRow) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount < selectedRow.principal) {
      toast({ title: "Invalid amount", description: `Minimum is ${N(selectedRow.principal)}`, variant: "destructive" });
      return;
    }
    const planId = getPlanId(selectedRow.name);
    if (!planId) { toast({ title: "Plan not available", variant: "destructive" }); return; }
    createInvestment.mutate({ data: { planId, amount: numAmount } }, {
      onSuccess: () => {
        toast({ title: "Investment placed!", description: `${N(numAmount)} invested in ${selectedRow.name}.` });
        queryClient.invalidateQueries({ queryKey: getListInvestmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setSelectedRow(null); setAmount("");
      },
      onError: (err) => {
        toast({ title: "Investment failed", description: err?.data?.message || err?.message, variant: "destructive" });
      },
    });
  };

  const cell = { padding: "10px 6px", textAlign: "center", fontSize: 12 };
  const hdr  = { padding: "8px 6px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: "0.05em" };

  return (
    <AppLayout>
      <div style={{ padding: "20px 14px 48px" }}>
        <div style={{ background:"linear-gradient(135deg,#030d1f,#0d2044,#030d1f)", border:"1px solid rgba(212,175,55,0.35)", borderRadius:16, padding:"22px 16px 18px", marginBottom:20, textAlign:"center" }}>
          <p style={{ fontSize:12, fontWeight:800, color:"#9C9C9C", letterSpacing:"0.12em", margin:"0 0 4px", textTransform:"uppercase" }}>RIVORA EXCHANGE</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexWrap:"wrap", margin:"6px 0" }}>
            <div style={{ background:"linear-gradient(135deg,#1a5c2a,#22c55e)", borderRadius:10, padding:"6px 14px" }}>
              <span style={{ fontSize:24, fontWeight:900, color:"#fff" }}>5%</span>
              <p style={{ fontSize:9, color:"#a7f3c0", margin:"2px 0 0", fontWeight:700, letterSpacing:"0.08em" }}>DAILY EARNINGS</p>
            </div>
            <div>
              <p style={{ fontSize:20, fontWeight:900, color:"#D4AF37", margin:0, lineHeight:1.1 }}>90-DAY PROFIT PLAN</p>
              <p style={{ fontSize:10, color:"#9C9C9C", margin:"3px 0 0" }}>Trade Smart. Earn More.</p>
            </div>
          </div>
          <p style={{ fontSize:11, color:"#8a99a8", margin:"8px 0 0" }}>Balance: <span style={{ color:"#D4AF37", fontWeight:700 }}>{formatNaira(user?.balance ?? 0)}</span></p>
        </div>

        <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid rgba(212,175,55,0.2)", marginBottom:20 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
            <thead>
              <tr>
                <th style={{ ...hdr, color:"#D4AF37", background:"#0d2044", borderBottom:"1px solid rgba(212,175,55,0.25)" }}>PLAN LEVEL</th>
                <th style={{ ...hdr, color:"#D4AF37", background:"#0d2044", borderBottom:"1px solid rgba(212,175,55,0.25)" }}>PRINCIPAL (₦)</th>
                <th style={{ ...hdr, color:"#22c55e", background:"#0d2d0d", borderBottom:"1px solid rgba(212,175,55,0.25)" }}>DAILY (5%)</th>
                <th style={{ ...hdr, color:"#22c55e", background:"#0d2d0d", borderBottom:"1px solid rgba(212,175,55,0.25)" }}>30-DAY PROFIT</th>
                <th style={{ ...hdr, color:"#22c55e", background:"#0d2d0d", borderBottom:"1px solid rgba(212,175,55,0.25)" }}>90-DAY PROFIT</th>
                <th style={{ ...hdr, color:"#D4AF37", background:"#1a1400", borderBottom:"1px solid rgba(212,175,55,0.25)" }}>TOTAL RETURN</th>
                <th style={{ ...hdr, color:"#D4AF37", background:"#0d2044", borderBottom:"1px solid rgba(212,175,55,0.25)" }}></th>
              </tr>
            </thead>
            <tbody>
              {PLAN_TABLE.map((row, idx) => (
                <tr key={row.name} style={{ background: idx%2===0 ? "rgba(13,32,68,0.55)" : "rgba(5,12,30,0.7)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ ...cell, color:"#60a5fa", fontWeight:800 }}>{row.name}</td>
                  <td style={{ ...cell, color:"#e8eaec", fontWeight:700 }}>{N(row.principal)}</td>
                  <td style={{ ...cell, color:"#22c55e", fontWeight:700 }}>{N(row.daily)}</td>
                  <td style={{ ...cell, color:"#22c55e", fontWeight:700 }}>{N(row.p30)}</td>
                  <td style={{ ...cell, color:"#22c55e", fontWeight:700 }}>{N(row.p90)}</td>
                  <td style={{ ...cell, color:"#D4AF37", fontWeight:800 }}>{N(row.total)}</td>
                  <td style={{ ...cell }}>
                    <button onClick={() => { setSelectedRow(row); setAmount(String(row.principal)); }}
                      style={{ background:"linear-gradient(135deg,#D4AF37,#A6821F)", border:"none", borderRadius:7, color:"#0A0A0A", fontSize:10, fontWeight:900, padding:"7px 10px", cursor:"pointer", whiteSpace:"nowrap" }}>INVEST</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign:"center", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:10, padding:"10px 16px", marginBottom:20 }}>
          <span style={{ fontSize:18, fontWeight:900, color:"#D4AF37" }}>450% ROI</span>
          <span style={{ fontSize:12, color:"#9C9C9C", marginLeft:8 }}>after 90 days on all plans</span>
        </div>

        <div style={{ background:"linear-gradient(135deg,#030d1f,#0d2044)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:14, padding:"18px 16px", marginBottom:20 }}>
          <p style={{ fontSize:14, fontWeight:800, color:"#D4AF37", margin:"0 0 14px", textAlign:"center" }}>Why Choose Rivora Exchange?</p>
          {[{icon:"🛡️",text:"Secure Trading Platform"},{icon:"📈",text:"Daily 5% Earnings"},{icon:"⚡",text:"Fast Withdrawals"},{icon:"🎧",text:"24/7 Customer Support"},{icon:"📊",text:"Transparent Investment Plans"}].map(f => (
            <div key={f.text} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:20 }}>{f.icon}</span>
              <span style={{ fontSize:13, color:"#e8eaec", fontWeight:500 }}>{f.text}</span>
              <span style={{ marginLeft:"auto", color:"#22c55e", fontSize:16 }}>✓</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign:"center", padding:"8px 0" }}>
          <p style={{ fontSize:13, fontWeight:800, color:"#D4AF37", margin:0, letterSpacing:"0.08em" }}>RIVORA EXCHANGE</p>
          <p style={{ fontSize:11, color:"#9C9C9C", margin:"3px 0 0" }}>Trade Smart. Earn More.</p>
        </div>
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invest in {selectedRow?.name}</DialogTitle></DialogHeader>
          {selectedRow && (
            <div style={{ marginBottom:8 }}>
              <div style={{ background:"rgba(13,32,68,0.7)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, padding:"14px", marginBottom:16 }}>
                {[["Daily profit (5%)", N(selectedRow.daily), "green"],["30-day profit", N(selectedRow.p30), "green"],["90-day total profit", N(selectedRow.p90), "green"],["Total return", N(selectedRow.total), "gold"]].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize:12, color:"#9C9C9C" }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color: c==="gold"?"#D4AF37":"#22c55e" }}>{v}</span>
                  </div>
                ))}
              </div>
              <label style={{ fontSize:12, color:"#9C9C9C", textTransform:"uppercase" }}>Amount (₦) — minimum {N(selectedRow.principal)}</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRow(null)}>Cancel</Button>
            <Button onClick={handleInvest} disabled={createInvestment.isPending}>
              {createInvestment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Investment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
