import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Info, KeyRound, Loader2, Lock, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, PrimaryButton, SwitchLink } from "@/components/pb/auth";
import { meta } from "@/components/pb/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDemo } from "@/lib/demo-store";
import { api, apiConfigured, errMessage, type ApiUser } from "@/lib/api";
import { AuthInput, Eyes } from "./signup";

export const Route = createFileRoute("/login")({ head: () => meta("Log In", "Sign in to your PowerBank account."), component: Login });
function Login() {
  const nav = useNavigate(); const d = useDemo();
  const [mobile, setMobile] = useState(""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false); const [remember, setRemember] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  return <AuthLayout title="Welcome Back to PowerBank" subtitle="Sign in to continue earning">
    {!apiConfigured() && <p className="mb-3 flex items-start gap-2 rounded-xl bg-warning/15 p-2.5 text-[11px]"><Info className="h-4 w-4 shrink-0 text-orange" /><span>Simulated sign-in — no real account. Try <b>9876543210</b> / <b>demo123</b>, or sign up.</span></p>}
    <form noValidate className="space-y-3" onSubmit={e => { e.preventDefault();
      if (!/^\d{10}$/.test(mobile) || !pw) { setErr("Enter your 10-digit mobile number and password"); return; }
      if (apiConfigured()) { setBusy(true); setErr("");
        api.post<{ user: ApiUser }>("/auth/login", { mobile, password: pw, remember }).then(r => { d.setApiUser(r.user); toast.success(`Welcome back, ${r.user.name}!`); nav({ to: "/dashboard" }); },
          (e: unknown) => { const m = errMessage(e); setErr(m); toast.error(m); }).finally(() => setBusy(false)); return; }
      setBusy(true); setTimeout(() => { const r = d.login(mobile, pw); setBusy(false); if (r) { setErr(r); toast.error(r); return; } toast.success(remember ? "Signed in (demo) — remembered until refresh" : "Signed in (demo)"); nav({ to: "/dashboard" }); }, 500); }}>
      <AuthInput icon={<Phone className="pb-field-icon" />}><span className="pb-country">+91<ChevronDown /></span><input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="Mobile Number" aria-label="Mobile Number" /></AuthInput>
      <AuthInput icon={<Lock className="pb-field-icon" />} toggle={<Eyes show={show} set={setShow} />}><input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" aria-label="Password" /></AuthInput>
      {err && <p className="pl-2 text-[11px] font-medium text-destructive">{err}</p>}
      <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 accent-primary" />Remember Me</label><button type="button" onClick={() => { if (apiConfigured()) setResetOpen(true); else toast("Password reset is simulated in this prototype. Use demo123."); }} className="font-semibold text-primary-deep">Forgot Password?</button></div>
      <PrimaryButton type="submit">{busy ? <><Loader2 className="animate-spin" />Signing in…</> : "Log In"}</PrimaryButton>
    </form>
    <SwitchLink text="Don't have an account?" to="/signup" label="Create Account" />
    <p className="mt-2 text-center text-xs"><Link to="/admin" className="font-semibold text-primary">Open Admin Panel →</Link></p>
    <ResetPasswordDialog open={resetOpen} initialMobile={mobile} onClose={() => setResetOpen(false)} />
  </AuthLayout>;
}

function ResetPasswordDialog({ open, initialMobile, onClose }: { open: boolean; initialMobile: string; onClose: () => void }) {
  const [mobile, setMobile] = useState(initialMobile);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) { setErr("Enter a valid 10-digit Indian mobile number"); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/auth/reset/start", { mobile });
      setSent(true);
      toast.success(`If an account exists for +91 ${mobile}, a 6-digit SMS code was sent.`);
    } catch (e) { const m = errMessage(e); setErr(m); toast.error(m); }
    finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sent) { await start(); return; }
    if (!/^\d{6}$/.test(code)) { setErr("Enter the 6-digit SMS code"); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setErr("Passwords do not match"); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/auth/reset/verify", { mobile, code, password, confirm });
      toast.success("Password updated. Please log in with your new password.");
      setSent(false); setCode(""); setPassword(""); setConfirm(""); onClose();
    } catch (e) { const m = errMessage(e); setErr(m); toast.error(m); }
    finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={o => { if (!o) { setSent(false); setErr(""); onClose(); } }}>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>Verify your mobile number with a 6-digit SMS code to set a new password.</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={e => void verify(e)}>
        <AuthInput icon={<Phone className="pb-field-icon" />}><span className="pb-country">+91</span><input value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setSent(false); }} inputMode="numeric" placeholder="Mobile Number" aria-label="Reset Mobile Number" /></AuthInput>
        {sent && <>
          <AuthInput icon={<KeyRound className="pb-field-icon" />}><input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit SMS code" aria-label="Reset SMS Code" /></AuthInput>
          <AuthInput icon={<Lock className="pb-field-icon" />}><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" aria-label="New password" /></AuthInput>
          <AuthInput icon={<Lock className="pb-field-icon" />}><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" aria-label="Confirm new password" /></AuthInput>
          <button type="button" disabled={busy} onClick={() => void start()} className="text-xs font-semibold text-primary">Resend code</button>
        </>}
        {err && <p className="text-xs font-medium text-destructive">{err}</p>}
        <Button type="submit" className="w-full rounded-full" disabled={busy}>{busy ? "Please wait…" : sent ? "Reset Password" : "Send SMS Code"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
