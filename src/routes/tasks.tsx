import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, Newspaper, PlayCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import checkImg from "@/assets/powerbank-tasks.webp.asset.json";
import { GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";
import { ApiError, api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiTask } from "@/lib/api";
import { inr } from "@/lib/demo-data";

export const Route = createFileRoute("/tasks")({ head: () => meta("Tasks", "Complete daily PowerBank tasks and earn bonus rewards."), component: Tasks });
const demoTasks = [
  { id: "1", title: "Daily Login", reward: 2, icon: CalendarCheck, tint: "text-rose bg-rose/10", category: "Daily" },
  { id: "2", title: "Watch Video", reward: 5, icon: PlayCircle, tint: "text-rose bg-rose/10", category: "Daily" },
  { id: "3", title: "Share App", reward: 10, icon: Share2, tint: "text-sky bg-sky/10", category: "Social" },
  { id: "4", title: "Read News", reward: 3, icon: Newspaper, tint: "text-sky bg-sky/10", category: "Daily" },
  { id: "5", title: "Complete Survey", reward: 15, icon: ClipboardList, tint: "text-violet bg-violet/10", category: "Special" },
];
const cats = ["All", "Daily", "Social", "Special"] as const;

function iconFor(title: string, cat: string) {
  const l = title.toLowerCase();
  if (l.includes("login")) return { icon: CalendarCheck, tint: "text-rose bg-rose/10" };
  if (l.includes("video")) return { icon: PlayCircle, tint: "text-rose bg-rose/10" };
  if (l.includes("share") || cat === "Social") return { icon: Share2, tint: "text-sky bg-sky/10" };
  if (l.includes("news")) return { icon: Newspaper, tint: "text-sky bg-sky/10" };
  return { icon: ClipboardList, tint: "text-violet bg-violet/10" };
}

function Tasks() {
  const real = apiConfigured();
  const qc = useQueryClient();
  const [c, setC] = useState<(typeof cats)[number]>("All");
  const [done, setDone] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["me-tasks"], queryFn: () => api.get<{ tasks: ApiTask[] }>("/me/tasks"), enabled: real, retry: false, staleTime: 15_000 });
  const unauth = real && q.isError && q.error instanceof ApiError && q.error.status === 401;

  const list = real
    ? (q.data?.tasks ?? []).map(t => ({ ...t, ...iconFor(t.title, t.category) }))
    : demoTasks.map(t => ({ ...t, completed: done.includes(t.id) }));

  const complete = async (id: string, title: string) => {
    if (!real) { setDone(prev => [...prev, id]); toast.success(`${title} completed (demo)`); return; }
    setBusyId(id);
    try {
      const r = await api.post<{ reward: number }>(`/me/tasks/${id}/complete`);
      invalidateMoneyQueries(qc);
      toast.success(`${title} completed! +${inr(r.reward)} credited`);
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusyId(null); }
  };

  return <MobileShell><GreenHeader pageTitle="Task" title="Complete Tasks & Earn Bonus" image={checkImg.url} />
    <main className="pb-content"><Pills items={cats} value={c} onChange={setC} />
      {real && q.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading tasks…</p>}
      {unauth && <div className="rounded-2xl bg-card p-6 text-center shadow-card"><p className="text-sm text-muted-foreground">Sign in to complete daily tasks and earn real rewards.</p><Button asChild className="mt-3 rounded-full"><Link to="/login">Log In</Link></Button></div>}
      {(!real || (!q.isLoading && !unauth && !q.isError)) && <div className="space-y-3">
        {list.filter(t => c === "All" || t.category === c).map(t => <div key={t.id} className="pb-list-card !min-h-[76px]">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${t.tint}`}><t.icon className="h-7 w-7" /></div>
          <div className="min-w-0 flex-1"><h2>{t.title}</h2><p className="mt-1 text-xs text-muted-foreground">Get {inr(t.reward)} Bonus</p></div>
          <Button disabled={t.completed || busyId === t.id} onClick={() => void complete(t.id, t.title)} className="pb-small-cta min-w-16">{t.completed ? "Done" : busyId === t.id ? "…" : "Go"}</Button>
        </div>)}
        {!list.filter(t => c === "All" || t.category === c).length && <p className="py-8 text-center text-sm text-muted-foreground">No tasks in this category.</p>}
      </div>}
    </main>
  </MobileShell>;
}
