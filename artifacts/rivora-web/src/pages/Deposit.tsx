import { useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import {
  Clock,
  Loader2,
  Landmark,
  ShieldCheck,
  Copy,
  ExternalLink,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL as string;
const MIN_DEPOSIT = 20_000;
const WELCOME_BONUS = 2_000;
const PAYMENT_LINK = "https://flutterwave.com/pay/ah751gjngbnl";

// Creates a pending deposit request so admin can review and approve it
async function createDepositRequest(
  amount: number,
  token: string,
): Promise<{ id: string }> {
  const r = await fetch(`${API}/api/deposit-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, paymentMethod: "Bank Transfer (Payment Link)" }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Could not register deposit");
  }
  return r.json();
}

type DepositStage = "form" | "submitted";

export default function DepositPage() {
  const { data: user } = useGetMe();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DepositStage>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);

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
    if (!user || !token) {
      toast({ title: "Session Expired", description: "Please log out and log back in.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Register pending deposit so admin can see and approve it
      const { id } = await createDepositRequest(numAmount, token);
      setDepositId(id);

      // Open the Flutterwave payment page in a new tab — amount is for reference
      window.open(PAYMENT_LINK, "_blank", "noopener,noreferrer");

      setStage("submitted");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not process deposit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyRef = () => {
    if (!depositId) return;
    navigator.clipboard.writeText(depositId).then(() => {
      toast({ title: "Copied!", description: "Reference ID copied to clipboard." });
    });
  };

  const handleReset = () => {
    setAmount("");
    setStage("form");
    setIsLoading(false);
    setDepositId(null);
  };

  // ── Submitted — awaiting admin approval ──────────────────────
  if (stage === "submitted") {
    return (
      <AppLayout>
        <div style={{ padding: "40px 24px", maxWidth: 480, margin: "0 auto" }}>
          {/* Status icon */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: "2px solid rgba(212,175,55,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Clock size={36} color="#D4AF37" />
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#D4AF37", margin: "0 0 8px" }}>
              Payment Submitted
            </h1>
            <p style={{ color: "#9C9C9C", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Complete your payment on the page that just opened. Your account will be credited after our team confirms your transfer.
            </p>
          </div>

          {/* Reference ID */}
          {depositId && (
            <Card style={{ padding: 16, marginBottom: 20, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)" }}>
              <p style={{ fontSize: 11, color: "#9C9C9C", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Your Deposit Reference
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <p style={{ fontSize: 12, color: "#D4AF37", margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>
                  {depositId}
                </p>
                <button
                  onClick={copyRef}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#D4AF37", padding: 4, flexShrink: 0 }}
                  title="Copy reference"
                >
                  <Copy size={15} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#9C9C9C", margin: "8px 0 0", lineHeight: 1.5 }}>
                Save this reference. If the payment page didn't open, use the button below.
              </p>
            </Card>
          )}

          {/* Steps */}
          <Card style={{ padding: 16, marginBottom: 20, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              What happens next
            </p>
            {[
              { step: "1", text: "Complete your bank transfer on the Flutterwave payment page" },
              { step: "2", text: "Our team reviews your payment (usually within a few minutes)" },
              { step: "3", text: "Your wallet balance is credited once approved" },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "#D4AF37", fontWeight: 700 }}>{item.step}</span>
                </div>
                <p style={{ fontSize: 13, color: "#e8eaec", margin: 0, lineHeight: 1.5 }}>{item.text}</p>
              </div>
            ))}
          </Card>

          {isFirstDeposit && (
            <Card style={{ padding: 12, marginBottom: 20, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <p style={{ fontSize: 13, color: "#D4AF37", margin: 0, fontWeight: 600 }}>
                🎁 Welcome bonus of {formatNaira(WELCOME_BONUS)} will be added on your first approved deposit!
              </p>
            </Card>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button
              onClick={() => window.open(PAYMENT_LINK, "_blank", "noopener,noreferrer")}
              className="w-full"
              style={{ background: "#D4AF37", color: "#000", fontWeight: 700, fontSize: 15, padding: "14px 0" }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Payment Page Again
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              className="w-full"
              style={{ color: "#9C9C9C", fontSize: 14 }}
            >
              Make a Different Deposit
            </Button>
          </div>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: "#D4AF37" }}>Bank Transfer Only</span>
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
            onClick={handlePay}
            disabled={isLoading || !amount}
            className="w-full"
            style={{
              background: isLoading ? "rgba(212,175,55,0.5)" : "#D4AF37",
              color: "#000", fontWeight: 700, fontSize: 15, padding: "14px 0",
            }}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
            ) : (
              <><ShieldCheck className="h-4 w-4 mr-2" />Pay Securely</>
            )}
          </Button>
        </Card>

        <Card style={{ padding: 14, background: "rgba(13,32,68,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0, lineHeight: 1.7 }}>
            🔒 Payments are processed securely by <span style={{ color: "#D4AF37" }}>Rivora Exchange Nig Ltd</span>. Your bank details are never stored on our servers. Funds are credited after admin approval.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
