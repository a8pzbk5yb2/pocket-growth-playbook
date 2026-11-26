import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { meta } from "@/components/pb/shell";
import { Section, Status, Table, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiAdminNotification, type ApiAdminUsersPage } from "@/lib/api";
import { fmtDate, useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/notifications")({ head: () => meta("Notifications", "Send notifications to PowerBank users."), component: Notes });
function Notes() {
  const d = useDemo(); const qc = useQueryClient();
  const real = apiConfigured();
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all"); const [sel, setSel] = useState<string[]>([]); const [busy, setBusy] = useState(false);

  const notesQ = useQuery({ queryKey: ["admin-notifications"], queryFn: () => api.get<{ notifications: ApiAdminNotification[] }>("/admin/notifications"), enabled: real, staleTime: 20_000 });
  const usersQ = useQuery({ queryKey: ["admin-users-pick"], queryFn: () => api.get<ApiAdminUsersPage>("/admin/users?perPage=100"), enabled: real && mode === "selected", staleTime: 60_000 });

  const items = real ? (notesQ.data?.notifications ?? []).map(n => ({
    id: n.id, title: n.title, body: n.body, audienceLabel: n.audience === "all" ? "All users" : (n.targetUser?.name ?? "User"), date: n.date, readCount: n.readCount, adminRead: true,
  })) : d.notifications.map(n => ({
    id: n.id, title: n.title, body: n.body, audienceLabel: n.to === "all" ? "All users" : `${n.to.length} selected`, date: n.date, readCount: n.readBy.filter(x => x !== "admin").length, adminRead: n.readBy.includes("admin"),
  }));
  const { slice, pager } = usePaged(items, 6);
  const pickUsers = real ? (usersQ.data?.items ?? []) : [...d.users].reverse();

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Title and message are required"); return; }
    if (mode === "selected" && !sel.length) { toast.error("Select at least one user"); return; }
    if (!real) {
      setBusy(true); setTimeout(() => { d.notify(title.trim(), body.trim(), mode === "all" ? "all" : sel); setBusy(false); setTitle(""); setBody(""); setSel([]); toast.success("Demo notification sent"); }, 500);
      return;
    }
    setBusy(true);
    try {
      await api.post("/admin/notifications", { title: title.trim(), body: body.trim(), audience: mode, ...(mode === "selected" ? { userIds: sel } : {}) });
      setTitle(""); setBody(""); setSel([]);
      void qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("Notification sent");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  return <div className="grid gap-4 xl:grid-cols-3">
    <Section title={real ? "Send Notification" : "Send Demo Notification"} icon={Send}><div className="space-y-3"><div><Label>Title</Label><Input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></div><div><Label>Message</Label><Textarea value={body} maxLength={1000} onChange={e => setBody(e.target.value)} /></div>
      <div className="flex gap-2">{(["all", "selected"] as const).map(m => <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${mode === m ? "border-primary bg-secondary text-primary-deep" : ""}`}>{m === "all" ? "All users" : "Selected users"}</button>)}</div>
      {mode === "selected" && <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">{pickUsers.map(u => <label key={u.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={sel.includes(u.id)} onChange={e => setSel(e.target.checked ? [...sel, u.id] : sel.filter(x => x !== u.id))} />{u.name} <span className="text-xs text-muted-foreground">{u.id}</span></label>)}</div>}
      <Button className="w-full rounded-full" disabled={busy} onClick={() => void send()}>{busy ? "Sending…" : "Send Notification"}</Button></div></Section>
    <Section className="xl:col-span-2" title="Notification History" icon={Bell} action={!real && <Button variant="outline" size="sm" onClick={() => { d.markAllRead("admin"); toast("All marked read"); }}>Mark all read</Button>}>
      {real && notesQ.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading notifications…</p>
        : <><Table empty={!items.length} head={real ? ["Title","Audience","Sent","Read by"] : ["Title","Audience","Sent","Read by","Admin status",""]}>{slice.map(n => <tr key={n.id}><td className="px-3 py-2.5"><p className="font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></td><td className="px-3">{n.audienceLabel}</td><td className="px-3 whitespace-nowrap">{fmtDate(n.date, true)}</td><td className="px-3">{n.readCount}</td>{!real && <><td className="px-3"><Status s={n.adminRead ? "read" : "unread"} /></td><td className="px-3">{!n.adminRead && <Button size="sm" variant="ghost" onClick={() => d.markRead(n.id, "admin")}>Mark read</Button>}</td></>}</tr>)}</Table>{pager}</>}
    </Section>
  </div>;
}
