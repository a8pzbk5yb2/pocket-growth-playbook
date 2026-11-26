import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, MoreHorizontal, Plus, UserCheck, UserX, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meta } from "@/components/pb/shell";
import { Avatar, DateRange, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, StatCard, Status, Table, Toolbar, inRange, money, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiAdminUser, type ApiAdminUsersPage } from "@/lib/api";
import { downloadCsv, fmtDate, useDemo, type DemoUser, type Kyc, type UserStatus } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/users")({ head: () => meta("Users", "Manage PowerBank users and account status."), component: UsersPage });
type RowUser = { id: string; name: string; mobile: string; status: UserStatus; joined: string; city?: string; inviteCode?: string; email?: string; balance?: number; kyc?: Kyc };
type Mode = { kind: "view" | "edit" | "wallet" | "history" | "add"; u?: RowUser } | null;

function UsersPage() {
  const d = useDemo(); const qc = useQueryClient();
  const real = apiConfigured();
  const [q, setQ] = useState(""); const [dq, setDq] = useState("");
  const [st, setSt] = useState("all"); const [kyc, setKyc] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);

  const params = new URLSearchParams({ page: String(page), perPage: "15", status: st });
  if (dq.trim()) params.set("q", dq.trim());
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const apiQ = useQuery({ queryKey: ["admin-users", dq, st, from, to, page], queryFn: () => api.get<ApiAdminUsersPage>(`/admin/users?${params}`), enabled: real, staleTime: 15_000 });

  const demoRows = useMemo(() => [...d.users].reverse().filter(u => (st === "all" || u.status === st) && (kyc === "all" || u.kyc === kyc) && inRange(u.joined, from, to) && [u.name, u.mobile, u.id].some(x => x.toLowerCase().includes(q.toLowerCase()))), [d.users, q, st, kyc, from, to]);
  const demoPaged = usePaged(demoRows);
  const rows: RowUser[] = real ? (apiQ.data?.items ?? []) : demoPaged.slice;
  const counts = real && apiQ.data ? apiQ.data.counts : { total: d.users.length, active: d.users.filter(u => u.status === "active").length, inactive: d.users.filter(u => u.status === "inactive").length, blocked: d.users.filter(u => u.status === "blocked").length };
  const totalPages = real && apiQ.data ? Math.max(1, Math.ceil(apiQ.data.total / apiQ.data.perPage)) : 1;

  const setStatus = async (u: RowUser, s: UserStatus) => {
    if (!real) { d.updateUser(u.id, { status: s }); toast.success(`${u.name} is now ${s}`); return; }
    try { await api.put(`/admin/users/${u.id}`, { status: s }); void qc.invalidateQueries({ queryKey: ["admin-users"] }); void qc.invalidateQueries({ queryKey: ["admin-overview"] }); toast.success(`${u.name} is now ${s}`); }
    catch (er) { toast.error(errMessage(er)); }
  };

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Total Users" value={counts.total} /><StatCard icon={UserCheck} label="Active Users" value={counts.active} />
      <StatCard icon={UserX} color="bg-warning/15 text-orange" label="Inactive Users" value={counts.inactive} /><StatCard icon={Ban} color="bg-destructive/12 text-destructive" label="Blocked Users" value={counts.blocked} />
    </div>
    <Section title="All Users" icon={Users} action={<div className="flex gap-2"><ExportBtn onClick={() => downloadCsv(real ? "powerbank-users.csv" : "powerbank-users-demo.csv", rows.map(u => ({ id: u.id, name: u.name, mobile: u.mobile, joined: fmtDate(u.joined), status: u.status, ...(real ? { city: u.city ?? "", inviteCode: u.inviteCode ?? "" } : { email: u.email ?? "", demo_balance: u.balance ?? 0, kyc: u.kyc ?? "pending" }) })))} /><Button className="h-10 rounded-xl" onClick={() => setMode({ kind: "add" })}><Plus />Add User</Button></div>}>
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search name, mobile or ID" /><FilterSelect label="Status" value={st} onChange={v => { setSt(v); setPage(1); }} options={["active","inactive","blocked"]} />{!real && <FilterSelect label="KYC" value={kyc} onChange={setKyc} options={["verified","pending","rejected"]} />}<DateRange from={from} to={to} onFrom={v => { setFrom(v); setPage(1); }} onTo={v => { setTo(v); setPage(1); }} /></Toolbar>
      {real && apiQ.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading users…</p>}
      {real && apiQ.isError && <p className="py-8 text-center text-sm text-destructive">{errMessage(apiQ.error, "Failed to load users.")}</p>}
      {(!real || (!apiQ.isLoading && !apiQ.isError)) && <>
        <Table empty={!rows.length} head={real ? ["User","User ID","Full Name","Mobile","City","Joined","Invite Code","Status","Actions"] : ["User","User ID","Full Name","Mobile","Email","Joined","Demo Balance","Status","KYC","Actions"]}>{rows.map(u => <tr key={u.id} className="hover:bg-muted/40">
          <td className="px-3 py-2"><Avatar name={u.name} /></td><td className="px-3 font-medium">{u.id}</td><td className="px-3">{u.name}</td><td className="px-3">+91 {u.mobile}</td>
          {real ? <><td className="px-3 text-muted-foreground">{u.city || "—"}</td><td className="px-3 whitespace-nowrap">{fmtDate(u.joined)}</td><td className="px-3 font-mono text-xs">{u.inviteCode ?? "—"}</td><td className="px-3"><Status s={u.status} /></td></>
            : <><td className="px-3 text-muted-foreground">{u.email ?? "—"}</td><td className="px-3 whitespace-nowrap">{fmtDate(u.joined)}</td><td className="px-3 font-semibold">{money(u.balance ?? 0)}</td><td className="px-3"><Status s={u.status} /></td><td className="px-3"><Status s={u.kyc ?? "pending"} /></td></>}
          <td className="px-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${u.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMode({ kind: "view", u })}>View Profile</DropdownMenuItem><DropdownMenuItem onClick={() => setMode({ kind: "edit", u })}>Edit User</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode({ kind: "wallet", u })}>View Demo Wallet</DropdownMenuItem><DropdownMenuItem onClick={() => setMode({ kind: "history", u })}>View Demo History</DropdownMenuItem><DropdownMenuSeparator />
            {u.status === "blocked" ? <DropdownMenuItem onClick={() => void setStatus(u, "active")}>Unblock User</DropdownMenuItem> : <DropdownMenuItem className="text-destructive" onClick={() => void setStatus(u, "blocked")}>Block User</DropdownMenuItem>}
            {u.status === "active" ? <DropdownMenuItem onClick={() => void setStatus(u, "inactive")}>Deactivate User</DropdownMenuItem> : <DropdownMenuItem onClick={() => void setStatus(u, "active")}>Activate User</DropdownMenuItem>}
          </DropdownMenuContent></DropdownMenu></td></tr>)}</Table>
        {real && apiQ.data ? <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{apiQ.data.total ? `Showing ${(page - 1) * apiQ.data.perPage + 1}–${Math.min(page * apiQ.data.perPage, apiQ.data.total)} of ${apiQ.data.total} users` : "No users"}</span>
          <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft /></Button><span className="px-2 font-semibold text-foreground">{page} / {totalPages}</span><Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight /></Button></div></div>
          : demoPaged.pager}
      </>}
    </Section>
    <UserDialog mode={mode} real={real} close={() => setMode(null)} />
  </>;
}

function UserDialog({ mode, real, close }: { mode: Mode; real: boolean; close: () => void }) {
  const d = useDemo(); const qc = useQueryClient();
  const [name, setName] = useState(""); const [mobile, setMobile] = useState(""); const [email, setEmail] = useState(""); const [city, setCity] = useState(""); const [pw, setPw] = useState(""); const [kyc, setKyc] = useState<Kyc>("pending"); const [status, setStatus] = useState<UserStatus>("active"); const [busy, setBusy] = useState(false);

  const detailQ = useQuery({
    queryKey: ["admin-user", mode?.u?.id],
    queryFn: () => api.get<{ user: ApiAdminUser & { invitedWith: string | null; referredBy: string | null; referralCount: number } }>(`/admin/users/${mode!.u!.id}`),
    enabled: real && mode?.kind === "view" && !!mode.u?.id,
  });

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === "edit" && mode.u) {
      setName(mode.u.name); setMobile(mode.u.mobile); setEmail(mode.u.email ?? ""); setCity(mode.u.city ?? ""); setKyc(mode.u.kyc ?? "pending"); setStatus(mode.u.status); setPw("");
    } else if (mode.kind === "add") {
      setName(""); setMobile(""); setEmail(""); setCity(""); setKyc("pending"); setStatus("active"); setPw("");
    }
  }, [mode]);

  if (!mode) return null;
  if (mode.kind === "edit" || mode.kind === "add") {
    const save = async () => {
      if (!name.trim() || !/^[6-9]\d{9}$/.test(mobile)) { toast.error("Enter a name and a valid 10-digit mobile"); return; }
      if (!real) {
        const p = { name: name.trim(), mobile, kyc, ...(email ? { email } : {}) };
        if (mode.kind === "edit" && mode.u) d.updateUser(mode.u.id, p); else d.addUser({ ...p, balance: 0, status: "active" } as Omit<DemoUser, "id" | "joined" | "password" | "inviteCode">);
        toast.success(mode.kind === "edit" ? "User updated" : "Demo user added"); close(); return;
      }
      if (mode.kind === "add" && pw && pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
      setBusy(true);
      try {
        if (mode.kind === "edit" && mode.u) {
          await api.put(`/admin/users/${mode.u.id}`, { name: name.trim(), mobile, status, city: city.trim() });
          toast.success("User updated");
        } else {
          await api.post("/admin/users", { name: name.trim(), mobile, status, city: city.trim(), ...(pw ? { password: pw } : {}) });
          toast.success("User created");
        }
        void qc.invalidateQueries({ queryKey: ["admin-users"] });
        void qc.invalidateQueries({ queryKey: ["admin-overview"] });
        close();
      } catch (er) { toast.error(errMessage(er)); }
      finally { setBusy(false); }
    };
    return <Dialog open onOpenChange={o => !o && close()}><DialogContent><DialogHeader><DialogTitle>{mode.kind === "edit" ? "Edit User" : real ? "Add User" : "Add Demo User"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Full Name</Label><Input value={name} maxLength={60} onChange={e => setName(e.target.value)} /></div>
        <div><Label>Mobile (+91)</Label><Input value={mobile} inputMode="numeric" maxLength={10} onChange={e => setMobile(e.target.value.replace(/\D/g, ""))} /></div>
        {real ? <>
          <div><Label>City (optional)</Label><Input value={city} maxLength={80} onChange={e => setCity(e.target.value)} /></div>
          {mode.kind === "add" && <div><Label>Initial Password (optional — random if blank)</Label><Input type="password" value={pw} onChange={e => setPw(e.target.value)} /></div>}
          <div><Label>Status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={status} onChange={e => setStatus(e.target.value as UserStatus)}><option value="active">active</option><option value="inactive">inactive</option><option value="blocked">blocked</option></select></div>
        </> : <>
          <div><Label>Email (optional, fictional)</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label>KYC status</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={kyc} onChange={e => setKyc(e.target.value as Kyc)}><option value="verified">verified</option><option value="pending">pending</option><option value="rejected">rejected</option></select></div>
        </>}
      </div>
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Button></DialogFooter></DialogContent></Dialog>;
  }

  const u = mode.u;
  if (!u) return null;
  const det = detailQ.data?.user;
  const tx = d.transactions.filter(t => t.userId === u.id);
  return <Dialog open onOpenChange={o => !o && close()}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar name={u.name} />{u.name}</DialogTitle></DialogHeader>
    {mode.kind === "view" && (real ? (detailQ.isLoading ? <p className="py-4 text-sm text-muted-foreground">Loading details…</p> : <Detail rows={[["User ID", det?.id ?? u.id], ["Mobile", `+91 ${det?.mobile ?? u.mobile}`], ["City", det?.city || "—"], ["Joined", fmtDate(det?.joined ?? u.joined)], ["Last login", det?.lastLogin ? fmtDate(det.lastLogin, true) : "—"], ["Status", <Status key="s" s={det?.status ?? u.status} />], ["Invited with", det?.invitedWith ?? "—"], ["Own invite code", det?.inviteCode ?? u.inviteCode ?? "—"], ["Referrals", String(det?.referralCount ?? 0)]]} />)
      : <Detail rows={[["User ID", u.id], ["Mobile", `+91 ${u.mobile}`], ["Email", u.email ?? "—"], ["Joined", fmtDate(u.joined)], ["Status", <Status key="s" s={u.status} />], ["KYC", <Status key="k" s={u.kyc ?? "pending"} />], ["Own invite code", u.inviteCode ?? "—"]]} />)}
    {mode.kind === "wallet" && <div className="rounded-2xl bg-banner-gradient p-5 text-primary-foreground"><p className="text-sm">Demo Wallet Balance</p><p className="text-3xl font-extrabold">{money(u.balance ?? 0)}</p><p className="mt-2 text-xs opacity-90">Sample figure only — not a real wallet.</p></div>}
    {mode.kind === "history" && <ul className="max-h-72 space-y-2 overflow-y-auto">{tx.length ? tx.map(t => <li key={t.id} className="flex items-center justify-between rounded-xl border p-2 text-sm"><span>{t.type} · {fmtDate(t.date)}</span><span className="flex items-center gap-2 font-semibold">{money(t.amount)}<Status s={t.status} /></span></li>) : <p className="py-6 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-1" />No demo history yet.</p>}</ul>}
    {(mode.kind === "wallet" || mode.kind === "history" || !real) && <p className="text-xs text-muted-foreground"><Demo /> Sample financial data only.</p>}
  </DialogContent></Dialog>;
}
