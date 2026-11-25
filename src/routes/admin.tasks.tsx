import { createFileRoute } from "@tanstack/react-router";
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
import { useDemo, type DemoTask } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/tasks")({ head: () => meta("Tasks", "Create and track sample PowerBank tasks."), component: Tasks });
function Tasks() {
  const d = useDemo(); const [edit, setEdit] = useState<DemoTask | null>(null);
  return <Section title="Tasks" icon={ClipboardCheck} action={<Button className="rounded-xl" onClick={() => setEdit({ id: d.newId("T"), title: "", reward: 5, status: "active", assigned: "all", completedBy: [] })}><Plus />Create Task</Button>}>
    <Table empty={!d.tasks.length} head={["Task","Demo Reward","Assigned To","Status","Completion","Actions"]}>{d.tasks.map(t => { const pct = Math.round((t.completedBy.length / d.users.length) * 100); return <tr key={t.id}><td className="px-3 py-3 font-semibold">{t.title}</td><td className="px-3">{money(t.reward)}<Demo /></td><td className="px-3">{t.assigned === "all" ? "All users" : d.users.find(u => u.id === t.assigned)?.name}</td><td className="px-3"><Status s={t.status} /></td><td className="px-3"><div className="flex items-center gap-2"><Progress value={pct} className="h-2 w-28" /><span className="text-xs">{t.completedBy.length} ({pct}%)</span></div></td>
      <td className="px-3"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(t)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={() => { d.deleteTask(t.id); toast.success("Task deleted"); }}><Trash2 /></Button></td></tr>; })}</Table>
    {edit && <TaskForm t={edit} close={() => setEdit(null)} />}
  </Section>;
}
function TaskForm({ t, close }: { t: DemoTask; close: () => void }) {
  const d = useDemo(); const [f, setF] = useState(t);
  return <Dialog open onOpenChange={o => !o && close()}><DialogContent><DialogHeader><DialogTitle>{d.tasks.some(x => x.id === t.id) ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
    <div className="space-y-3"><div><Label>Title</Label><Input value={f.title} maxLength={50} onChange={e => setF({ ...f, title: e.target.value })} /></div><div><Label>Demo reward (₹, visual only)</Label><Input type="number" value={f.reward} onChange={e => setF({ ...f, reward: Number(e.target.value) })} /></div>
      <div><Label>Assign to</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.assigned} onChange={e => setF({ ...f, assigned: e.target.value })}><option value="all">All users</option>{d.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
      <div><Label>Status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.status} onChange={e => setF({ ...f, status: e.target.value as DemoTask["status"] })}><option value="active">active</option><option value="paused">paused</option></select></div></div>
    <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => { if (!f.title.trim()) return toast.error("Title is required"); d.saveTask(f); toast.success("Task saved"); close(); }}>Save</Button></DialogFooter></DialogContent></Dialog>;
}
