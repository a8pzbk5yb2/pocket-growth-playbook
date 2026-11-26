import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Section } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiNotification } from "@/lib/api";
import { fmtDate, notesFor } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/notifications")({ head: () => meta("Notifications", "Your PowerBank notifications."), component: P });
function P() {
  const { d, me } = useMe(); const qc = useQueryClient();
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-notifications"], queryFn: () => api.get<{ notifications: ApiNotification[] }>("/me/notifications"), enabled: real, staleTime: 30_000 });
  const list = real ? (q.data?.notifications ?? []) : notesFor(d.notifications, me.id).map(n => ({ id: n.id, title: n.title, body: n.body, date: n.date, read: n.readBy.includes(me.id) }));

  const markRead = async (id: string) => {
    if (!real) { d.markRead(id, me.id); return; }
    try { await api.post(`/me/notifications/${id}/read`); void qc.invalidateQueries({ queryKey: ["me-notifications"] }); void qc.invalidateQueries({ queryKey: ["me-dashboard"] }); }
    catch (er) { toast.error(errMessage(er)); }
  };
  const markAllRead = async () => {
    if (!real) { d.markAllRead(me.id); return; }
    try { await api.post("/me/notifications/read-all"); void qc.invalidateQueries({ queryKey: ["me-notifications"] }); void qc.invalidateQueries({ queryKey: ["me-dashboard"] }); toast.success("All marked read"); }
    catch (er) { toast.error(errMessage(er)); }
  };

  return <Section title="Notifications" icon={Bell} action={<Button size="sm" variant="outline" onClick={() => void markAllRead()}>Mark all read</Button>}>
    {real && q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading notifications…</p>}
    {real && q.isError && <p className="py-6 text-center text-sm text-destructive">Couldn't load notifications right now.</p>}
    {(!real || (!q.isLoading && !q.isError)) && <><ul className="space-y-2">{list.map(n => <li key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 ${n.read ? "" : "border-primary bg-secondary/50"}`}><div className="flex-1"><p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.date, true)}</p></div>{!n.read && <Button size="sm" variant="ghost" onClick={() => void markRead(n.id)}>Mark read</Button>}</li>)}</ul>{!list.length && <p className="py-6 text-center text-sm text-muted-foreground">No notifications.</p>}</>}
  </Section>;
}
