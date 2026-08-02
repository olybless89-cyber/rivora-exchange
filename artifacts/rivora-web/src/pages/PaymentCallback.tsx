import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL as string;

type Status = "verifying" | "success" | "failed" | "cancelled";

async function verifyPayment(txRef: string, token: string): Promise<{ status: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15_000);
  try {
    const r = await fetch(
      `${API}/api/flutterwave/verify/${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || "Verification failed");
    }
    return r.json();
  } finally {
    clearTimeout(id);
  }
}

export default function PaymentCallbackPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();

  const [status, setStatus] = useState<Status>("verifying");
  const [txRef, setTxRef] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("tx_ref");
    const flwStatus = params.get("status");

    setTxRef(ref);

    if (!ref || flwStatus === "cancelled") {
      setStatus("cancelled");
      return;
    }

    const token = localStorage.getItem("rivora_token") ?? "";
    verifyPayment(ref, token)
      .then(async (result) => {
        if (result.status === "approved") {
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setStatus("success");
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, [queryClient]);

  const base: React.CSSProperties = {
    padding: "60px 24px",
    textAlign: "center",
    maxWidth: 400,
    margin: "0 auto",
  };

  if (status === "verifying") {
    return (
      <AppLayout>
        <div style={base}>
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

  if (status === "success") {
    return (
      <AppLayout>
        <div style={base}>
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
          <p style={{ color: "#e8eaec", fontSize: 15, marginBottom: 20 }}>
            Your Rivora account has been credited successfully.
          </p>
          {txRef && (
            <Card
              style={{
                padding: 12,
                marginBottom: 20,
                background: "rgba(13,32,68,0.5)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              <p style={{ fontSize: 11, color: "#9C9C9C", margin: 0 }}>
                Reference: <span style={{ color: "#fff", wordBreak: "break-all" }}>{txRef}</span>
              </p>
            </Card>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button
              onClick={() => setLocation("/dashboard")}
              style={{ background: "#22c55e", color: "#fff", fontWeight: 700 }}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/history")}
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              View Transaction History
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (status === "cancelled") {
    return (
      <AppLayout>
        <div style={base}>
          <AlertCircle size={64} color="#9C9C9C" style={{ marginBottom: 16 }} />
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: "#e8eaec",
              margin: "0 0 12px",
            }}
          >
            Payment Cancelled
          </h1>
          <p style={{ color: "#9C9C9C", fontSize: 14, marginBottom: 24 }}>
            You cancelled the payment. No funds have been deducted.
          </p>
          <Button
            onClick={() => setLocation("/deposit")}
            style={{ background: "#D4AF37", color: "#000", fontWeight: 700 }}
          >
            Try Again
          </Button>
        </div>
      </AppLayout>
    );
  }

  // failed
  return (
    <AppLayout>
      <div style={base}>
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
          Your payment could not be processed. No funds have been deducted from your
          account.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button
            onClick={() => setLocation("/deposit")}
            style={{ background: "#D4AF37", color: "#000", fontWeight: 700 }}
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
