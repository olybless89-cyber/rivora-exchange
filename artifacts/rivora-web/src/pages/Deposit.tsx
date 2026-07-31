import { useState, useEffect } from "react";
import { useGetMe, useCreateDepositRequest } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { CheckCircle2, Loader2, Building2, Copy, CheckCheck } from "lucide-react";

const API = import.meta.env.VITE_API_URL as string;
const MIN_DEPOSIT = 20_000;
const WELCOME_BONUS = 2_000;

async function getSetting(key: string): Promise<string> {
  const token = localStorage.getItem("rivora_token");
  const r = await fetch(`${API}/api/settings/${key}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return (await r.json()).value ?? "";
}

export default function DepositPage() {
  const { data: user } = useGetMe();
  const createDeposit = useCreateDepositRequest();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Platform payment details
  const [platformBankName, setPlatformBankName] = useState("");
  const [platformAccountNumber, setPlatformAccountNumber] = useState("");
  const [platformAccountName, setPlatformAccountName] = useState("");

  const isFirstDeposit = user && !user.hasReceivedWelcomeBonus;

  useEffect(() => {
    getSetting("platform_bank_name").then(setPlatformBankName);
    getSetting("platform_bank_account_number").then(setPlatformAccountNumber);
    getSetting("platform_bank_account_name").then(setPlatformAccountName);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

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

        {/* Platform Payment Details */}
        {(platformBankName || platformAccountNumber || platformAccountName) && (
          <Card style={{ padding: 16, marginBottom: 20, background: "rgba(13,32,68,0.5)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#D4AF37", margin: "0 0 12px" }}>💳 Transfer To:</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {platformBankName && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9C9C9C", margin: 0 }}>Bank</p>
                    <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 600 }}>{platformBankName}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(platformBankName, "bank")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9C9C", padding: 4 }}
                  >
                    {copied === "bank" ? <CheckCheck size={16} color="#22c55e" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
              {platformAccountNumber && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9C9C9C", margin: 0 }}>Account Number</p>
                    <p style={{ fontSize: 18, color: "#D4AF37", margin: "2px 0 0", fontWeight: 800, letterSpacing: "0.1em" }}>{platformAccountNumber}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(platformAccountNumber, "account")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9C9C", padding: 4 }}
                  >
                    {copied === "account" ? <CheckCheck size={16} color="#22c55e" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
              {platformAccountName && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9C9C9C", margin: 0 }}>Account Name</p>
                    <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 600 }}>{platformAccountName}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(platformAccountName, "name")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9C9C", padding: 4 }}
                  >
                    {copied === "name" ? <CheckCheck size={16} color="#22c55e" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
            </div>
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
