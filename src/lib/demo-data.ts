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

export const DEMO_INVITE_CODES = ["PB50RK", "POWER100", "WELCOME26", "DEMO2026"] as const;

export type SignupInput = { name: string; mobile: string; password: string; confirm: string; invite: string; agree: boolean };

/** Returns field → message for every invalid signup field (empty object when valid). */
export function signupErrors(v: SignupInput, existingMobiles: string[] = [], checkDemoCodes = true): Partial<Record<keyof SignupInput, string>> {
  const e: Partial<Record<keyof SignupInput, string>> = {};
  if (!v.name.trim()) e.name = "Full name is required";
  else if (v.name.trim().length > 60) e.name = "Name must be under 60 characters";
  if (!/^[6-9]\d{9}$/.test(v.mobile)) e.mobile = "Enter a valid 10-digit Indian mobile number";
  else if (existingMobiles.includes(v.mobile)) e.mobile = "This mobile number is already registered";
  if (v.password.length < 6) e.password = "Password must be at least 6 characters";
  if (v.confirm !== v.password) e.confirm = "Passwords do not match";
  if (!v.invite.trim()) e.invite = "Invitation code is required";
  else if (checkDemoCodes && !(DEMO_INVITE_CODES as readonly string[]).includes(v.invite.trim().toUpperCase())) e.invite = "Invalid invitation code";
  if (!v.agree) e.agree = "Please accept the Terms & Conditions and Privacy Policy";
  return e;
}
