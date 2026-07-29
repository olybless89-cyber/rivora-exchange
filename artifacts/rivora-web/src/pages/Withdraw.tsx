import { useState } from "react";
import { useGetMe, useCreateWithdrawalRequest } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { isWithinWithdrawalWindow } from "@/lib/withdrawal-window";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const MIN_WITHDRAWAL = 10_000;
const FEE_RATE = 0.2;

export default function WithdrawPage() {
  const { data: user } = useGetMe();
  const createWithdrawal = useCreateWithdrawalRequest();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitted, setSubmitted] = useState<{ net: number } | null>(null);

  const withinWindow = isWithinWithdrawalWindow();
  const numAmount = Number(amount) || 0;
  const fee = numAmount * FEE_RATE;
  const netAmount = numAmount - fee;

  const handleSubmit = () => {
    if (!withinWindow) {
      toast({ title: "Outside withdrawal hours", description: "Withdrawals are only available 7:00 PM - 11:00 PM (Nigeria time), Monday to Saturday.", variant: "destructive" });
      return;
    }
    if (!numAmount || numAmount < MIN_WITHDRAWAL) {
      toast({ title: "Invalid amount", description: `Minimum withdrawal is ${formatNaira(MIN_WITHDRAWAL)}`, variant: "destructive" });
      return;
    }
    if (!bankName || !accountNumber || !accountName) {
      toast({ title: "Missing bank details", description: "Please fill in all bank account fields.", variant: "destructive" });
      return;
    }

    createWithdrawal.mutate(
      { data: { amount: numAmount, bankName, bankAccountNumber: accountNumber, bankAccountName: accountName } },
      {
        onSuccess: () => setSubmitted({ net: netAmount }),
        onError: (err: any) => {
          toast({ title: "Withdrawal failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  if (submitted) {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <CheckCircle2 size={56} color="#D4AF37" style={{ marginBottom: 16 }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>Withdrawal Requested</h1>
          <p style={{ color: "#9C9C9C", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            You'll receive {formatNaira(submitted.net)} (after the 20% fee) once our team approves this request.
          </p>
          <Button onClick={() => { setSubmitted(null); setAmount(""); setBankName(""); setAccountNumber(""); setAccountName(""); }} className="w-full">
            Make Another Request
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Withdraw</h1>
        <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 20px" }}>Balance: {formatNaira(user?.balance ?? 0)}</p>

        {!withinWindow && (
          <Card style={{ padding: 14, marginBottom: 20, background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.3)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} color="#C0392B" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#e8eaec", margin: 0, lineHeight: 1.6 }}>
              Withdrawals are only available <strong>7:00 PM – 11:00 PM (Nigeria time), Monday to Saturday</strong>.
              You can still fill this form, but submission will be blocked until the next window.
            </p>
          </Card>
        )}

        <div style={{ marginBottom: 16 }}>
          <Label>Amount (₦)</Label>
          <Input type="number" placeholder={`Minimum ${formatNaira(MIN_WITHDRAWAL)}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" />
        </div>

        {numAmount > 0 && (
          <Card style={{ padding: 14, marginBottom: 20 }}>
            <Row label="Withdrawal amount" value={formatNaira(numAmount)} />
            <Row label="Fee (20%)" value={`-${formatNaira(fee)}`} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
            <Row label="You'll receive" value={formatNaira(netAmount)} bold />
          </Card>
        )}

        <div style={{ marginBottom: 12 }}>
          <Label>Bank Name</Label>
          <Input placeholder="e.g. GTBank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-2" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Account Number</Label>
          <Input placeholder="0123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-2" />
        </div>
        <div style={{ marginBottom: 24 }}>
          <Label>Account Name</Label>
          <Input placeholder="As it appears on your account" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="mt-2" />
        </div>

        <Button onClick={handleSubmit} disabled={createWithdrawal.isPending} className="w-full">
          {createWithdrawal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Withdrawal Request"}
        </Button>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ fontSize: 12, color: "#9C9C9C" }}>{label}</span>
      <span style={{ fontSize: bold ? 15 : 12, fontWeight: bold ? 700 : 400, color: bold ? "#D4AF37" : "#e8eaec" }}>{value}</span>
    </div>
  );
}
