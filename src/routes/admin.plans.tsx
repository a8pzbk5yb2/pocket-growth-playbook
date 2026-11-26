import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Detail, FilterSelect, SearchBox, Section, Status, Table, money } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiPlan } from "@/lib/api";
import { useDemo, type DemoPlan } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/plans")({ head: () => meta("Plans", "Manage the illustrative plan cards shown across PowerBank."), component: Plans });
function Plans() {
  const d = useDemo(); const qc = useQueryClient();
  const real = apiConfigured();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  const [edit, setEdit] = useState<DemoPlan | null>(null); const [view, setView] = useState<DemoPlan | null>(null); const [del, setDel] = useState<DemoPlan | null>(null);
  const apiQ = useQuery({ queryKey: ["admin-plans"], queryFn: () => api.get<{ plans: ApiPlan[] }>("/admin/plans"), enabled: real, staleTime: 30_000 });

  const allPlans = real ? (apiQ.data?.plans ?? []) : d.plans;
  const rows = allPlans.filter(p => (st === "all" || p.status === st) && p.name.toLowerCase().includes(q.toLowerCase()));

  const toggle = async (p: DemoPlan) => {
    const next = p.status === "active" ? "inactive" : "active";
    if (!real) { d.savePlan({ ...p, status: next }); toast.success(`${p.name} ${next === "inactive" ? "deactivated" : "activated"}`); return; }
    try { await api.put(`/admin/plans/${p.id}`, { status: next }); void qc.invalidateQueries({ queryKey: ["admin-plans"] }); void qc.invalidateQueries({ queryKey: ["plans"] }); toast.success(`${p.name} ${next}`); }
    catch (er) { toast.error(errMessage(er)); }
  };

  const remove = async (p: DemoPlan) => {
    if (!real) { d.deletePlan(p.id); toast.success("Plan deleted"); return; }
    try { await api.del(`/admin/plans/${p.id}`); void qc.invalidateQueries({ queryKey: ["admin-plans"] }); void qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plan deleted"); }
    catch (er) { toast.error(errMessage(er)); }
  };

  const blank: DemoPlan = { id: "", name: "", icon: "zap", price: 100, daily: 10, duration: 30, validity: "30 days", description: "", status: "active" };
  return <>
    <div className="flex flex-wrap items-center gap-2"><SearchBox value={q} onChange={setQ} placeholder="Search plans" /><FilterSelect label="Status" value={st} onChange={setSt} options={["active","inactive"]} /><Button className="ml-auto h-10 rounded-xl" onClick={() => setEdit(real ? blank : { ...blank, id: d.newPlanId() })}><Plus />Add New Plan</Button></div>
    {real && apiQ.isLoading && <p className="panel-card p-8 text-center text-sm text-muted-foreground">Loading plans…</p>}
    {real && apiQ.isError && <p className="panel-card p-8 text-center text-sm text-destructive">{errMessage(apiQ.error, "Failed to load plans.")}</p>}
    {(!real || (!apiQ.isLoading && !apiQ.isError)) && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{rows.map(p => <PlanCard key={p.id} p={p}><Button size="sm" variant="outline" onClick={() => setView(p)}><Eye />View</Button><Button size="sm" variant="outline" onClick={() => setEdit(p)}><Pencil />Edit</Button></PlanCard>)}</div>
      {!rows.length && <p className="panel-card p-8 text-center text-sm text-muted-foreground">No plans match.</p>}
      <Section title="Plans Table" icon={Gem}><Table empty={!rows.length} head={["Plan","Reference Price","Illustrative Label","Duration","Validity","Status","Actions"]}>{rows.map(p => <tr key={p.id}><td className="px-3 py-2.5 font-semibold">{p.name}</td><td className="px-3">{money(p.price)}</td><td className="px-3">{money(p.daily)}/day</td><td className="px-3">{p.duration} days</td><td className="px-3">{p.validity}</td><td className="px-3"><Status s={p.status} /></td>
        <td className="px-3"><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(p)}><Eye /></Button><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(p)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Toggle status" onClick={() => void toggle(p)}><Power /></Button><Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={() => setDel(p)}><Trash2 /></Button></div></td></tr>)}</Table></Section>
    </>}
    {edit && <PlanForm key={edit.id || "new"} plan={edit} existingIds={allPlans.map(p => p.id)} real={real} close={() => setEdit(null)} />}
    {view && <Dialog open onOpenChange={o => !o && setView(null)}><DialogContent><DialogHeader><DialogTitle>{view.name}</DialogTitle></DialogHeader><Detail rows={[["Reference price", money(view.price)], ["Illustrative label", `${money(view.daily)}/day`], ["Duration", `${view.duration} days`], ["Validity", view.validity], ["Status", <Status key="s" s={view.status} />], ["Description", view.description]]} /></DialogContent></Dialog>}
    <AlertDialog open={!!del} onOpenChange={o => !o && setDel(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {del?.name}?</AlertDialogTitle><AlertDialogDescription>{real ? "The plan will be deactivated and hidden from users." : "The sample plan disappears from both panels until you refresh."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (del) void remove(del); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
function PlanForm({ plan, existingIds, real, close }: { plan: DemoPlan; existingIds: string[]; real: boolean; close: () => void }) {
  const d = useDemo(); const qc = useQueryClient();
  const [f, setF] = useState(plan); const [busy, setBusy] = useState(false);
  const isEdit = existingIds.includes(plan.id);
  const save = async () => {
    if (!f.name.trim()) { toast.error("Plan name is required"); return; }
    if (f.price <= 0 || f.daily < 0 || f.duration <= 0) { toast.error("Enter positive numbers"); return; }
    if (!real) { d.savePlan({ ...f, name: f.name.trim(), validity: `${f.duration} days` }); toast.success("Plan saved — updated everywhere"); close(); return; }
    setBusy(true);
    try {
      const body = { name: f.name.trim(), icon: f.icon, price: Math.round(f.price), daily: Math.round(f.daily), duration: Math.round(f.duration), description: f.description.trim(), status: f.status };
      if (isEdit) await api.put(`/admin/plans/${plan.id}`, body); else await api.post("/admin/plans", body);
      void qc.invalidateQueries({ queryKey: ["admin-plans"] }); void qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan saved"); close();
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };
  const num = (k: "price" | "daily" | "duration") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return <Dialog open onOpenChange={o => !o && close()}><DialogContent><DialogHeader><DialogTitle>{isEdit ? "Edit Plan" : "Add New Plan"}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label>Plan Name</Label><Input value={f.name} maxLength={60} onChange={e => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Plan Icon</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.icon} onChange={e => setF({ ...f, icon: e.target.value as DemoPlan["icon"] })}><option value="zap">Bolt</option><option value="star">Star</option><option value="crown">Crown</option><option value="gem">Diamond</option></select></div>
      <div><Label>Status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={f.status} onChange={e => setF({ ...f, status: e.target.value as DemoPlan["status"] })}><option value="active">active</option><option value="inactive">inactive</option></select></div>
      <div><Label>Reference Price (₹)</Label><Input type="number" value={f.price} onChange={num("price")} /></div><div><Label>Illustrative ₹/day</Label><Input type="number" value={f.daily} onChange={num("daily")} /></div>
      <div><Label>Duration (days)</Label><Input type="number" value={f.duration} onChange={num("duration")} /></div><div><Label>Validity</Label><Input value={`${f.duration} days`} readOnly className="bg-muted" /></div>
      <div className="col-span-2"><Label>Description</Label><Textarea value={f.description} maxLength={255} onChange={e => setF({ ...f, description: e.target.value })} /></div></div>
    <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save Plan"}</Button></DialogFooter></DialogContent></Dialog>;
}
