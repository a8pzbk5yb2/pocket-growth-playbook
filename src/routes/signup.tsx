import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Eye, EyeOff, Gift, Loader2, Lock, Phone, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AuthLayout, PrimaryButton, SwitchLink } from "@/components/pb/auth";
import { meta } from "@/components/pb/shell";
import { signupErrors, type SignupInput } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/signup")({ head: () => meta("Sign Up", "Create your PowerBank demo account and start your journey."), component: Signup });

export function AuthInput({ icon, error, children, toggle }: { icon: ReactNode; error?: string | undefined; children: ReactNode; toggle?: ReactNode }) {
  return <div><label className={`pb-field ${error ? "!border-destructive" : ""}`}>{icon}{children}{toggle}</label>{error && <p className="mt-1 pl-3 text-[11px] font-medium text-destructive">{error}</p>}</div>;
}
export function Eyes({ show, set }: { show: boolean; set: (v: boolean) => void }) { return <button type="button" className="pb-eye grid place-items-center" onClick={() => set(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <Eye /> : <EyeOff />}</button>; }

function Signup() {
  const nav = useNavigate(); const d = useDemo();
  const [v, setV] = useState<SignupInput>({ name: "", mobile: "", password: "", confirm: "", invite: "", agree: false });
  const [err, setErr] = useState<ReturnType<typeof signupErrors>>({}); const [busy, setBusy] = useState(false); const [s1, setS1] = useState(false); const [s2, setS2] = useState(false);
  const set = (k: keyof SignupInput) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: k === "mobile" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value });
  return <AuthLayout title="Create Your PowerBank Account" subtitle="Join today and start your investment journey.">
    <form noValidate className="space-y-3" onSubmit={e => { e.preventDefault(); const er = signupErrors(v, d.users.map(u => u.mobile)); setErr(er);
      if (Object.keys(er).length) { toast.error("Please fix the highlighted fields"); return; }
      setBusy(true); setTimeout(() => { const u = d.signup(v); setBusy(false); toast.success(`Welcome, ${u.name}! Demo account created — no real account exists.`); nav({ to: "/dashboard" }); }, 700); }}>
      <AuthInput icon={<User className="pb-field-icon" />} error={err.name}><input value={v.name} onChange={set("name")} maxLength={60} placeholder="Enter your full name" aria-label="Full Name" /></AuthInput>
      <AuthInput icon={<Phone className="pb-field-icon" />} error={err.mobile}><span className="pb-country">+91 🇮🇳<ChevronDown /></span><input value={v.mobile} onChange={set("mobile")} inputMode="numeric" placeholder="Enter your mobile number" aria-label="Mobile Number" /></AuthInput>
      <AuthInput icon={<Lock className="pb-field-icon" />} error={err.password} toggle={<Eyes show={s1} set={setS1} />}><input type={s1 ? "text" : "password"} value={v.password} onChange={set("password")} placeholder="Create a strong password" aria-label="Create Password" /></AuthInput>
      <AuthInput icon={<Lock className="pb-field-icon" />} error={err.confirm} toggle={<Eyes show={s2} set={setS2} />}><input type={s2 ? "text" : "password"} value={v.confirm} onChange={set("confirm")} placeholder="Re-enter your password" aria-label="Confirm Password" /></AuthInput>
      <AuthInput icon={<Gift className="pb-field-icon" />} error={err.invite}><input value={v.invite} onChange={set("invite")} maxLength={20} placeholder="Enter invitation code *" aria-label="Invitation Code" /></AuthInput>
      <p className="pl-1 text-[10px] text-muted-foreground">Demo codes: PB50RK, POWER100, WELCOME26, DEMO2026</p>
      <label className="flex items-start gap-2 py-1 text-[11px] leading-relaxed text-foreground">
        <input type="checkbox" checked={v.agree} onChange={e => setV({ ...v, agree: e.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" />
        <span>I agree to the <button type="button" className="font-bold text-primary underline-offset-2 hover:underline" onClick={() => toast("Terms & Conditions: this is a prototype; no financial services are offered.")}>Terms & Conditions</button> and <button type="button" className="font-bold text-primary underline-offset-2 hover:underline" onClick={() => toast("Privacy Policy: demo data stays in your browser and resets on refresh.")}>Privacy Policy</button>.</span>
      </label>{err.agree && <p className="-mt-2 pl-6 text-[11px] text-destructive">{err.agree}</p>}
      <PrimaryButton type="submit">{busy ? <><Loader2 className="animate-spin" />Creating account…</> : "Sign Up"}</PrimaryButton>
    </form>
    <SwitchLink text="Already have an account?" to="/login" label="Log In" />
  </AuthLayout>;
}
