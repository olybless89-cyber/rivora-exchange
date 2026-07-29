import { useState } from "react";
import { useGetMe, useListInvestmentPlans, useCreateInvestment, getListInvestmentsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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

    createInvestment.mutate(
      { data: { planId: selectedPlan.id, amount: numAmount } },
      {
        onSuccess: () => {
          toast({ title: "Investment placed", description: `You invested ${formatNaira(numAmount)} in ${selectedPlan.name}.` });
          queryClient.invalidateQueries({ queryKey: getListInvestmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setSelectedPlan(null);
          setAmount("");
        },
        onError: (err: any) => {
          toast({ title: "Investment failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>Investment Plans</h1>
        <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 20px" }}>Balance: {formatNaira(user?.balance ?? 0)}</p>

        {isLoading && <p style={{ color: "#9C9C9C" }}>Loading plans…</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(plans ?? []).map((plan) => {
            const dailyIncome = (Number(plan.minAmount) * Number(plan.dailyRate)) / 100;
            const totalIncome = dailyIncome * plan.durationDays;
            return (
              <Card key={plan.id} style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#D4AF37", fontStyle: "italic" }}>{plan.name}</p>
                    <p style={{ fontSize: 13, color: "#e8eaec", margin: "6px 0 0" }}>
                      Deposit: <span style={{ color: "#e8eaec", fontWeight: 600 }}>{formatNaira(plan.minAmount)}</span>
                    </p>
                    <p style={{ fontSize: 13, color: "#9C9C9C", margin: "2px 0 0" }}>Duration: {plan.durationDays} days</p>
                    <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#D4AF37", margin: 0 }}>{formatNaira(dailyIncome)}</p>
                        <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>Daily income</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#D4AF37", margin: 0 }}>{formatNaira(totalIncome)}</p>
                        <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>Total income</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    style={{ marginLeft: 12, alignSelf: "center", background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, padding: "10px 20px" }}
                    onClick={() => { setSelectedPlan(plan); setAmount(String(plan.minAmount)); }}
                  >
                    Invest
                  </Button>
                </div>
              </Card>
            );
          })}
          {!isLoading && (plans ?? []).length === 0 && (
            <p style={{ color: "#9C9C9C", textAlign: "center", padding: 24 }}>No investment plans available right now.</p>
          )}
        </div>
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invest in {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "#9C9C9C", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount (₦)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />
            {selectedPlan && (
              <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 8 }}>
                Minimum: {formatNaira(selectedPlan.minAmount)} · Daily return: {Number(selectedPlan.dailyRate)}% · {selectedPlan.durationDays} days
              </p>
            )}
          </div>
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
