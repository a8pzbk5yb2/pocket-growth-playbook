import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CreditCard, Globe, History, IndianRupee, Info as Info2, LayoutGrid, Lock, Mail, Save, Server, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import laptop from "@/assets/powerbank-home.webp.asset.json";
import wallet from "@/assets/pb-wallet.webp.asset.json";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { meta } from "@/components/pb/shell";
import { Section, Table } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiActivityLog } from "@/lib/api";
import { fmtDate } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/settings")({ head: () => meta("Settings", "PowerBank platform settings and activity logs."), component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient(); const real = apiConfigured();
  const [logPage, setLogPage] = useState(1);
  const settQ = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.get<{ settings: Record<string, string> }>("/admin/settings"), enabled: real, staleTime: 30_000 });
  const logsQ = useQuery({ queryKey: ["admin-activity-logs", logPage], queryFn: () => api.get<{ items: ApiActivityLog[]; total: number; page: number; perPage: number }>(`/admin/activity-logs?page=${logPage}&perPage=10`), enabled: real, staleTime: 15_000 });

  const [siteName, setSiteName] = useState("PowerBank");
  const [logoText, setLogoText] = useState("⚡ PowerBank");
  const [supportContact, setSupportContact] = useState("support@powerbank.example");
  const [websiteUrl, setWebsiteUrl] = useState("https://powerbank.example");
  const [policyVersion, setPolicyVersion] = useState("2026-11");
  const [regOpen, setRegOpen] = useState(true);
  const [maint, setMaint] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = settQ.data?.settings;
    if (!s) return;
    if (s["site_name"]) setSiteName(s["site_name"]);
    if (s["logo_text"]) setLogoText(s["logo_text"]);
    if (s["support_contact"]) setSupportContact(s["support_contact"]);
    if (s["website_url"]) setWebsiteUrl(s["website_url"]);
    if (s["policy_version"]) setPolicyVersion(s["policy_version"]);
    if (s["registration_open"] !== undefined) setRegOpen(s["registration_open"] === "1");
    if (s["maintenance_mode"] !== undefined) setMaint(s["maintenance_mode"] === "1");
  }, [settQ.data]);

  const saveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!real) { toast.success("Saved locally — prototype controls don't change any real service"); return; }
    setBusy(true);
    try {
      await api.put("/admin/settings", { site_name: siteName.trim(), logo_text: logoText.trim(), support_contact: supportContact.trim(), website_url: websiteUrl.trim(), policy_version: policyVersion.trim() });
      void qc.invalidateQueries({ queryKey: ["admin-settings"] }); void qc.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Platform settings saved");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  const saveToggle = async (key: "registration_open" | "maintenance_mode", val: boolean) => {
    if (!real) return;
    setSavingToggle(true);
    try {
      const result = await api.put<{ settings: Record<string, string> }>("/admin/settings", { [key]: val });
      qc.setQueryData(["admin-settings"], result);
      if (key === "registration_open") setRegOpen(result.settings[key] === "1"); else setMaint(result.settings[key] === "1");
      void qc.invalidateQueries({ queryKey: ["platform-status"] });
      void qc.invalidateQueries({ queryKey: ["admin-settings"] }); void qc.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Setting updated");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setSavingToggle(false); }
  };

  const changeAdminPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!real) { toast.success("Saved locally — prototype controls don't change any real service"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      await api.post("/admin/auth/change-password", { currentPassword: curPw, newPassword: newPw, confirm: confirmPw });
      setCurPw(""); setNewPw(""); setConfirmPw("");
      void qc.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Admin password updated");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  const logTotalPages = logsQ.data ? Math.max(1, Math.ceil(logsQ.data.total / logsQ.data.perPage)) : 1;

  return <>
    <div className="relative overflow-hidden rounded-2xl bg-banner-gradient p-5 text-primary-foreground shadow-soft md:p-6">
      <div className="flex items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15"><Settings className="h-9 w-9" strokeWidth={2.4} /></span>
        <div className="min-w-0"><h2 className="text-2xl font-extrabold md:text-3xl">Platform Settings</h2><p className="text-primary-foreground/90">Configure your platform, manage features and preferences.</p></div>
        <ShieldCheck className="ml-auto hidden h-20 w-20 shrink-0 fill-primary-foreground/20 text-lime md:block" strokeWidth={1.8} /></div>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="General Settings" icon={LayoutGrid} art={<img src={laptop.url} alt="" className="h-32 object-contain" />} action={<SaveBtn form="general-form" busy={busy} />}>
        <form id="general-form" onSubmit={e => void saveGeneral(e)} className="space-y-2">
          <Row label="Platform Name"><Input value={siteName} onChange={e => setSiteName(e.target.value)} /></Row>
          <Row label="Logo Text"><Input value={logoText} onChange={e => setLogoText(e.target.value)} /></Row>
          <Row label="Site URL"><IconInput icon={Globe}><Input className="pl-9" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} /></IconInput></Row>
          <Row label="Support Contact"><IconInput icon={Mail}><Input className="pl-9" value={supportContact} onChange={e => setSupportContact(e.target.value)} /></IconInput></Row>
          <Row label="Policy Version"><Input value={policyVersion} onChange={e => setPolicyVersion(e.target.value)} /></Row>
        </form>
      </Card>
      <Card title="Payment Settings" icon={CreditCard} art={<img src={wallet.url} alt="" className="h-32 object-contain" />} action={<span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">Server config</span>}>
        <div className="space-y-2">
          <Row label="Payment Gateway"><Info>MXPay</Info></Row>
          <Row label="API Key & Channel"><Info icon={Lock}>Set in server config.php</Info></Row>
          <Row label="Min Withdrawal"><Info icon={IndianRupee}>100</Info></Row>
          <Row label="Withdrawal Limit"><Info>Up to available balance</Info></Row>
        </div>
      </Card>
      <Card title="Security Settings" icon={ShieldCheck} art={<ShieldCheck className="h-28 w-28 fill-primary/15 text-primary" strokeWidth={1.6} />} action={<SaveBtn form="pw-form" busy={busy} label="Update" />}>
        <form id="pw-form" onSubmit={e => void changeAdminPw(e)} className="space-y-2">
          <Row label="Current Password"><IconInput icon={Lock}><Input className="pl-9" type="password" value={curPw} onChange={e => setCurPw(e.target.value)} /></IconInput></Row>
          <Row label="New Password"><IconInput icon={Lock}><Input className="pl-9" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} /></IconInput></Row>
          <Row label="Confirm Password"><IconInput icon={Lock}><Input className="pl-9" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} /></IconInput></Row>
        </form>
      </Card>
      <Card title="Other Settings" icon={Info2} art={<Server className="h-28 w-28 fill-primary/10 text-primary-deep" strokeWidth={1.6} />}>
        <div className="space-y-3">
          <Row label="Maintenance Mode"><span className="flex items-center gap-3 text-sm text-muted-foreground"><Switch disabled={real && (savingToggle || settQ.isPending || settQ.isError)} checked={maint} onCheckedChange={v => { if (real) void saveToggle("maintenance_mode", v); else { setMaint(v); toast(`Maintenance ${v ? "on" : "off"} (prototype)`); } }} />Enable maintenance mode</span></Row>
          <Row label="Registration"><span className="flex items-center gap-3 text-sm text-muted-foreground"><Switch disabled={real && (savingToggle || settQ.isPending || settQ.isError)} checked={regOpen} onCheckedChange={v => { if (real) void saveToggle("registration_open", v); else setRegOpen(v); }} />Allow new sign ups</span></Row>
          <Row label="Platform Status"><span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${maint ? "bg-warning/20 text-orange" : "bg-success/15 text-success"}`}>{maint ? "Maintenance" : "Online"}</span></Row>
        </div>
      </Card>
    </div>
    {real && <Section title="Admin Activity Log" icon={History}>
      <Table empty={!logsQ.data?.items.length} head={["Date","Admin","Action","Target","IP"]}>{(logsQ.data?.items ?? []).map(l => <tr key={l.id}><td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.date, true)}</td><td className="px-3 font-medium">{l.admin}</td><td className="px-3 font-mono text-xs">{l.action}</td><td className="px-3 text-xs text-muted-foreground">{l.targetType ? `${l.targetType}${l.targetId ? ` #${l.targetId}` : ""}` : "—"}</td><td className="px-3 text-xs text-muted-foreground">{l.ip}</td></tr>)}</Table>
      {logsQ.data && <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Total {logsQ.data.total} events</span><div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} aria-label="Previous"><ChevronLeft /></Button><span className="px-2">{logPage} / {logTotalPages}</span><Button variant="outline" size="icon" className="h-8 w-8" disabled={logPage >= logTotalPages} onClick={() => setLogPage(p => p + 1)} aria-label="Next"><ChevronRight /></Button></div></div>}
    </Section>}
  </>;
}

function Card({ title, icon: Icon, art, action, children }: { title: string; icon: LucideIcon; art: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="panel-card overflow-hidden p-0">
    <div className="flex items-center justify-between gap-2 bg-forest-gradient px-4 py-3 text-primary-foreground"><h2 className="flex min-w-0 items-center gap-2.5 truncate text-lg font-bold"><Icon className="h-6 w-6 shrink-0" strokeWidth={2.4} />{title}</h2>{action}</div>
    <div className="grid gap-4 p-4 sm:grid-cols-[150px_minmax(0,1fr)]"><div className="hidden place-items-center rounded-2xl bg-primary/5 sm:grid">{art}</div><div className="min-w-0">{children}</div></div>
  </section>;
}
function Row({ label, children }: { label: string; children: ReactNode }) { return <div className="grid items-center gap-1 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3"><Label className="text-sm font-semibold">{label}</Label>{children}</div>; }
function IconInput({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) { return <div className="relative"><Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />{children}</div>; }
function Info({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) { return <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">{Icon && <Icon className="h-4 w-4 text-primary" />}{children}</div>; }
function SaveBtn({ form, busy, label = "Save Changes" }: { form: string; busy: boolean; label?: string }) { return <button type="submit" form={form} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-60"><Save className="h-4 w-4" />{busy ? "Saving…" : label}</button>; }
