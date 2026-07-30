// VIP Investment Plans Configuration
// All calculations are based on: daily_rate = 10%, duration = 90 days

export interface VipPlan {
  id: string;
  name: string; // e.g., "VIP 1"
  vipNumber: number; // 1-9
  principal: number;
  dailyRate: number; // percentage
  durationDays: number;
}

export const vipPlans: VipPlan[] = [
  {
    id: "vip-1",
    name: "VIP 1",
    vipNumber: 1,
    principal: 20000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-2",
    name: "VIP 2",
    vipNumber: 2,
    principal: 30000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-3",
    name: "VIP 3",
    vipNumber: 3,
    principal: 100000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-4",
    name: "VIP 4",
    vipNumber: 4,
    principal: 150000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-5",
    name: "VIP 5",
    vipNumber: 5,
    principal: 200000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-6",
    name: "VIP 6",
    vipNumber: 6,
    principal: 250000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-7",
    name: "VIP 7",
    vipNumber: 7,
    principal: 500000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-8",
    name: "VIP 8",
    vipNumber: 8,
    principal: 1000000,
    dailyRate: 10,
    durationDays: 90,
  },
  {
    id: "vip-9",
    name: "VIP 9",
    vipNumber: 9,
    principal: 2000000,
    dailyRate: 10,
    durationDays: 90,
  },
];

// Helper function to calculate returns
export function calculateVipReturns(plan: VipPlan) {
  const principal = plan.principal;
  const dailyProfit = (principal * plan.dailyRate) / 100;
  const profit30Days = dailyProfit * 30;
  const profit90Days = dailyProfit * plan.durationDays;
  const totalReturn = principal + profit90Days;

  return {
    principal,
    dailyProfit,
    profit30Days,
    profit90Days,
    totalReturn,
  };
}

// Format currency with Naira symbol and comma separators
export function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG");
}

// Generate formula strings
export function generateFormula(principal: number, rate: number, days: number): string {
  return `${formatNaira(principal)} × ${rate}% × ${days}`;
}
