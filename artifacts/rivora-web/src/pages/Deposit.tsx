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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const MIN_DEPOSIT = 20_000;
const WELCOME_BONUS = 2_000;

type DepositStage = "form" | "awaiting" | "confirming" | "success" | "failed";

async function initiatePayment(
  amount: number,
  currency: string,
  token: string,
): Promise<{ payment_link: string; tx_ref: string; deposit_request_id: string }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/flutterwave-initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, currency }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || "Failed to generate payment link");
  }
  return r.json();
}

async function confirmPayment(txRef: string, token: string): Promise<{ status: string }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/flutterwave-verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ tx_ref: txRef }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || "Verification failed");
  }
  return r.json();
}

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
      toast({
        title: "Invalid amount",
        description: `Minimum deposit is ${formatNaira(MIN_DEPOSIT)}`,
        variant: "destructive",
      });
      return;
    }
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await initiatePayment(numAmount, "NGN", token);
      setPaymentLink(result.payment_link);
      setTxRef(result.tx_ref);
      setStage("awaiting");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not generate payment link";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!txRef) return;
    setStage("confirming");
    try {
      const result = await confirmPayment(txRef, token);
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
    setAmount("");
    setStage("form");
    setIsLoading(false);
    setPaymentLink(null);
    setTxRef(null);
    setCopied(false);
  };

  // ── Confirming ──────────────────────────────────────────────
  if (stage === "confirming") {
    return (
      <AppLayout>
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <Loader2 size={56} color="#D4AF37"
            style={{ margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20,
            fontWeight: 600, color: "#D4AF37", margin: "0 0 8px" }}>
            Confirming Payment…
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14 }}>
            Please wait while we verify your transfer.
          </p>
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
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22,
            fontWeight: 600, color: "#22c55e", margin: "0 0 12px" }}>
            Payment Confirmed!
          </h1>
          <p style={{ color: "#e8eaec", fontSize: 15, marginBottom: 8 }}>
            Your balance has been credited successfully.
          </p>
          {isFirstDeposit && (
            <p style={{ color: "#D4AF37", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              🎁 Welcome bonus of {formatNaira(WELCOME_BONUS)} has been added!
            </p>
          )}
          <Button onClick={handleReset}
            style={{ background: "#22c55e", color: "#fff", fontWeight: 700, marginTop: 8 }}>
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
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22,
            fontWeight: 600, color: "#ef4444", margin: "0 0 12px" }}>
            Payment Not Found
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14, marginBottom: 24 }}>
            We could not confirm your transfer. If you have already paid, contact support with your reference.
          </p>
          {txRef && (
            <p style={{ fontSize: 12, color: "#9C9C9C", marginBottom: 24 }}>
              Ref: <span style={{ color: "#D4AF37" }}>{txRef}</span>
            </p>
          )}
          <Button onClick={handleReset}
            style={{ background: "#D4AF37", color: "#000", fontWeight: 700 }}>
            Try Again
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ── Awaiting transfer ────────────────────────────────────────
  if (stage === "awaiting" && paymentLink) {
    return (
      <AppLayout>
        <div style={{ padding: "24px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20,
            fontWeight: 600, margin: "0 0 6px" }}>
            Complete Your Deposit
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 13, margin: "0 0 24px" }}>
            Amount: <span style={{ color: "#D4AF37", fontWeight: 600 }}>{formatNaira(Number(amount))}</span>
          </p>

          {/* Step 1 */}
          <Card style={{ padding: 20, marginBottom: 16, border: "1px solid rgba(212,175,55,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#D4AF37",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>1</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                Open your payment link
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: "0 0 14px", lineHeight: 1.6 }}>
              Tap the button below to open your secure payment page. Complete the bank transfer as instructed.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                onClick={() => window.open(paymentLink, "_blank")}
                className="flex-1"
                style={{ background: "#D4AF37", color: "#000", fontWeight: 700, fontSize: 14 }}>
                <ExternalLink size={16} style={{ marginRight: 8 }} />
                Open Payment Page
              </Button>
              <Button
                onClick={copyLink}
                style={{ background: copied ? "#22c55e" : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)", color: copied ? "#fff" : "#e8eaec",
                  fontWeight: 600, padding: "0 14px" }}>
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </Card>

          {/* Step 2 */}
          <Card style={{ padding: 20, marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>2</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                Complete the bank transfer
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: 0, lineHeight: 1.6 }}>
              Follow the instructions on the payment page and transfer exactly <span style={{ color: "#D4AF37", fontWeight: 600 }}>{formatNaira(Number(amount))}</span> to the provided account number.
            </p>
          </Card>

          {/* Step 3 */}
          <Card style={{ padding: 20, marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>3</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                Confirm after paying
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: "0 0 14px", lineHeight: 1.6 }}>
              Once your transfer is complete, tap the button below and your balance will be credited instantly.
            </p>
            <Button
              onClick={handleConfirmPayment}
              className="w-full"
              style={{ background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 0" }}>
              <CheckCircle2 size={16} style={{ marginRight: 8 }} />
              I Have Paid — Confirm Now
            </Button>
          </Card>

          <p style={{ fontSize: 11, color: "#555", textAlign: "center", lineHeight: 1.6 }}>
            🔒 Your transfer is processed securely. Ref: <span style={{ color: "#9C9C9C" }}>{txRef}</span>
          </p>
        </div>
      </AppLayout>
    );
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20,
          fontWeight: 600, margin: "0 0 20px" }}>
          Deposit
        </h1>

        {isFirstDeposit && (
          <Card style={{ padding: 14, marginBottom: 20, background: "rgba(212,175,55,0.08)",
            border: "1px solid rgba(212,175,55,0.3)" }}>
            <p style={{ fontSize: 13, color: "#D4AF37", margin: 0, fontWeight: 600 }}>
              🎁 Get a {formatNaira(WELCOME_BONUS)} welcome bonus on your first deposit!
            </p>
          </Card>
        )}

        {/* Accepted method */}
        <Card style={{ padding: 16, marginBottom: 20, background: "rgba(13,32,68,0.4)",
          border: "1px solid rgba(212,175,55,0.2)" }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 12px",
            textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Accepted Payment Method
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.06)",
            border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "10px 14px", width: "fit-content" }}>
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
            <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 6 }}>
              Minimum deposit: {formatNaira(MIN_DEPOSIT)}
            </p>
          </div>

          <Button
            onClick={handleGenerateLink}
            disabled={isLoading || !amount}
            className="w-full"
            style={{ background: isLoading ? "rgba(212,175,55,0.5)" : "#D4AF37",
              color: "#000", fontWeight: 700, fontSize: 15, padding: "14px 0" }}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating Payment Link…</>
            ) : (
              <><Landmark className="h-4 w-4 mr-2" />Generate Payment Link</>
            )}
          </Button>
        </Card>

        <Card style={{ padding: 14, background: "rgba(13,32,68,0.3)",
          border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0, lineHeight: 1.7 }}>
            🔒 Your payment is processed securely by <span style={{ color: "#D4AF37" }}>Rivora Exchange</span>. Bank details are never stored on our servers. Funds are credited instantly upon confirmation.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}


const API = import.meta.env.VITE_API_BASE_URL as string;
const FLW_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY as string;
const MIN_DEPOSIT = 20_000;
const WELCOME_BONUS = 2_000;

const CURRENCIES = [
  { value: "NGN", label: "NGN — Nigerian Naira (₦)" },
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "GHS", label: "GHS — Ghanaian Cedi (₵)" },
  { value: "KES", label: "KES — Kenyan Shilling (KSh)" },
  { value: "ZAR", label: "ZAR — South African Rand (R)" },
];

declare global {
  interface Window {
    FlutterwaveCheckout: (config: Record<string, unknown>) => { close: () => void };
  }
}

async function initiateFlutterwavePayment(
  amount: number,
  currency: string,
  token: string,
): Promise<{ paymentLink: string; txRef: string; depositRequestId: string }> {
  const r = await fetch(`${API}/api/flutterwave/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      currency,
      redirectUrl: `${window.location.origin}/payment-callback`,
    }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.message || "Failed to initiate payment");
  }
  return r.json();
}

async function verifyPayment(txRef: string, token: string): Promise<{ status: string }> {
  const r = await fetch(
    `${API}/api/flutterwave/verify/${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.message || "Verification failed");
  }
  return r.json();
}

function loadFlutterwaveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Flutterwave script"));
    document.head.appendChild(s);
  });
}

type DepositStage = "form" | "processing" | "success" | "failed";

export default function DepositPage() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [stage, setStage] = useState<DepositStage>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTxRef, setCurrentTxRef] = useState<string | null>(null);

  const isFirstDeposit = user && !user.hasReceivedWelcomeBonus;
  const token = localStorage.getItem("rivora_token") ?? "";

  const handlePay = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_DEPOSIT) {
      toast({
        title: "Invalid amount",
        description: `Minimum deposit is ${formatNaira(MIN_DEPOSIT)}`,
        variant: "destructive",
      });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      await loadFlutterwaveScript();

      const { txRef } = await initiateFlutterwavePayment(numAmount, currency, token);
      setCurrentTxRef(txRef);

      window.FlutterwaveCheckout({
        public_key: FLW_PUBLIC_KEY,
        tx_ref: txRef,
        amount: numAmount,
        currency,
        payment_options: "banktransfer",
        customer: {
          email: `${user.phone.replace("+", "")}@rivora.app`,
          phone_number: user.phone,
          name: user.fullName,
        },
        customizations: {
          title: "Rivora Exchange",
          description: `Fund your Rivora account (${currency})`,
          logo: `${window.location.origin}/rivora-logo.png`,
        },
        callback: async (response: { status: string; tx_ref: string }) => {
          if (response.status === "successful" || response.status === "completed") {
            setStage("processing");
            try {
              const result = await verifyPayment(response.tx_ref, token);
              if (result.status === "approved") {
                await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                setStage("success");
              } else {
                setStage("failed");
              }
            } catch {
              setStage("failed");
            }
          } else {
            setStage("failed");
          }
        },
        onclose: () => {
          setIsLoading(false);
          setCurrentTxRef(null);
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initiation failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAmount("");
    setCurrency("NGN");
    setStage("form");
    setIsLoading(false);
    setCurrentTxRef(null);
  };

  if (stage === "processing") {
    return (
      <AppLayout>
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <Loader2
            size={56}
            color="#D4AF37"
            style={{ margin: "0 auto 16px", animation: "spin 1s linear infinite" }}
          />
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20,
              fontWeight: 600,
              color: "#D4AF37",
              margin: "0 0 8px",
            }}
          >
            Verifying Payment…
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14 }}>
            Please wait while we confirm your transaction.
          </p>
        </div>
      </AppLayout>
    );
  }

  if (stage === "success") {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <CheckCircle2 size={64} color="#22c55e" style={{ marginBottom: 16 }} />
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: "#22c55e",
              margin: "0 0 12px",
            }}
          >
            Payment Successful!
          </h1>
          <p style={{ color: "#e8eaec", fontSize: 15, marginBottom: 8 }}>
            Your account has been credited.
          </p>
          {isFirstDeposit && (
            <p style={{ color: "#D4AF37", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              🎁 Welcome bonus of {formatNaira(WELCOME_BONUS)} has been added!
            </p>
          )}
          <Card
            style={{
              padding: 16,
              margin: "20px auto",
              maxWidth: 350,
              background: "rgba(13,32,68,0.5)",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          >
            <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0 }}>
              Transaction ref:{" "}
              <span style={{ color: "#fff", wordBreak: "break-all" }}>{currentTxRef}</span>
            </p>
          </Card>
          <Button
            onClick={handleReset}
            style={{ background: "#22c55e", color: "#fff", fontWeight: 700, marginTop: 8 }}
          >
            Make Another Deposit
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (stage === "failed") {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <AlertCircle size={64} color="#ef4444" style={{ marginBottom: 16 }} />
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: "#ef4444",
              margin: "0 0 12px",
            }}
          >
            Payment Failed
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14, marginBottom: 24 }}>
            Your payment could not be processed. No funds have been deducted.
          </p>
          <Button
            onClick={handleReset}
            style={{ background: "#D4AF37", color: "#000", fontWeight: 700 }}
          >
            Try Again
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 20,
            fontWeight: 600,
            margin: "0 0 20px",
          }}
        >
          Deposit
        </h1>

        {isFirstDeposit && (
          <Card
            style={{
              padding: 14,
              marginBottom: 20,
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            <p style={{ fontSize: 13, color: "#D4AF37", margin: 0, fontWeight: 600 }}>
              🎁 Get a {formatNaira(WELCOME_BONUS)} welcome bonus on your first deposit!
            </p>
          </Card>
        )}

        <Card
          style={{
            padding: 16,
            marginBottom: 20,
            background: "rgba(13,32,68,0.4)",
            border: "1px solid rgba(212,175,55,0.2)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#9C9C9C",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Accepted Payment Method
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(212,175,55,0.06)",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 10,
              padding: "10px 14px",
              width: "fit-content",
            }}
          >
            <Landmark size={16} color="#D4AF37" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#D4AF37" }}>Bank Transfer</span>
          </div>
        </Card>

        <Card style={{ padding: 20, marginBottom: 20, background: "rgba(0,0,0,0.2)" }}>
          <div style={{ marginBottom: 18 }}>
            <Label style={{ fontSize: 13, color: "#9C9C9C" }}>Amount</Label>
            <Input
              type="number"
              placeholder={`Minimum ${formatNaira(MIN_DEPOSIT)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ marginTop: 8, fontSize: 16 }}
            />
            <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 6 }}>
              Minimum deposit: {formatNaira(MIN_DEPOSIT)}
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Label style={{ fontSize: 13, color: "#9C9C9C" }}>Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 8,
                padding: "10px 12px",
                fontSize: 14,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value} style={{ background: "#0a0a0a" }}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handlePay}
            disabled={isLoading || !amount}
            className="w-full"
            style={{
              background: isLoading ? "rgba(212,175,55,0.5)" : "#D4AF37",
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 0",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Launching Payment…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay with Flutterwave
              </>
            )}
          </Button>
        </Card>

        <Card
          style={{
            padding: 14,
            background: "rgba(13,32,68,0.3)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0, lineHeight: 1.7 }}>
            🔒 Payments are processed securely by{" "}
            <span style={{ color: "#D4AF37" }}>Flutterwave</span>. Your card and bank
            details are never stored on our servers. Funds are credited instantly upon
            successful payment.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
