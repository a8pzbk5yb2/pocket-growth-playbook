import { createFileRoute } from "@tanstack/react-router";
import { Ban, CheckCircle2, MoreHorizontal, Plus, UserCheck, UserX, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meta } from "@/components/pb/shell";
import { Avatar, DateRange, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, StatCard, Status, Table, Toolbar, inRange, money, usePaged } from "@/components/panel/ui";
import { downloadCsv, fmtDate, useDemo, type DemoUser, type Kyc, type UserStatus } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/users")({ head: () => meta("Users", "Manage sample PowerBank users, status and KYC."), component: UsersPage });
type Mode = { kind: "view" | "edit" | "wallet" | "history" | "add"; u?: DemoUser } | null;
function UsersPage() {
  const d = useDemo();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all"); const [kyc, setKyc] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const rows = useMemo(() => [...d.users].reverse().filter(u => (st === "all" || u.status === st) && (kyc === "all" || u.kyc === kyc) && inRange(u.joined, from, to) && [u.name, u.mobile, u.id].some(x => x.toLowerCase().includes(q.toLowerCase()))), [d.users, q, st, kyc, from, to]);
  const { slice, pager } = usePaged(rows);
  const count = (s: UserStatus) => d.users.filter(u => u.status === s).length;
  const setStatus = (u: DemoUser, s: UserStatus) => { d.updateUser(u.id, { status: s }); toast.success(`${u.name} is now ${s}`); };
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Total Users" value={d.users.length} /><StatCard icon={UserCheck} label="Active Users" value={count("active")} />
      <StatCard icon={UserX} color="bg-warning/15 text-orange" label="Inactive Users" value={count("inactive")} /><StatCard icon={Ban} color="bg-destructive/12 text-destructive" label="Blocked Users" value={count("blocked")} />
    </div>
    <Section title="All Users" icon={Users} action={<div className="flex gap-2"><ExportBtn onClick={() => downloadCsv("powerbank-users-demo.csv", rows.map(u => ({ id: u.id, name: u.name, mobile: u.mobile, email: u.email ?? "", joined: fmtDate(u.joined), demo_balance: u.balance, status: u.status, kyc: u.kyc })))} /><Button className="h-10 rounded-xl" onClick={() => setMode({ kind: "add" })}><Plus />Add User</Button></div>}>
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search name, mobile or ID" /><FilterSelect label="Status" value={st} onChange={setSt} options={["active","inactive","blocked"]} /><FilterSelect label="KYC" value={kyc} onChange={setKyc} options={["verified","pending","rejected"]} /><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /></Toolbar>
      <Table empty={!rows.length} head={["User","User ID","Full Name","Mobile","Email","Joined","Demo Balance","Status","KYC","Actions"]}>{slice.map(u => <tr key={u.id} className="hover:bg-muted/40">
        <td className="px-3 py-2"><Avatar name={u.name} /></td><td className="px-3 font-medium">{u.id}</td><td className="px-3">{u.name}</td><td className="px-3">+91 {u.mobile}</td><td className="px-3 text-muted-foreground">{u.email ?? "—"}</td><td className="px-3 whitespace-nowrap">{fmtDate(u.joined)}</td><td className="px-3 font-semibold">{money(u.balance)}</td><td className="px-3"><Status s={u.status} /></td><td className="px-3"><Status s={u.kyc} /></td>
        <td className="px-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${u.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setMode({ kind: "view", u })}>View Profile</DropdownMenuItem><DropdownMenuItem onClick={() => setMode({ kind: "edit", u })}>Edit User</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMode({ kind: "wallet", u })}>View Demo Wallet</DropdownMenuItem><DropdownMenuItem onClick={() => setMode({ kind: "history", u })}>View Demo History</DropdownMenuItem><DropdownMenuSeparator />
          {u.status === "blocked" ? <DropdownMenuItem onClick={() => setStatus(u, "active")}>Unblock User</DropdownMenuItem> : <DropdownMenuItem className="text-destructive" onClick={() => setStatus(u, "blocked")}>Block User</DropdownMenuItem>}
          {u.status === "active" ? <DropdownMenuItem onClick={() => setStatus(u, "inactive")}>Deactivate User</DropdownMenuItem> : <DropdownMenuItem onClick={() => setStatus(u, "active")}>Activate User</DropdownMenuItem>}
        </DropdownMenuContent></DropdownMenu></td></tr>)}</Table>{pager}
    </Section>
    <UserDialog mode={mode} close={() => setMode(null)} />
  </>;
}
function UserDialog({ mode, close }: { mode: Mode; close: () => void }) {
  const d = useDemo();
  const u = mode?.u ? d.users.find(x => x.id === mode.u!.id) : undefined;
  const [f, setF] = useState({ name: "", mobile: "", email: "", kyc: "pending" as Kyc });
  const open = (o: boolean) => { if (!o) close(); };
  if (!mode) return null;
  if (mode.kind === "edit" || mode.kind === "add") {
    const init = mode.kind === "edit" && u ? { name: u.name, mobile: u.mobile, email: u.email ?? "", kyc: u.kyc } : { name: "", mobile: "", email: "", kyc: "pending" as Kyc };
    const v = f.name || f.mobile ? f : init;
    const save = () => { if (!v.name.trim() || !/^[6-9]\d{9}$/.test(v.mobile)) { toast.error("Enter a name and a valid 10-digit mobile"); return; }
      const p = { name: v.name.trim(), mobile: v.mobile, kyc: v.kyc, ...(v.email ? { email: v.email } : {}) };
      if (mode.kind === "edit" && u) d.updateUser(u.id, p); else d.addUser({ ...p, balance: 0, status: "active" });
      toast.success(mode.kind === "edit" ? "User updated" : "Demo user added"); setF({ name: "", mobile: "", email: "", kyc: "pending" }); close(); };
    return <Dialog open onOpenChange={open}><DialogContent><DialogHeader><DialogTitle>{mode.kind === "edit" ? "Edit User" : "Add Demo User"}</DialogTitle></DialogHeader>
      <div className="space-y-3"><div><Label>Full Name</Label><Input value={v.name} maxLength={60} onChange={e => setF({ ...v, name: e.target.value })} /></div><div><Label>Mobile (+91)</Label><Input value={v.mobile} inputMode="numeric" maxLength={10} onChange={e => setF({ ...v, mobile: e.target.value.replace(/\D/g, "") })} /></div><div><Label>Email (optional, fictional)</Label><Input value={v.email} onChange={e => setF({ ...v, email: e.target.value })} /></div>
        <div><Label>KYC status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={v.kyc} onChange={e => setF({ ...v, kyc: e.target.value as Kyc })}><option value="verified">verified</option><option value="pending">pending</option><option value="rejected">rejected</option></select></div></div>
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter></DialogContent></Dialog>;
  }
  if (!u) return null;
  const tx = d.transactions.filter(t => t.userId === u.id);
  return <Dialog open onOpenChange={open}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar name={u.name} />{u.name}</DialogTitle></DialogHeader>
    {mode.kind === "view" && <Detail rows={[["User ID", u.id], ["Mobile", `+91 ${u.mobile}`], ["Email", u.email ?? "—"], ["Joined", fmtDate(u.joined)], ["Status", <Status key="s" s={u.status} />], ["KYC", <Status key="k" s={u.kyc} />], ["Invited with", u.invite ?? "—"], ["Own invite code", u.inviteCode]]} />}
    {mode.kind === "wallet" && <div className="rounded-2xl bg-banner-gradient p-5 text-primary-foreground"><p className="text-sm">Demo Wallet Balance</p><p className="text-3xl font-extrabold">{money(u.balance)}</p><p className="mt-2 text-xs opacity-90">Sample figure only — not a real wallet.</p></div>}
    {mode.kind === "history" && <ul className="max-h-72 space-y-2 overflow-y-auto">{tx.length ? tx.map(t => <li key={t.id} className="flex items-center justify-between rounded-xl border p-2 text-sm"><span>{t.type} · {fmtDate(t.date)}</span><span className="flex items-center gap-2 font-semibold">{money(t.amount)}<Status s={t.status} /></span></li>) : <p className="py-6 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-1" />No demo history yet.</p>}</ul>}
    <p className="text-xs text-muted-foreground"><Demo /> All values are sample data.</p></DialogContent></Dialog>;
}
