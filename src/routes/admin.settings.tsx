import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meta } from "@/components/pb/shell";
import { Section, Table } from "@/components/panel/ui";

export const Route = createFileRoute("/admin/settings")({ head: () => meta("Settings", "Prototype-only PowerBank platform settings."), component: SettingsPage });
function Toggle({ label, def = false }: { label: string; def?: boolean }) { const [v, setV] = useState(def); return <label className="flex items-center justify-between rounded-xl border p-3 text-sm">{label}<Switch checked={v} onCheckedChange={x => { setV(x); toast(`${label}: ${x ? "on" : "off"} (prototype control)`); }} /></label>; }
function F({ label, def, type = "text" }: { label: string; def: string; type?: string }) { return <div><Label>{label}</Label><Input type={type} defaultValue={def} /></div>; }
function SettingsPage() {
  const save = (e: React.FormEvent) => { e.preventDefault(); toast.success("Saved locally — prototype controls don't change any real service"); };
  return <Section title="Settings" icon={Settings} action={<span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold">Prototype controls</span>}>
    <Tabs defaultValue="general"><TabsList className="mb-4 flex h-auto flex-wrap"><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="appearance">Appearance</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger><TabsTrigger value="system">System</TabsTrigger></TabsList>
      <TabsContent value="general"><form onSubmit={save} className="grid max-w-2xl gap-3 sm:grid-cols-2"><F label="Platform Name" def="PowerBank" /><F label="Logo text" def="⚡ PowerBank" /><F label="Support Contact" def="support@powerbank.example" /><F label="Website" def="https://powerbank.example" /><Button className="sm:col-span-2 sm:w-40">Save</Button></form></TabsContent>
      <TabsContent value="appearance"><div className="grid max-w-2xl gap-3"><Toggle label="Dark sidebar" def /><Toggle label="Compact tables" /><Toggle label="Show DEMO labels" def /><div className="flex gap-2">{["bg-primary", "bg-forest", "bg-lime"].map(c => <span key={c} className={`h-10 w-10 rounded-xl ${c}`} />)}<span className="self-center text-xs text-muted-foreground">Brand colors</span></div></div></TabsContent>
      <TabsContent value="security"><div className="grid max-w-2xl gap-4"><form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><F label="Admin name" def="Admin User" /><F label="Admin email" def="admin@powerbank.example" /><F label="Current password" def="" type="password" /><F label="New password" def="" type="password" /><Button className="sm:w-48">Update (UI only)</Button></form><Toggle label="Two-factor authentication (UI only)" />
        <Table head={["Login history (demo)", "Device", "Location"]}>{[["25 Nov 2026, 09:12", "Chrome · Windows", "Mumbai (sample)"], ["24 Nov 2026, 18:40", "Safari · iPhone", "Pune (sample)"], ["23 Nov 2026, 10:05", "Chrome · macOS", "Delhi (sample)"]].map(r => <tr key={r[0]}>{r.map(c => <td key={c} className="px-3 py-2.5">{c}</td>)}</tr>)}</Table></div></TabsContent>
      <TabsContent value="system"><div className="grid max-w-2xl gap-3"><Toggle label="Email notification preference" def /><Toggle label="Push notification preference" def /><Toggle label="Maintenance mode (UI only)" /></div></TabsContent>
    </Tabs>
  </Section>;
}
