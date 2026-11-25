import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Section } from "@/components/panel/ui";
import { fmtDate, notesFor } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/notifications")({ head: () => meta("Notifications", "Your PowerBank demo notifications."), component: P });
function P() {
  const { d, me } = useMe(); const list = notesFor(d.notifications, me.id);
  return <Section title="Notifications" icon={Bell} action={<Button size="sm" variant="outline" onClick={() => d.markAllRead(me.id)}>Mark all read</Button>}><ul className="space-y-2">{list.map(n => { const read = n.readBy.includes(me.id); return <li key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 ${read ? "" : "border-primary bg-secondary/50"}`}><div className="flex-1"><p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.date, true)}</p></div>{!read && <Button size="sm" variant="ghost" onClick={() => d.markRead(n.id, me.id)}>Mark read</Button>}</li>; })}</ul>{!list.length && <p className="py-6 text-center text-sm text-muted-foreground">No notifications.</p>}</Section>;
}
