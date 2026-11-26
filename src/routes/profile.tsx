import { SignedIn } from "@/components/pb/signed-in";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MobileShell, PageBar, meta } from "@/components/pb/shell";
import { BankAccountsManager } from "@/components/panel/bank-accounts";
import { Avatar, Section, Status } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiBankAccount, type ApiDashboard, type ApiTransaction, type ApiUser, type ApiWallet } from "@/lib/api";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/profile")({ head: () => meta("My Profile", "Edit your PowerBank profile and preferences."), component: () => <SignedIn title="Profile & Password"><P /></SignedIn> });
function P() {
  const { d, me } = useMe(); const qc = useQueryClient();
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: real, staleTime: 30_000 });
  const walletQ = useQuery({ queryKey: ["me-wallet"], queryFn: () => api.get<{ wallet: ApiWallet; bankAccounts: ApiBankAccount[]; recentTransactions: ApiTransaction[] }>("/me/wallet"), enabled: real, staleTime: 15_000 });
  const [name, setName] = useState(me.name); const [displayName, setDisplayName] = useState(me.name); const [city, setCity] = useState("");
  const [curPw, setCurPw] = useState(""); const [pw, setPw] = useState("");
  const [notifyPush, setNotifyPush] = useState(true); const [notifySms, setNotifySms] = useState(false); const [language, setLanguage] = useState<"en" | "hi">("en");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setName(q.data.user.name);
    setDisplayName(q.data.profile.displayName || q.data.user.name);
    setCity(q.data.profile.city || "");
    setNotifyPush(q.data.settings.notifyPush);
    setNotifySms(q.data.settings.notifySms);
    setLanguage(q.data.settings.language);
  }, [q.data]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (pw && pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!real) {
      d.updateUser(me.id, { name: name.trim(), ...(pw ? { password: pw } : {}) });
      setPw(""); toast.success("Profile updated (demo)"); return;
    }
    setBusy(true);
    try {
      const r = await api.put<{ user: ApiUser }>("/me/profile", {
        name: name.trim(), displayName: displayName.trim() || name.trim(), city: city.trim(),
        ...(pw ? { currentPassword: curPw, newPassword: pw } : {}),
      });
      d.setApiUser(r.user); setCurPw(""); setPw("");
      void qc.invalidateQueries({ queryKey: ["me-dashboard"] });
      toast.success("Profile updated");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  const saveSettings = async (next: { notifyPush: boolean; notifySms: boolean; language: "en" | "hi" }) => {
    setNotifyPush(next.notifyPush); setNotifySms(next.notifySms); setLanguage(next.language);
    if (!real) return;
    try {
      await api.put("/me/settings", next);
      void qc.invalidateQueries({ queryKey: ["me-dashboard"] });
      toast.success("Preferences saved");
    } catch (er) { toast.error(errMessage(er)); }
  };

  return <MobileShell><header className="pb-green-header"><PageBar title="Profile & Password" backTo="/me" /></header><main className="pb-content space-y-4">
    <Section title="My Profile" icon={User}><div className="mb-4 flex items-center gap-4"><Avatar name={me.name} size="h-16 w-16 text-lg" /><div><p className="text-lg font-bold">{me.name}</p><p className="text-sm text-muted-foreground">User ID {me.id} · +91 {me.mobile}</p><div className="mt-1 flex gap-2"><Status s={me.status} />{!real && <Status s={me.kyc} />}</div></div></div>
      <form className="grid max-w-xl gap-3" onSubmit={e => void saveProfile(e)}>
        <div><Label>Full Name</Label><Input value={name} maxLength={60} onChange={e => setName(e.target.value)} /></div>
        {real && <>
          <div><Label>Display Name</Label><Input value={displayName} maxLength={80} onChange={e => setDisplayName(e.target.value)} /></div>
          <div><Label>City</Label><Input value={city} maxLength={80} onChange={e => setCity(e.target.value)} placeholder="Optional" /></div>
          {pw && <div><Label>Current password (required to set new password)</Label><Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} /></div>}
        </>}
        <div><Label>New password (optional)</Label><Input type="password" value={pw} onChange={e => setPw(e.target.value)} /></div>
        <Button className="w-full rounded-full" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </form>
    </Section>
    {real && <Section title="Preferences"><div className="grid max-w-xl gap-3">
      <label className="flex items-center justify-between rounded-xl border p-3 text-sm">Push notifications<Switch checked={notifyPush} onCheckedChange={v => void saveSettings({ notifyPush: v, notifySms, language })} /></label>
      <label className="flex items-center justify-between rounded-xl border p-3 text-sm">SMS notifications<Switch checked={notifySms} onCheckedChange={v => void saveSettings({ notifyPush, notifySms: v, language })} /></label>
      <div className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>Language</span><select className="h-9 rounded-lg border bg-card px-3" value={language} onChange={e => void saveSettings({ notifyPush, notifySms, language: e.target.value as "en" | "hi" })}><option value="en">English</option><option value="hi">Hindi</option></select></div>
    </div></Section>}
    {real && <Section title="Bank Accounts" icon={Landmark}><BankAccountsManager accounts={walletQ.data?.bankAccounts ?? []} /></Section>}
  </main></MobileShell>;
}
