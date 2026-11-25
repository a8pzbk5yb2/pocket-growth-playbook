import { createFileRoute } from "@tanstack/react-router";
import { Eye, Gem, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { meta } from "@/components/pb/shell";
import { PlanCard } from "@/components/panel/plan-card";
import { Detail, FilterSelect, SearchBox, Section, Status, Table, Toolbar, money } from "@/components/panel/ui";
import { useDemo, type DemoPlan } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/plans")({ head: () => meta("Plans", "Manage the sample plan cards shown across PowerBank."), component: Plans });
function Plans() {
  const d = useDemo();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  const [edit, setEdit] = useState<DemoPlan | null>(null); const [view, setView] = useState<DemoPlan | null>(null); const [del, setDel] = useState<DemoPlan | null>(null);
  const rows = d.plans.filter(p => (st === "all" || p.status === st) && p.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (p: DemoPlan) => { d.savePlan({ ...p, status: p.status === "active" ? "inactive" : "active" }); toast.success(`${p.name} ${p.status === "active" ? "deactivated" : "activated"}`); };
  const blank: DemoPlan = { id: "", name: "", icon: "zap", price: 100, daily: 10, duration: 30, validity: "30 days", description: "", status: "active" };
  return <>
    <div className="flex flex-wrap items-center gap-2"><SearchBox value={q} onChange={setQ} placeholder="Search plans" /><FilterSelect label="Status" value={st} onChange={setSt} options={["active","inactive"]} /><Button className="ml-auto h-10 rounded-xl" onClick={() => setEdit({ ...blank, id: d.newPlanId() })}><Plus />Add New Plan</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{rows.map(p => <PlanCard key={p.id} p={p}><Button size="sm" variant="outline" onClick={() => setView(p)}><Eye />View</Button><Button size="sm" variant="outline" onClick={() => setEdit(p)}><Pencil />Edit</Button></PlanCard>)}</div>
    {!rows.length && <p className="panel-card p-8 text-center text-sm text-muted-foreground">No plans match.</p>}
    <Section title="Plans Table" icon={Gem}><Table empty={!rows.length} head={["Plan","Reference Price","Illustrative Label","Duration","Validity","Status","Actions"]}>{rows.map(p => <tr key={p.id}><td className="px-3 py-2.5 font-semibold">{p.name}</td><td className="px-3">{money(p.price)}</td><td className="px-3">{money(p.daily)}/day</td><td className="px-3">{p.duration} days</td><td className="px-3">{p.validity}</td><td className="px-3"><Status s={p.status} /></td>
      <td className="px-3"><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(p)}><Eye /></Button><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(p)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Toggle status" onClick={() => toggle(p)}><Power /></Button><Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={() => setDel(p)}><Trash2 /></Button></div></td></tr>)}</Table></Section>
    {edit && <PlanForm plan={edit} close={() => setEdit(null)} />}
    {view && <Dialog open onOpenChange={o => !o && setView(null)}><DialogContent><DialogHeader><DialogTitle>{view.name}</DialogTitle></DialogHeader><Detail rows={[["Reference price", money(view.price)], ["Illustrative label", `${money(view.daily)}/day`], ["Duration", `${view.duration} days`], ["Validity", view.validity], ["Status", <Status key="s" s={view.status} />], ["Description", view.description]]} /></DialogContent></Dialog>}
    <AlertDialog open={!!del} onOpenChange={o => !o && setDel(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {del?.name}?</AlertDialogTitle><AlertDialogDescription>The sample plan disappears from both panels until you refresh.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (del) { d.deletePlan(del.id); toast.success("Plan deleted"); } }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
function PlanForm({ plan, close }: { plan: DemoPlan; close: () => void }) {
  const d = useDemo(); const [f, setF] = useState(plan);
  const save = () => { if (!f.name.trim()) return toast.error("Plan name is required"); if (f.price <= 0 || f.daily < 0 || f.duration <= 0) return toast.error("Enter positive numbers"); d.savePlan({ ...f, name: f.name.trim() }); toast.success("Plan saved — updated everywhere"); close(); };
  const num = (k: "price" | "daily" | "duration") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return <Dialog open onOpenChange={o => !o && close()}><DialogContent><DialogHeader><DialogTitle>{d.plans.some(p => p.id === plan.id) ? "Edit Plan" : "Add New Plan"}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label>Plan Name</Label><Input value={f.name} maxLength={40} onChange={e => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Plan Icon</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.icon} onChange={e => setF({ ...f, icon: e.target.value as DemoPlan["icon"] })}><option value="zap">Bolt</option><option value="star">Star</option><option value="crown">Crown</option><option value="gem">Diamond</option></select></div>
      <div><Label>Status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.status} onChange={e => setF({ ...f, status: e.target.value as DemoPlan["status"] })}><option value="active">active</option><option value="inactive">inactive</option></select></div>
      <div><Label>Reference Price (₹)</Label><Input type="number" value={f.price} onChange={num("price")} /></div><div><Label>Illustrative ₹/day</Label><Input type="number" value={f.daily} onChange={num("daily")} /></div>
      <div><Label>Duration (days)</Label><Input type="number" value={f.duration} onChange={num("duration")} /></div><div><Label>Validity</Label><Input value={f.validity} onChange={e => setF({ ...f, validity: e.target.value })} /></div>
      <div className="col-span-2"><Label>Description</Label><Textarea value={f.description} maxLength={200} onChange={e => setF({ ...f, description: e.target.value })} /></div></div>
    <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={save}>Save Plan</Button></DialogFooter></DialogContent></Dialog>;
}
