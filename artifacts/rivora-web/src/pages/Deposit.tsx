import { useState } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Landmark,
  ExternalLink,
  Copy,
  CheckCheck,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL as string;
const MIN_DEPOSIT = 20_000;
const WELCOME_BONUS = 2_000;

async function initiatePayment(
  amount: number,
  token: string,
): Promise<{ paymentLink: string; txRef: string; depositRequestId: string }> {
  const r = await fetch(`${API}/api/flutterwave/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, currency: "NGN", redirectUrl: `${window.location.origin}/payment-callback` }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || "Could not generate payment link");
  }
  return r.json();
}

async function verifyPayment(txRef: string, token: string): Promise<{ status: string }> {
  const r = await fetch(`${API}/api/flutterwave/verify/${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || "Verification failed");
  }
  return r.json();
}

type DepositStage = "form" | "awaiting" | "confirming" | "success" | "failed";

export default function DepositPage() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DepositStage>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isFirstDeposit = user && !user.hasReceivedWelcomeBonus;
  const token = localStorage.getItem("rivora_token") ?? "";

  const handleGenerateLink = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_DEPOSIT) {
      toast({ title: "Invalid amount", description: `Minimum deposit is ${formatNaira(MIN_DEPOSIT)}`, variant: "destructive" });
      return;
    }
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await initiatePayment(numAmount, token);
      setPaymentLink(result.paymentLink);
      setTxRef(result.txRef);
      setStage("awaiting");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not generate payment link", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!txRef) return;
    setStage("confirming");
    try {
      const result = await verifyPayment(txRef, token);
      if (result.status === "approved") {
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setStage("success");
      } else {
        setStage("failed");
      }
    } catch {
      setStage("failed");
    }
  };

  const copyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setAmount(""); setStage("form"); setIsLoading(false);
    setPaymentLink(null); setTxRef(null); setCopied(false);
  };

  // ── Confirming ──────────────────────────────────────────────
  if (stage === "confirming") {
    return (
      <AppLayout>
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <Loader2 size={56} color="#D4AF37" style={{ margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#D4AF37", margin: "0 0 8px" }}>
            Confirming Payment…
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14 }}>Please wait while we verify your transfer.</p>
        </div>
      </AppLayout>
    );
  }

  // ── Success ──────────────────────────────────────────────────
  if (stage === "success") {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <CheckCircle2 size={64} color="#22c55e" style={{ marginBottom: 16 }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#22c55e", margin: "0 0 12px" }}>
            Payment Confirmed!
          </h1>
          <p style={{ color: "#e8eaec", fontSize: 15, marginBottom: 8 }}>Your balance has been credited successfully.</p>
          {isFirstDeposit && (
            <p style={{ color: "#D4AF37", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              🎁 Welcome bonus of {formatNaira(WELCOME_BONUS)} has been added!
            </p>
          )}
          <Button onClick={handleReset} style={{ background: "#22c55e", color: "#fff", fontWeight: 700, marginTop: 8 }}>
            Make Another Deposit
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ── Failed ───────────────────────────────────────────────────
  if (stage === "failed") {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <AlertCircle size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#ef4444", margin: "0 0 12px" }}>
            Payment Not Found
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14, marginBottom: 24 }}>
            We could not confirm your transfer yet. If you already paid, contact support with your reference.
          </p>
          {txRef && <p style={{ fontSize: 12, color: "#9C9C9C", marginBottom: 24 }}>Ref: <span style={{ color: "#D4AF37" }}>{txRef}</span></p>}
          <Button onClick={handleReset} style={{ background: "#D4AF37", color: "#000", fontWeight: 700 }}>Try Again</Button>
        </div>
      </AppLayout>
    );
  }

  // ── Awaiting transfer ────────────────────────────────────────
  if (stage === "awaiting" && paymentLink) {
    return (
      <AppLayout>
        <div style={{ padding: "24px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>
            Complete Your Deposit
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 24px" }}>
            Amount: <span style={{ color: "#D4AF37", fontWeight: 600 }}>{formatNaira(Number(amount))}</span>
          </p>

          {/* Step 1 */}
          <Card style={{ padding: 20, marginBottom: 14, border: "1px solid rgba(212,175,55,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>1</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Open your payment page</p>
            </div>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: "0 0 14px", lineHeight: 1.6 }}>
              Tap below to open your secure payment page and follow the bank transfer instructions shown.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={() => window.open(paymentLink, "_blank")} className="flex-1"
                style={{ background: "#D4AF37", color: "#000", fontWeight: 700, fontSize: 14 }}>
                <ExternalLink size={16} style={{ marginRight: 8 }} />Open Payment Page
              </Button>
              <Button onClick={copyLink}
                style={{ background: copied ? "#22c55e" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: copied ? "#fff" : "#e8eaec", padding: "0 14px" }}>
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </Card>

          {/* Step 2 */}
          <Card style={{ padding: 20, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>2</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Complete the bank transfer</p>
            </div>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: 0, lineHeight: 1.6 }}>
              Transfer exactly <span style={{ color: "#D4AF37", fontWeight: 600 }}>{formatNaira(Number(amount))}</span> to the account number shown on the payment page.
            </p>
          </Card>

          {/* Step 3 */}
          <Card style={{ padding: 20, marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>3</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Confirm after paying</p>
            </div>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: "0 0 14px", lineHeight: 1.6 }}>
              Once your transfer is complete, tap below to credit your balance instantly.
            </p>
            <Button onClick={handleConfirmPayment} className="w-full"
              style={{ background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 0" }}>
              <CheckCircle2 size={16} style={{ marginRight: 8 }} />I Have Paid — Confirm Now
            </Button>
          </Card>

          <p style={{ fontSize: 11, color: "#555", textAlign: "center", lineHeight: 1.6 }}>
            🔒 Processed securely by Rivora Exchange. Ref: <span style={{ color: "#9C9C9C" }}>{txRef}</span>
          </p>
        </div>
      </AppLayout>
    );
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 20px" }}>
          Deposit
        </h1>

        {isFirstDeposit && (
          <Card style={{ padding: 14, marginBottom: 20, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <p style={{ fontSize: 13, color: "#D4AF37", margin: 0, fontWeight: 600 }}>
              🎁 Get a {formatNaira(WELCOME_BONUS)} welcome bonus on your first deposit!
            </p>
          </Card>
        )}

        {/* Accepted Payment Method */}
        <Card style={{ padding: 16, marginBottom: 20, background: "rgba(13,32,68,0.4)", border: "1px solid rgba(212,175,55,0.2)" }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Accepted Payment Method
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "10px 14px", width: "fit-content" }}>
            <Landmark size={16} color="#D4AF37" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#D4AF37" }}>Bank Transfer</span>
          </div>
        </Card>

        <Card style={{ padding: 20, marginBottom: 20, background: "rgba(0,0,0,0.2)" }}>
          <div style={{ marginBottom: 24 }}>
            <Label style={{ fontSize: 13, color: "#9C9C9C" }}>Amount (NGN)</Label>
            <Input
              type="number"
              placeholder={`Minimum ${formatNaira(MIN_DEPOSIT)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ marginTop: 8, fontSize: 16 }}
            />
            <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 6 }}>Minimum deposit: {formatNaira(MIN_DEPOSIT)}</p>
          </div>

          <Button
            onClick={handleGenerateLink}
            disabled={isLoading || !amount}
            className="w-full"
            style={{ background: isLoading ? "rgba(212,175,55,0.5)" : "#D4AF37", color: "#000", fontWeight: 700, fontSize: 15, padding: "14px 0" }}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating Payment Link…</>
            ) : (
              <><Landmark className="h-4 w-4 mr-2" />Generate Payment Link</>
            )}
          </Button>
        </Card>

        <Card style={{ padding: 14, background: "rgba(13,32,68,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0, lineHeight: 1.7 }}>
            🔒 Your payment is processed securely by <span style={{ color: "#D4AF37" }}>Rivora Exchange</span>. Bank details are never stored on our servers. Funds are credited upon confirmation.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
