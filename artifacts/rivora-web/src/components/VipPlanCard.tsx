import { VipPlan, calculateVipReturns, formatNaira, generateFormula } from "@/lib/vipPlans";
import { Wallet, TrendingUp, Calendar, PieChart } from "lucide-react";

interface VipPlanCardProps {
  plan: VipPlan;
  onInvest?: (plan: VipPlan) => void;
}

export function VipPlanCard({ plan, onInvest }: VipPlanCardProps) {
  const returns = calculateVipReturns(plan);

  const handleInvest = () => {
    if (onInvest) {
      onInvest(plan);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(160deg, #071423 0%, #0a1e35 100%)",
        border: "2px solid #D4AF37",
        borderRadius: 22,
        padding: "24px 20px",
        width: "100%",
        maxWidth: 380,
        boxSizing: "border-box",
        boxShadow: "0 8px 32px rgba(212, 175, 55, 0.15)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        {/* VIP Badge */}
        <div
          style={{
            background: "rgba(7, 20, 35, 0.9)",
            border: "2px solid #D4AF37",
            borderRadius: 10,
            padding: "8px 18px",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "#D4AF37",
              letterSpacing: "0.05em",
            }}
          >
            {plan.name}
          </span>
        </div>

        {/* Daily Rate Badge */}
        <div
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            border: "2px solid #22c55e",
            borderRadius: 10,
            padding: "8px 14px",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#22c55e",
            }}
          >
            {plan.dailyRate}% daily
          </span>
        </div>
      </div>

      {/* Row 1: Principal */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "rgba(212, 175, 55, 0.1)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Wallet size={20} color="#D4AF37" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", margin: 0 }}>
            Principal
          </p>
          <p style={{ fontSize: 10, color: "#9C9C9C", margin: "2px 0 0" }}>
            Minimum deposit
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#D4AF37",
              margin: 0,
            }}
          >
            {formatNaira(returns.principal)}
          </p>
        </div>
      </div>

      {/* Row 2: Daily Profit */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TrendingUp size={20} color="#22c55e" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", margin: 0 }}>
            Daily Profit
          </p>
          <p style={{ fontSize: 10, color: "#9C9C9C", margin: "2px 0 0" }}>
            10% per day
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#22c55e",
              margin: 0,
            }}
          >
            {formatNaira(returns.dailyProfit)}
          </p>
        </div>
      </div>

      {/* Row 3: 30-Day Profit */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Calendar size={20} color="#22c55e" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", margin: 0 }}>
            30-Day Profit
          </p>
          <p style={{ fontSize: 10, color: "#9C9C9C", margin: "2px 0 0" }}>
            Monthly earnings
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#22c55e",
              margin: 0,
            }}
          >
            {formatNaira(returns.profit30Days)}
          </p>
          <p
            style={{
              fontSize: 9,
              color: "#6B7280",
              margin: "3px 0 0",
            }}
          >
            ({generateFormula(returns.principal, plan.dailyRate, 30)})
          </p>
        </div>
      </div>

      {/* Row 4: 90-Day Profit */}
      <div
        style={{
          background: "rgba(212, 175, 55, 0.08)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "rgba(212, 175, 55, 0.15)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Calendar size={20} color="#D4AF37" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", margin: 0 }}>
            90-Day Profit
          </p>
          <p style={{ fontSize: 10, color: "#9C9C9C", margin: "2px 0 0" }}>
            Full term earnings
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#D4AF37",
              margin: 0,
            }}
          >
            {formatNaira(returns.profit90Days)}
          </p>
          <p
            style={{
              fontSize: 9,
              color: "#6B7280",
              margin: "3px 0 0",
            }}
          >
            ({generateFormula(returns.principal, plan.dailyRate, 90)})
          </p>
        </div>
      </div>

      {/* Row 5: Total Return */}
      <div
        style={{
          background: "rgba(212, 175, 55, 0.08)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "rgba(212, 175, 55, 0.15)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PieChart size={20} color="#D4AF37" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", margin: 0 }}>
            Total Return
          </p>
          <p style={{ fontSize: 10, color: "#9C9C9C", margin: "2px 0 0" }}>
            Principal + profit
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#D4AF37",
              margin: 0,
            }}
          >
            {formatNaira(returns.totalReturn)}
          </p>
          <p
            style={{
              fontSize: 9,
              color: "#6B7280",
              margin: "3px 0 0",
            }}
          >
            ({formatNaira(returns.principal)} + {formatNaira(returns.profit90Days)})
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleInvest}
        style={{
          width: "100%",
          padding: "16px 0",
          background: "linear-gradient(135deg, #D4AF37 0%, #A6821F 100%)",
          border: "none",
          borderRadius: 12,
          color: "#000000",
          fontSize: 14,
          fontWeight: 900,
          cursor: "pointer",
          letterSpacing: "0.06em",
          boxShadow: "0 4px 16px rgba(212, 175, 55, 0.3)",
          marginBottom: 14,
        }}
      >
        INVEST IN {plan.name.toUpperCase()}
      </button>

      {/* Footer */}
      <p
        style={{
          fontSize: 10,
          color: "#6B7280",
          textAlign: "center",
          margin: 0,
        }}
      >
        *Profits are calculated based on 10% daily returns.
      </p>
    </div>
  );
}
