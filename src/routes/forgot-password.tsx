import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, Phone } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AuthLayout, PrimaryButton } from "@/components/pb/auth";
import { meta } from "@/components/pb/shell";
import { Button } from "@/components/ui/button";
import { api, apiConfigured, errMessage } from "@/lib/api";
import { AuthInput, Eyes } from "./signup";

export const Route = createFileRoute("/forgot-password")({
  head: () => meta("Forgot Password", "Recover your PowerBank account with mobile SMS verification and set a new password."),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [mobile, setMobile] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(n => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    if (busy || resendIn > 0) return;
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError("Enter a valid 10-digit Indian mobile number"); return; }
    setBusy(true); setError("");
    try {
      const result = await api.post<{ resendIn: number }>("/auth/reset/start", { mobile });
      setSent(true); setCode(""); setResendIn(result.resendIn);
    } catch (e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!sent) { await sendCode(); return; }
    if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit SMS code"); return; }
    if (password.length < 6 || password.length > 72) { setError("Password must be 6–72 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setBusy(true); setError("");
    try {
      await api.post("/auth/reset/verify", { mobile, code, password, confirm });
      setPassword(""); setConfirm(""); setCode(""); setDone(true);
    } catch (e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  };

  return <AuthLayout title={done ? "Password Updated" : "Forgot Password?"} subtitle={done ? "Your account is ready to sign in again." : "Recover your account securely"}>
    {done ? <div className="space-y-5 text-center" role="status">
      <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Your password has been updated.</p>
      <Button asChild className="pb-primary-button"><Link to="/login">Log In</Link></Button>
    </div> : <form noValidate className="space-y-3" onSubmit={e => void submit(e)}>
      <AuthInput icon={<Phone className="pb-field-icon" />}><span className="pb-country">+91</span><input value={mobile} disabled={sent || busy} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national" placeholder="Registered mobile number" aria-label="Mobile Number" /></AuthInput>
      {sent && <>
        <p className="px-1 text-xs text-muted-foreground" role="status">If an account exists for +91 {mobile}, an SMS code has been sent.</p>
        <AuthInput icon={<KeyRound className="pb-field-icon" />}><input value={code} disabled={busy} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit SMS code" aria-label="SMS Code" /></AuthInput>
        <AuthInput icon={<Lock className="pb-field-icon" />} toggle={<Eyes show={show} set={setShow} />}><input type={show ? "text" : "password"} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} maxLength={72} autoComplete="new-password" placeholder="New password" aria-label="New Password" /></AuthInput>
        <AuthInput icon={<Lock className="pb-field-icon" />} toggle={<Eyes show={showConfirm} set={setShowConfirm} />}><input type={showConfirm ? "text" : "password"} disabled={busy} value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={72} autoComplete="new-password" placeholder="Confirm new password" aria-label="Confirm Password" /></AuthInput>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="link" className="h-auto px-1 text-xs" disabled={busy || resendIn > 0} onClick={() => void sendCode()}>{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}</Button>
          <Button type="button" variant="link" className="h-auto px-1 text-xs" disabled={busy} onClick={() => { setSent(false); setCode(""); setPassword(""); setConfirm(""); setError(""); }}>Change number</Button>
        </div>
      </>}
      {!apiConfigured() && <p className="text-xs text-muted-foreground">Password recovery is unavailable in demo mode.</p>}
      {error && <p role="alert" className="px-1 text-xs font-medium text-destructive">{error}</p>}
      <PrimaryButton type="submit" disabled={busy || !apiConfigured() || (!sent && resendIn > 0)}>{busy ? <><Loader2 className="animate-spin" />Please wait…</> : sent ? "Reset Password" : "Send SMS Code"}</PrimaryButton>
    </form>}
    {!done && <div className="mt-4 flex justify-center"><Button asChild variant="link"><Link to="/login"><ArrowLeft className="h-4 w-4" />Back to Log In</Link></Button></div>}
  </AuthLayout>;
}