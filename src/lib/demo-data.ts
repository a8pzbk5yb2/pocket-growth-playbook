export const user = { name: "Riyaj Khan", id: "PB123456", balance: 0, earnings: 0, team: 0, inviteCode: "PB50RK" };

export const plans = [
  { name: "Basic Plan", price: 100, daily: 10, tag: "all", icon: "zap" },
  { name: "Silver Plan", price: 500, daily: 60, tag: "popular", icon: "star" },
  { name: "Gold Plan", price: 1000, daily: 130, tag: "premium", icon: "crown" },
  { name: "Diamond Plan", price: 2000, daily: 280, tag: "premium", icon: "gem" },
] as const;

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 === 0 && n !== 0 ? 0 : 2, maximumFractionDigits: 2 });

export const MIN_WITHDRAW = 100;

export function withdrawError(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount";
  if (amount < MIN_WITHDRAW) return `Minimum withdrawal is ${inr(MIN_WITHDRAW)}`;
  if (amount > balance) return "Amount is more than your available balance";
  return null;
}
