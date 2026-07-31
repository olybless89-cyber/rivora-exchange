import { useState, useEffect, useRef } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { CheckCircle2, Loader2, Copy, CheckCheck, Clock, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL as string;
const MIN_DEPOSIT = 20_000;
const WELCOME_BONUS = 2_000;
const COUNTDOWN_MINUTES = 10;

async function getSetting(key: string): Promise<string> {
  const token = localStorage.getItem("rivora_token");
  const r = await fetch(`${API}/api/settings/${key}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return (await r.json()).value ?? "";
}

async function instantDeposit(amount: number, paymentMethod: string): Promise<{ newBalance: number; bonusCredited: number }> {
  const token = localStorage.getItem("rivora_token");
  const r = await fetch(`${API}/api/deposit-requests/instant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, paymentMethod }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.message || "Deposit failed");
  }
  return r.json();
}

export default function DepositPage() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  // Platform payment details
  const [platformBankName, setPlatformBankName] = useState("");
  const [platformAccountNumber, setPlatformAccountNumber] = useState("");
  const [platformAccountName, setPlatformAccountName] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form state
  const [amount, setAmount] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [paymentMade, setPaymentMade] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const isFirstDeposit = user && !user.hasReceivedWelcomeBonus;

  // Load platform payment details
  useEffect(() => {
    Promise.all([
      getSetting("platform_bank_name"),
      getSetting("platform_bank_account_number"),
      getSetting("platform_bank_account_name"),
    ]).then(([bank, account, name]) => {
      setPlatformBankName(bank);
      setPlatformAccountNumber(account);
      setPlatformAccountName(name);
      setLoadingSettings(false);
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdownStarted && countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [countdownStarted, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStartCountdown = () => {
    if (!amount || Number(amount) < MIN_DEPOSIT) {
      toast({ title: "Invalid amount", description: `Minimum deposit is ${formatNaira(MIN_DEPOSIT)}`, variant: "destructive" });
      return;
    }
    if (!depositorName.trim()) {
      toast({ title: "Missing name", description: "Please enter the depositor's name as it appears on the bank transfer", variant: "destructive" });
      return;
    }
    setCountdownStarted(true);
    setCountdown(COUNTDOWN_MINUTES * 60);
    toast({ title: "Countdown started", description: `You have ${COUNTDOWN_MINUTES} minutes to make your payment.` });
  };

  const handlePaymentMade = async () => {
    if (!user) return;
    
    const numAmount = Number(amount);
    setIsProcessing(true);
    
    try {
      const result = await instantDeposit(numAmount, `Bank Transfer - ${depositorName}`);
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      
      setPaymentMade(true);
      
      // Clear countdown
      if (countdownRef.current) clearTimeout(countdownRef.current);
      
      toast({
        title: "Payment Confirmed! 💰",
        description: `${formatNaira(numAmount)} ${result.bonusCredited > 0 ? `+ ${formatNaira(result.bonusCredited)} bonus` : ""} has been added to your balance!`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Deposit failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setAmount("");
    setDepositorName("");
    setCountdown(0);
    setCountdownStarted(false);
    setPaymentMade(false);
    if (countdownRef.current) clearTimeout(countdownRef.current);
  };

  // Payment successful screen
  if (paymentMade) {
    return (
      <AppLayout>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <CheckCircle2 size={64} color="#22c55e" style={{ marginBottom: 16 }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, margin: "0 0 12px", color: "#22c55e" }}>
            Payment Confirmed!
          </h1>
          <p style={{ color: "#e8eaec", fontSize: 15, marginBottom: 8 }}>
            {formatNaira(amount)} has been credited to your account!
          </p>
          {isFirstDeposit && (
            <Card style={{ padding: 16, margin: "16px auto", maxWidth: 300, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <p style={{ color: "#22c55e", fontSize: 14, fontWeight: 600, margin: 0 }}>
                🎁 +{formatNaira(WELCOME_BONUS)} Welcome Bonus Added!
              </p>
            </Card>
          )}
          <Card style={{ padding: 16, margin: "20px auto", maxWidth: 350, background: "rgba(13,32,68,0.5)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <h4 style={{ fontSize: 13, color: "#D4AF37", margin: "0 0 8px" }}>Transaction Details</h4>
            <div style={{ textAlign: "left", fontSize: 12, color: "#9C9C9C" }}>
              <p style={{ margin: "4px 0" }}>Amount: <span style={{ color: "#fff" }}>{formatNaira(amount)}</span></p>
              <p style={{ margin: "4px 0" }}>Depositor: <span style={{ color: "#fff" }}>{depositorName}</span></p>
              <p style={{ margin: "4px 0" }}>Status: <span style={{ color: "#22c55e", fontWeight: 600 }}>CREDITED</span></p>
            </div>
          </Card>
          <Button onClick={handleReset} className="w-full" style={{ maxWidth: 300, marginTop: 16 }}>
            Make Another Deposit
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Countdown screen (payment in progress)
  if (countdownStarted && countdown > 0) {
    return (
      <AppLayout>
        <div style={{ padding: "24px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 20px" }}>Make Payment</h1>

          {/* Countdown Timer */}
          <Card style={{ padding: 20, marginBottom: 20, textAlign: "center", background: "rgba(201,58,46,0.1)", border: "1px solid rgba(201,58,46,0.3)" }}>
            <Clock size={32} color="#ef4444" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 4px" }}>Time Remaining</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: countdown < 60 ? "#ef4444" : "#D4AF37", margin: 0 }}>
              {formatTime(countdown)}
            </p>
            <p style={{ fontSize: 11, color: "#9C9C9C", margin: "8px 0 0" }}>Complete your transfer before time runs out</p>
          </Card>

          {/* Payment Details Reminder */}
          <Card style={{ padding: 16, marginBottom: 20, background: "rgba(13,32,68,0.5)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#D4AF37", margin: "0 0 12px" }}>Transfer {formatNaira(amount)} to:</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#9C9C9C" }}>Bank</span>
                <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{platformBankName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#9C9C9C" }}>Account Number</span>
                <span style={{ fontSize: 15, color: "#D4AF37", fontWeight: 800, letterSpacing: "0.1em" }}>{platformAccountNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#9C9C9C" }}>Account Name</span>
                <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{platformAccountName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#9C9C9C" }}>Amount</span>
                <span style={{ fontSize: 15, color: "#22c55e", fontWeight: 800 }}>{formatNaira(amount)}</span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 16, marginBottom: 24, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={20} color="#ef4444" style={{ marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, color: "#f87171", margin: 0, fontWeight: 600 }}>Important</p>
                <p style={{ fontSize: 12, color: "#9C9C9C", margin: "4px 0 0" }}>
                  After making the transfer, click the button below. Your balance will be credited immediately.
                  If you don't see the credit, contact support with your User ID: <strong style={{ color: "#fff" }}>{user?.id?.slice(0, 8)}</strong>
                </p>
              </div>
            </div>
          </Card>

          <Button 
            onClick={handlePaymentMade} 
            disabled={isProcessing}
            className="w-full"
            style={{ background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 16, padding: "16px 0" }}
          >
            {isProcessing ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
            ) : (
              "✓ I HAVE MADE THE PAYMENT"
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleReset} 
            className="w-full mt-3"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            Cancel
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Initial deposit form
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
        {!loadingSettings && (platformBankName || platformAccountNumber || platformAccountName) ? (
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
        ) : loadingSettings ? (
          <Card style={{ padding: 16, marginBottom: 20, textAlign: "center" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#D4AF37", margin: "0 auto" }} />
            <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 8 }}>Loading payment details...</p>
          </Card>
        ) : (
          <Card style={{ padding: 16, marginBottom: 20, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)" }}>
            <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>
              ⚠️ Platform payment details not set. Please contact support.
            </p>
          </Card>
        )}

        {/* Deposit Form */}
        <Card style={{ padding: 16, marginBottom: 20, background: "rgba(0,0,0,0.2)" }}>
          <div style={{ marginBottom: 16 }}>
            <Label>Amount to Deposit (₦)</Label>
            <Input
              type="number"
              placeholder={`Minimum ${formatNaira(MIN_DEPOSIT)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />
            <p style={{ fontSize: 12, color: "#9C9C9C", marginTop: 6 }}>Minimum deposit: {formatNaira(MIN_DEPOSIT)}</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Label>Depositor's Name (as on transfer)</Label>
            <Input
              type="text"
              placeholder="Enter the name used for the bank transfer"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              className="mt-2"
            />
            <p style={{ fontSize: 11, color: "#9C9C9C", marginTop: 4 }}>This helps us verify your payment</p>
          </div>

          <div style={{ background: "rgba(212,175,55,0.1)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Clock size={16} color="#D4AF37" />
              <span style={{ fontSize: 12, color: "#D4AF37", fontWeight: 600 }}>{COUNTDOWN_MINUTES} Minutes Countdown</span>
            </div>
            <p style={{ fontSize: 11, color: "#9C9C9C", margin: 0 }}>
              Once you start, you'll have {COUNTDOWN_MINUTES} minutes to complete your bank transfer.
            </p>
          </div>

          <Button 
            onClick={handleStartCountdown} 
            className="w-full"
            style={{ background: "#D4AF37", color: "#000", fontWeight: 700 }}
          >
            <Clock className="h-4 w-4 mr-2" />
            START COUNTDOWN & MAKE PAYMENT
          </Button>
        </Card>

        <Card style={{ padding: 16, background: "rgba(13,32,68,0.3)" }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>How it works:</h4>
          <ol style={{ fontSize: 12, color: "#9C9C9C", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Copy the account details above</li>
            <li>Enter amount and your name as on transfer</li>
            <li>Start countdown - you have 10 minutes</li>
            <li>Make the bank transfer</li>
            <li>Click "I HAVE MADE THE PAYMENT"</li>
            <li>Money credited instantly to your account!</li>
          </ol>
        </Card>
      </div>
    </AppLayout>
  );
}
