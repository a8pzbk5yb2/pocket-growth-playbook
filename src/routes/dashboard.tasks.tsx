import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListChecks } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Demo, Section, money } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiTask } from "@/lib/api";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/tasks")({ head: () => meta("Tasks", "Complete daily PowerBank tasks to earn rewards."), component: P });
function P() {
  const { d, me } = useMe();
  const qc = useQueryClient();
  const real = apiConfigured();
  const [busyId, setBusyId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["me-tasks"], queryFn: () => api.get<{ tasks: ApiTask[] }>("/me/tasks"), enabled: real, staleTime: 15_000 });

  const list = real
    ? (q.data?.tasks ?? [])
    : d.tasks.filter(t => t.status === "active" && (t.assigned === "all" || t.assigned === me.id)).map(t => ({ ...t, category: "Daily" as const, completed: t.completedBy.includes(me.id) }));

  const complete = async (id: string) => {
    if (!real) { d.completeTask(id, me.id); toast.success("Task marked complete (demo)"); return; }
    setBusyId(id);
    try {
      const r = await api.post<{ reward: number }>(`/me/tasks/${id}/complete`);
      invalidateMoneyQueries(qc);
      toast.success(`Task completed! +${money(r.reward)} credited to withdrawable balance`);
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusyId(null); }
  };

  return <Section title="Daily Tasks" icon={ListChecks}>
    {real && q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading tasks…</p>}
    {(!real || !q.isLoading) && <><ul className="space-y-2">{list.map(t => <li key={t.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-semibold">{t.title}{real && <span className="ml-2 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{t.category}</span>}</p><p className="text-xs text-muted-foreground">Reward {money(t.reward)}<Demo /></p></div>{t.completed ? <span className="flex items-center gap-1 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" />Done</span> : <Button size="sm" className="rounded-full" disabled={busyId === t.id} onClick={() => void complete(t.id)}>{busyId === t.id ? "…" : "Go"}</Button>}</li>)}</ul>{!list.length && <p className="py-6 text-center text-sm text-muted-foreground">No tasks assigned.</p>}</>}
  </Section>;
}
