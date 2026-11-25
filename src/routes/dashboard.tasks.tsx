import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Demo, Section, money } from "@/components/panel/ui";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/tasks")({ head: () => meta("Tasks", "Your sample daily tasks."), component: P });
function P() {
  const { d, me } = useMe(); const list = d.tasks.filter(t => t.status === "active" && (t.assigned === "all" || t.assigned === me.id));
  return <Section title="Daily Tasks" icon={ListChecks}><ul className="space-y-2">{list.map(t => { const done = t.completedBy.includes(me.id); return <li key={t.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-semibold">{t.title}</p><p className="text-xs text-muted-foreground">Reward {money(t.reward)}<Demo /></p></div>{done ? <span className="flex items-center gap-1 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" />Done</span> : <Button size="sm" className="rounded-full" onClick={() => { d.completeTask(t.id, me.id); toast.success("Task marked complete (demo)"); }}>Go</Button>}</li>; })}</ul>{!list.length && <p className="py-6 text-center text-sm text-muted-foreground">No tasks assigned.</p>}</Section>;
}
