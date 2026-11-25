import { createFileRoute } from "@tanstack/react-router";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { meta } from "@/components/pb/shell";
import { Section, Status, Table, usePaged } from "@/components/panel/ui";
import { fmtDate, useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/notifications")({ head: () => meta("Notifications", "Send demo notifications to sample users."), component: Notes });
function Notes() {
  const d = useDemo(); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [mode, setMode] = useState<"all" | "selected">("all"); const [sel, setSel] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const { slice, pager } = usePaged(d.notifications, 6);
  const send = () => { if (!title.trim() || !body.trim()) return toast.error("Title and message are required"); if (mode === "selected" && !sel.length) return toast.error("Select at least one user");
    setBusy(true); setTimeout(() => { d.notify(title.trim(), body.trim(), mode === "all" ? "all" : sel); setBusy(false); setTitle(""); setBody(""); setSel([]); toast.success("Demo notification sent"); }, 500); };
  return <div className="grid gap-4 xl:grid-cols-3">
    <Section title="Send Demo Notification" icon={Send}><div className="space-y-3"><div><Label>Title</Label><Input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} /></div><div><Label>Message</Label><Textarea value={body} maxLength={300} onChange={e => setBody(e.target.value)} /></div>
      <div className="flex gap-2">{(["all", "selected"] as const).map(m => <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${mode === m ? "border-primary bg-secondary text-primary-deep" : ""}`}>{m === "all" ? "All demo users" : "Selected users"}</button>)}</div>
      {mode === "selected" && <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">{[...d.users].reverse().map(u => <label key={u.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={sel.includes(u.id)} onChange={e => setSel(e.target.checked ? [...sel, u.id] : sel.filter(x => x !== u.id))} />{u.name} <span className="text-xs text-muted-foreground">{u.id}</span></label>)}</div>}
      <Button className="w-full rounded-full" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send Notification"}</Button></div></Section>
    <Section className="xl:col-span-2" title="Notification History" icon={Bell} action={<Button variant="outline" size="sm" onClick={() => { d.markAllRead("admin"); toast("All marked read"); }}>Mark all read</Button>}>
      <Table empty={!d.notifications.length} head={["Title","Audience","Sent","Read by","Admin status",""]}>{slice.map(n => <tr key={n.id}><td className="px-3 py-2.5"><p className="font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></td><td className="px-3">{n.to === "all" ? "All users" : `${n.to.length} selected`}</td><td className="px-3 whitespace-nowrap">{fmtDate(n.date, true)}</td><td className="px-3">{n.readBy.filter(x => x !== "admin").length}</td><td className="px-3"><Status s={n.readBy.includes("admin") ? "read" : "unread"} /></td><td className="px-3">{!n.readBy.includes("admin") && <Button size="sm" variant="ghost" onClick={() => d.markRead(n.id, "admin")}>Mark read</Button>}</td></tr>)}</Table>{pager}</Section>
  </div>;
}
