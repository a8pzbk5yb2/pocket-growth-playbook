import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { meta } from "@/components/pb/shell";
import { Demo, Section, Status, Table, money } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, invalidateAdminMoneyQueries, type ApiAdminTask, type ApiAdminUsersPage } from "@/lib/api";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/tasks")({ head: () => meta("Tasks", "Create and track PowerBank tasks."), component: Tasks });
type TaskRow = { id?: string; title: string; category: "Daily" | "Social" | "Special"; reward: number; status: "active" | "paused"; assigned: string; assignedName: string; completions: number; totalUsers: number };

function Tasks() {
  const d = useDemo(); const qc = useQueryClient();
  const real = apiConfigured();
  const [edit, setEdit] = useState<TaskRow | null>(null);

  const apiQ = useQuery({ queryKey: ["admin-tasks"], queryFn: () => api.get<{ tasks: ApiAdminTask[] }>("/admin/tasks"), enabled: real, staleTime: 15_000 });
  const usersQ = useQuery({ queryKey: ["admin-users-task-opts"], queryFn: () => api.get<ApiAdminUsersPage>("/admin/users?perPage=100"), enabled: real && !!edit, staleTime: 30_000 });

  const rows: TaskRow[] = real
    ? (apiQ.data?.tasks ?? [])
    : d.tasks.map(t => ({
        id: t.id, title: t.title, category: "Daily", reward: t.reward, status: t.status, assigned: t.assigned,
        assignedName: t.assigned === "all" ? "All users" : (d.users.find(u => u.id === t.assigned)?.name ?? t.assigned),
        completions: t.completedBy.length, totalUsers: Math.max(1, d.users.length),
      }));

  const remove = async (t: TaskRow) => {
    if (!real && t.id) { d.deleteTask(t.id); toast.success("Task deleted"); return; }
    if (!t.id) return;
    try {
      await api.del(`/admin/tasks/${t.id}`);
      invalidateAdminMoneyQueries(qc);
      toast.success("Task deleted");
    } catch (er) { toast.error(errMessage(er)); }
  };

  return <Section title="Tasks" icon={ClipboardCheck} action={<Button className="rounded-xl" onClick={() => setEdit({ title: "", category: "Daily", reward: 5, status: "active", assigned: "all", assignedName: "All users", completions: 0, totalUsers: 1, ...(real ? {} : { id: d.newId("T") }) })}><Plus />Create Task</Button>}>
    {real && apiQ.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading tasks…</p> : (
      <Table empty={!rows.length} head={real ? ["Task", "Category", "Reward", "Assigned To", "Status", "Completion", "Actions"] : ["Task", "Demo Reward", "Assigned To", "Status", "Completion", "Actions"]}>{rows.map(t => { const pct = Math.min(100, Math.round((t.completions / Math.max(1, t.totalUsers)) * 100)); return <tr key={t.id ?? t.title}><td className="px-3 py-3 font-semibold">{t.title}</td>{real && <td className="px-3">{t.category}</td>}<td className="px-3">{money(t.reward)}<Demo /></td><td className="px-3">{t.assignedName}</td><td className="px-3"><Status s={t.status} /></td><td className="px-3"><div className="flex items-center gap-2"><Progress value={pct} className="h-2 w-28" /><span className="text-xs">{t.completions} ({pct}%)</span></div></td>
        <td className="px-3"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(t)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={() => void remove(t)}><Trash2 /></Button></td></tr>; })}</Table>
    )}
    {edit && <TaskForm t={edit} real={real} users={real ? (usersQ.data?.items ?? []).map(u => ({ id: u.id, name: u.name })) : d.users.map(u => ({ id: u.id, name: u.name }))} close={() => setEdit(null)} />}
  </Section>;
}

function TaskForm({ t, real, users, close }: { t: TaskRow; real: boolean; users: { id: string; name: string }[]; close: () => void }) {
  const d = useDemo(); const qc = useQueryClient();
  const [f, setF] = useState(t);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    if (f.reward < 1) { toast.error("Reward must be at least ₹1"); return; }
    if (!real) {
      d.saveTask({ id: f.id ?? d.newId("T"), title: f.title.trim(), reward: f.reward, status: f.status, assigned: f.assigned, completedBy: [] });
      toast.success("Task saved"); close(); return;
    }
    setBusy(true);
    try {
      const payload = { title: f.title.trim(), category: f.category, reward: Math.round(f.reward), status: f.status, assignedUserId: f.assigned || "all" };
      if (t.id) await api.put(`/admin/tasks/${t.id}`, payload);
      else await api.post("/admin/tasks", payload);
      invalidateAdminMoneyQueries(qc);
      toast.success("Task saved");
      close();
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  return <Dialog open onOpenChange={o => !o && !busy && close()}><DialogContent><DialogHeader><DialogTitle>{t.id ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
    <div className="space-y-3">
      <div><Label>Title</Label><Input value={f.title} maxLength={80} onChange={e => setF({ ...f, title: e.target.value })} /></div>
      {real && <div><Label>Category</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.category} onChange={e => setF({ ...f, category: e.target.value as TaskRow["category"] })}><option value="Daily">Daily</option><option value="Social">Social</option><option value="Special">Special</option></select></div>}
      <div><Label>{real ? "Reward (₹)" : "Demo reward (₹, visual only)"}</Label><Input type="number" min={1} value={f.reward} onChange={e => setF({ ...f, reward: Number(e.target.value) })} /></div>
      <div><Label>Assign to</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.assigned} onChange={e => setF({ ...f, assigned: e.target.value })}><option value="all">All users</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}</select></div>
      <div><Label>Status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.status} onChange={e => setF({ ...f, status: e.target.value as TaskRow["status"] })}><option value="active">active</option><option value="paused">paused</option></select></div>
    </div>
    <DialogFooter><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Button></DialogFooter></DialogContent></Dialog>;
}
