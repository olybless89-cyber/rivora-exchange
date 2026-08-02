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
  CreditCard,
  Landmark,
} from "lucide-react";

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
