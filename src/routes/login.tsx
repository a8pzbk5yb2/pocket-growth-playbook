import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Info, Loader2, Lock, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, PrimaryButton, SwitchLink } from "@/components/pb/auth";
import { meta } from "@/components/pb/shell";
import { useDemo } from "@/lib/demo-store";
import { AuthInput, Eyes } from "./signup";

export const Route = createFileRoute("/login")({ head: () => meta("Log In", "Sign in to your PowerBank demo account."), component: Login });
function Login() {
  const nav = useNavigate(); const d = useDemo();
  const [mobile, setMobile] = useState(""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false); const [remember, setRemember] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  return <AuthLayout title="Welcome Back to PowerBank" subtitle="Sign in to continue earning">
    <p className="mb-3 flex items-start gap-2 rounded-xl bg-warning/15 p-2.5 text-[11px]"><Info className="h-4 w-4 shrink-0 text-orange" /><span>Simulated sign-in — no real account. Try <b>9876543210</b> / <b>demo123</b>, or sign up.</span></p>
    <form noValidate className="space-y-3" onSubmit={e => { e.preventDefault();
      if (!/^\d{10}$/.test(mobile) || !pw) { setErr("Enter your 10-digit mobile number and password"); return; }
      setBusy(true); setTimeout(() => { const r = d.login(mobile, pw); setBusy(false); if (r) { setErr(r); toast.error(r); return; } toast.success(remember ? "Signed in (demo) — remembered until refresh" : "Signed in (demo)"); nav({ to: "/dashboard" }); }, 500); }}>
      <AuthInput icon={<Phone className="pb-field-icon" />}><span className="pb-country">+91<ChevronDown /></span><input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="Mobile Number" aria-label="Mobile Number" /></AuthInput>
      <AuthInput icon={<Lock className="pb-field-icon" />} toggle={<Eyes show={show} set={setShow} />}><input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" aria-label="Password" /></AuthInput>
      {err && <p className="pl-2 text-[11px] font-medium text-destructive">{err}</p>}
      <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 accent-primary" />Remember Me</label><button type="button" onClick={() => toast("Password reset is simulated in this prototype. Use demo123.")} className="font-semibold text-primary-deep">Forgot Password?</button></div>
      <PrimaryButton type="submit">{busy ? <><Loader2 className="animate-spin" />Signing in…</> : "Log In"}</PrimaryButton>
    </form>
    <SwitchLink text="Don't have an account?" to="/signup" label="Create Account" />
    <p className="mt-2 text-center text-xs"><Link to="/admin" className="font-semibold text-primary">Open Admin Panel (demo) →</Link></p>
  </AuthLayout>;
}
