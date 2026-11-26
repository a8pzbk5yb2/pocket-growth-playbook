import { SignedIn } from "@/components/pb/signed-in";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MobileShell, PageBar, meta } from "@/components/pb/shell";
import { api, apiConfigured, errMessage, type ApiNotification } from "@/lib/api";
import { fmtDate, notesFor } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/notifications")({ head: () => meta("Notifications", "Your PowerBank notifications."), component: () => <SignedIn title="Notifications"><P /></SignedIn> });
function P() {
  const { d, me } = useMe(); const qc = useQueryClient(); const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-notifications"], queryFn: () => api.get<{ notifications: ApiNotification[] }>("/me/notifications"), enabled: real, staleTime: 30_000 });
  const list = real ? (q.data?.notifications ?? []) : notesFor(d.notifications, me.id).map(n => ({ id: n.id, title: n.title, body: n.body, date: n.date, read: n.readBy.includes(me.id) }));
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["me-notifications"] }); void qc.invalidateQueries({ queryKey: ["me-dashboard"] }); };
  const markRead = async (id: string) => { if (!real) { d.markRead(id, me.id); return; } try { await api.post(`/me/notifications/${id}/read`); refresh(); } catch (er) { toast.error(errMessage(er)); } };
  const markAll = async () => { if (!real) { d.markAllRead(me.id); return; } try { await api.post("/me/notifications/read-all"); refresh(); toast.success("All marked read"); } catch (er) { toast.error(errMessage(er)); } };
  return <MobileShell>
    <header className="pb-green-header"><PageBar title="Notifications" backTo="/me" /></header>
    <main className="pb-content">
      {list.some(n => !n.read) && <div className="mb-2 text-right"><Button size="sm" variant="ghost" className="text-primary" onClick={() => void markAll()}>Mark all read</Button></div>}
      {real && q.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        : real && q.isError ? <p className="py-6 text-center text-sm text-destructive">Couldn't load notifications right now.</p>
        : list.length ? <ul className="space-y-2">{list.map(n => <li key={n.id} onClick={() => { if (!n.read) void markRead(n.id); }} className={`flex gap-3 rounded-2xl bg-card p-3 shadow-card ${n.read ? "" : "ring-1 ring-primary"}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Bell className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-sm font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{fmtDate(n.date, true)}</p></div></li>)}</ul>
        : <p className="py-10 text-center text-sm text-muted-foreground">No notifications.</p>}
    </main>
  </MobileShell>;
}
