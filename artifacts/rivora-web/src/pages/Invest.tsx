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
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>Investment Plans</h1>
        <p style={{ color: "#8b95a1", fontSize: 13, margin: "0 0 20px" }}>Balance: {formatNaira(user?.balance ?? 0)}</p>

        {isLoading && <p style={{ color: "#8b95a1" }}>Loading plans…</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(plans ?? []).map((plan) => (
            <Card key={plan.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#fff" }}>{plan.name}</p>
                  <p style={{ fontSize: 12, color: "#8b95a1", margin: "6px 0 0" }}>Min investment: {formatNaira(plan.minAmount)}</p>
                  <p style={{ fontSize: 12, color: "#8b95a1", margin: "2px 0 0" }}>Duration: {plan.durationDays} days</p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#00A300", margin: 0 }}>{Number(plan.dailyRate)}%<span style={{ fontSize: 11, fontWeight: 400, color: "#8b95a1" }}>/day</span></p>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => { setSelectedPlan(plan); setAmount(String(plan.minAmount)); }}
              >
                Invest Now
              </Button>
            </Card>
          ))}
          {!isLoading && (plans ?? []).length === 0 && (
            <p style={{ color: "#8b95a1", textAlign: "center", padding: 24 }}>No investment plans available right now.</p>
          )}
        </div>
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invest in {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "#8b95a1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount (₦)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />
            {selectedPlan && (
              <p style={{ fontSize: 12, color: "#8b95a1", marginTop: 8 }}>
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
