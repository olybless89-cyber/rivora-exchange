import { useState } from "react";
import { useGetMe, useCreateDepositRequest } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";

const MIN_DEPOSIT = 10_000;
const WELCOME_BONUS = 2_000;

export default function DepositPage() {
  const { data: user } = useGetMe();
  const createDeposit = useCreateDepositRequest();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [submitted, setSubmitted] = useState(false);

  const isFirstDeposit = user && !user.hasReceivedWelcomeBonus;

  const handleSubmit = () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_DEPOSIT) {
      toast({ title: "Invalid amount", description: `Minimum deposit is ${formatNaira(MIN_DEPOSIT)}`, variant: "destructive" });
      return;
    }

    createDeposit.mutate(
      { data: { amount: numAmount, paymentMethod: method } },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err: any) => {
          toast({ title: "Deposit failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  if (submitted) {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <CheckCircle2 size={56} color="#D4AF37" style={{ marginBottom: 16 }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>Deposit Submitted</h1>
          <p style={{ color: "#9C9C9C", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            Your deposit of {formatNaira(amount)} via {method} is pending approval. Your balance
            will update once our team confirms it{isFirstDeposit ? `, along with your ${formatNaira(WELCOME_BONUS)} welcome bonus` : ""}.
          </p>
          <Button onClick={() => { setSubmitted(false); setAmount(""); }} className="w-full">Make Another Deposit</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 20px" }}>Deposit</h1>

        {isFirstDeposit && (
          <Card style={{ padding: 16, marginBottom: 20, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <p style={{ fontSize: 13, color: "#D4AF37", margin: 0, fontWeight: 600 }}>
              🎁 Get a {formatNaira(WELCOME_BONUS)} welcome bonus on your first deposit!
            </p>
          </Card>
        )}

        <div style={{ marginBottom: 20 }}>
          <Label>Amount (₦)</Label>
          <Input
            type="number"
            placeholder={`Minimum ${formatNaira(MIN_DEPOSIT)}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2"
          />
          <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 6 }}>Minimum deposit: {formatNaira(MIN_DEPOSIT)}</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Label>Payment Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card style={{ padding: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0, lineHeight: 1.6 }}>
            Submit your deposit request below, then contact support with your payment reference for
            confirmation. Your balance updates automatically once approved.
          </p>
        </Card>

        <Button onClick={handleSubmit} disabled={createDeposit.isPending} className="w-full">
          {createDeposit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Deposit Request"}
        </Button>
      </div>
    </AppLayout>
  );
}
