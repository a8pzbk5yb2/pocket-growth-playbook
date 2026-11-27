import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meta } from "@/components/pb/shell";
import { Section, Table } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiActivityLog } from "@/lib/api";
import { fmtDate } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/settings")({ head: () => meta("Settings", "PowerBank platform settings and activity logs."), component: SettingsPage });
function Toggle({ label, def = false }: { label: string; def?: boolean }) { const [v, setV] = useState(def); return <label className="flex items-center justify-between rounded-xl border p-3 text-sm">{label}<Switch checked={v} onCheckedChange={x => { setV(x); toast(`${label}: ${x ? "on" : "off"} (prototype control)`); }} /></label>; }
function F({ label, def, type = "text" }: { label: string; def: string; type?: string }) { return <div><Label>{label}</Label><Input type={type} defaultValue={def} /></div>; }

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

  return <Section title="Settings" icon={Settings} action={<span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold">{real ? "Live MySQL settings" : "Prototype controls"}</span>}>
    <Tabs defaultValue="general"><TabsList className="mb-4 flex h-auto flex-wrap"><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="appearance">Appearance</TabsTrigger><TabsTrigger value="security">{real ? "Security & Activity Log" : "Security"}</TabsTrigger><TabsTrigger value="system">System</TabsTrigger></TabsList>
      <TabsContent value="general">
        {real ? <form onSubmit={e => void saveGeneral(e)} className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <div><Label>Platform Name</Label><Input value={siteName} onChange={e => setSiteName(e.target.value)} /></div>
          <div><Label>Logo text</Label><Input value={logoText} onChange={e => setLogoText(e.target.value)} /></div>
          <div><Label>Support Contact</Label><Input value={supportContact} onChange={e => setSupportContact(e.target.value)} /></div>
          <div><Label>Website</Label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} /></div>
          <div><Label>Policy Version</Label><Input value={policyVersion} onChange={e => setPolicyVersion(e.target.value)} /></div>
          <div className="flex items-end"><Button disabled={busy} className="w-40">{busy ? "Saving…" : "Save"}</Button></div>
        </form>
          : <form onSubmit={e => void saveGeneral(e)} className="grid max-w-2xl gap-3 sm:grid-cols-2"><F label="Platform Name" def="PowerBank" /><F label="Logo text" def="⚡ PowerBank" /><F label="Support Contact" def="support@powerbank.example" /><F label="Website" def="https://powerbank.example" /><Button className="sm:col-span-2 sm:w-40">Save</Button></form>}
      </TabsContent>
      <TabsContent value="appearance"><div className="grid max-w-2xl gap-3"><Toggle label="Dark sidebar" def /><Toggle label="Compact tables" /><Toggle label="Show DEMO labels" def /><div className="flex gap-2">{["bg-primary", "bg-forest", "bg-lime"].map(c => <span key={c} className={`h-10 w-10 rounded-xl ${c}`} />)}<span className="self-center text-xs text-muted-foreground">Brand colors</span></div></div></TabsContent>
      <TabsContent value="security"><div className="grid max-w-3xl gap-4">
        {real ? <>
          <form onSubmit={e => void changeAdminPw(e)} className="grid gap-3 sm:grid-cols-3">
            <div><Label>Current password</Label><Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} /></div>
            <div><Label>New password</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
            <div><Label>Confirm new password</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} /></div>
            <Button disabled={busy} className="sm:w-48">{busy ? "Updating…" : "Update Admin Password"}</Button>
          </form>
          <div>
            <h3 className="mb-2 text-sm font-bold">Admin Activity Log</h3>
            <Table empty={!logsQ.data?.items.length} head={["Date","Admin","Action","Target","IP"]}>{(logsQ.data?.items ?? []).map(l => <tr key={l.id}><td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.date, true)}</td><td className="px-3 font-medium">{l.admin}</td><td className="px-3 font-mono text-xs">{l.action}</td><td className="px-3 text-xs text-muted-foreground">{l.targetType ? `${l.targetType}${l.targetId ? ` #${l.targetId}` : ""}` : "—"}</td><td className="px-3 text-xs text-muted-foreground">{l.ip}</td></tr>)}</Table>
            {logsQ.data && <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Total {logsQ.data.total} events</span><div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} aria-label="Previous"><ChevronLeft /></Button><span className="px-2">{logPage} / {logTotalPages}</span><Button variant="outline" size="icon" className="h-8 w-8" disabled={logPage >= logTotalPages} onClick={() => setLogPage(p => p + 1)} aria-label="Next"><ChevronRight /></Button></div></div>}
          </div>
        </> : <>
          <form onSubmit={e => void saveGeneral(e)} className="grid gap-3 sm:grid-cols-2"><F label="Admin name" def="Admin User" /><F label="Admin email" def="admin@powerbank.example" /><F label="Current password" def="" type="password" /><F label="New password" def="" type="password" /><Button className="sm:w-48">Update (UI only)</Button></form><Toggle label="Two-factor authentication (UI only)" />
          <Table head={["Login history (demo)", "Device", "Location"]}>{[["25 Nov 2026, 09:12", "Chrome · Windows", "Mumbai (sample)"], ["24 Nov 2026, 18:40", "Safari · iPhone", "Pune (sample)"], ["23 Nov 2026, 10:05", "Chrome · macOS", "Delhi (sample)"]].map(r => <tr key={r[0]}>{r.map(c => <td key={c} className="px-3 py-2.5">{c}</td>)}</tr>)}</Table>
        </>}
      </div></TabsContent>
      <TabsContent value="system"><div className="grid max-w-2xl gap-3">
        {real ? <>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">Registration open<Switch disabled={savingToggle || settQ.isPending || settQ.isError} checked={regOpen} onCheckedChange={v => void saveToggle("registration_open", v)} /></label>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">Maintenance mode<Switch disabled={savingToggle || settQ.isPending || settQ.isError} checked={maint} onCheckedChange={v => void saveToggle("maintenance_mode", v)} /></label>
        </> : <><Toggle label="Email notification preference" def /><Toggle label="Push notification preference" def /><Toggle label="Maintenance mode (UI only)" /></>}
      </div></TabsContent>
    </Tabs>
  </Section>;
}
