import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Plus, Share2, Ticket, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { meta } from "@/components/pb/shell";
import { Avatar, Demo, SearchBox, Section, StatCard, Status, Table, Toolbar, money, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, type ApiAdminReferrals } from "@/lib/api";
import { fmtDate, useDemo } from "@/lib/demo-store";
import { DEMO_INVITE_CODES } from "@/lib/demo-data";

export const Route = createFileRoute("/admin/referrals")({ head: () => meta("Referrals", "Invitation codes, referral history and top referrers."), component: Referrals });
function Referrals() {
  const d = useDemo(); const qc = useQueryClient();
  const real = apiConfigured();
  const [q, setQ] = useState(""); const [dq, setDq] = useState("");
  const [newCode, setNewCode] = useState(""); const [maxUses, setMaxUses] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);
  const apiQ = useQuery({ queryKey: ["admin-referrals", dq], queryFn: () => api.get<ApiAdminReferrals>(`/admin/referrals?q=${encodeURIComponent(dq.trim())}`), enabled: real, staleTime: 20_000 });

  const demoReferred = d.users.filter(u => u.invite).reverse();
  const owner = (code: string) => d.users.find(u => u.inviteCode === code)?.name ?? "PowerBank (system)";
  const demoCodes = DEMO_INVITE_CODES.map(c => ({ id: c, code: c, owner: owner(c), uses: d.users.filter(u => u.invite === c).length, maxUses: null as number | null, status: "active" as const }));
  const demoRows = demoReferred.filter(u => [u.name, u.invite ?? ""].some(x => x.toLowerCase().includes(q.toLowerCase()))).map(u => ({ userId: u.id, userName: u.name, code: u.invite!, referredBy: owner(u.invite!), joined: u.joined, status: u.status }));

  const codes = real ? (apiQ.data?.codes ?? []) : demoCodes;
  const rows = real ? (apiQ.data?.referrals ?? []) : demoRows;
  const top = real ? (apiQ.data?.topReferrers ?? []) : [...demoCodes].sort((a, b) => b.uses - a.uses);
  const { slice, pager } = usePaged(rows);

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) { toast.error("Code must be 3–20 letters or numbers"); return; }
    setBusy(true);
    try {
      await api.post("/admin/invitation-codes", { code, ...(maxUses.trim() ? { maxUses: Number(maxUses) } : {}) });
      setNewCode(""); setMaxUses("");
      void qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success(`Created code ${code}`);
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  const toggleCode = async (id: string, cur: "active" | "disabled") => {
    try {
      await api.put(`/admin/invitation-codes/${id}`, { status: cur === "active" ? "disabled" : "active" });
      void qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Code status updated");
    } catch (er) { toast.error(errMessage(er)); }
  };

  const totalCount = real ? (apiQ.data?.stats.total ?? 0) : demoReferred.length;
  const activeCount = real ? (apiQ.data?.stats.active ?? 0) : demoReferred.filter(u => u.status === "active").length;

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Share2} label={real ? "Total Referrals" : "Total Demo Referrals"} value={totalCount} />
      <StatCard icon={Users} label="Active Referrals" value={activeCount} />
      <StatCard icon={Ticket} color="bg-sky/12 text-sky" label="Referral Codes" value={real ? (apiQ.data?.stats.codes ?? 0) : codes.length} />
      <StatCard icon={Award} color="bg-gold/20 text-gold" label="Demo Rewards Shown" value={<>{money(totalCount * 50)}<Demo /></>} />
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Referral Codes" icon={Ticket}>
        {real && <form className="mb-3 flex gap-2" onSubmit={e => void createCode(e)}>
          <Input value={newCode} maxLength={20} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="NEWCODE" aria-label="New code" />
          <Input className="w-24" type="number" min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Max" aria-label="Max uses" />
          <Button size="icon" type="submit" disabled={busy} aria-label="Create code"><Plus /></Button>
        </form>}
        <ul className="max-h-96 space-y-2 overflow-y-auto">{codes.map(x => <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl border p-3"><div><p className="font-mono font-bold text-primary-deep">{x.code}</p><p className="text-xs text-muted-foreground">{x.owner}{x.maxUses ? ` · max ${x.maxUses}` : ""}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{x.uses} uses</span>{real && <Button size="sm" variant="outline" onClick={() => void toggleCode(x.id, x.status)}>{x.status === "active" ? "Disable" : "Enable"}</Button>}</div></li>)}</ul>
      </Section>
      <Section className="xl:col-span-2" title="Referral History" icon={Share2}><Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search user or code" /></Toolbar>
        {real && apiQ.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading referrals…</p>}
        {(!real || !apiQ.isLoading) && <><Table empty={!rows.length} head={["User","Code Used","Referred By","Joined","Status","Demo Reward"]}>{slice.map(u => <tr key={u.userId}><td className="px-3 py-2"><span className="flex items-center gap-2"><Avatar name={u.userName} size="h-7 w-7" />{u.userName}</span></td><td className="px-3 font-mono">{u.code}</td><td className="px-3">{u.referredBy}</td><td className="px-3">{fmtDate(u.joined)}</td><td className="px-3"><Status s={u.status} /></td><td className="px-3">{money(50)} <span className="text-[10px] text-muted-foreground">visual</span></td></tr>)}</Table>{pager}</>}
      </Section>
    </div>
    <Section title="Top Referrers" icon={Award}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{top.map((x, i) => <div key={x.id} className="flex items-center gap-3 rounded-xl border p-3"><span className="text-2xl font-extrabold text-primary">#{i + 1}</span><Avatar name={x.owner} /><div><p className="text-sm font-semibold">{x.owner}</p><p className="text-xs text-muted-foreground">{x.uses} referrals · {x.code}</p></div></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Rewards are display values only — no referral payouts exist.</p></Section>
  </>;
}
