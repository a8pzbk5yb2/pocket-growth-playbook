import { createFileRoute } from "@tanstack/react-router";
import { Award, Share2, Ticket, Users } from "lucide-react";
import { useState } from "react";
import { meta } from "@/components/pb/shell";
import { Avatar, Demo, SearchBox, Section, StatCard, Table, Toolbar, money, usePaged } from "@/components/panel/ui";
import { fmtDate, useDemo } from "@/lib/demo-store";
import { DEMO_INVITE_CODES } from "@/lib/demo-data";

export const Route = createFileRoute("/admin/referrals")({ head: () => meta("Referrals", "Sample invitation codes, referral history and top referrers."), component: Referrals });
function Referrals() {
  const d = useDemo(); const [q, setQ] = useState("");
  const referred = d.users.filter(u => u.invite).reverse();
  const owner = (code: string) => d.users.find(u => u.inviteCode === code)?.name ?? "PowerBank (system)";
  const codes = DEMO_INVITE_CODES.map(c => ({ c, owner: owner(c), uses: d.users.filter(u => u.invite === c).length }));
  const top = [...codes].sort((a, b) => b.uses - a.uses);
  const rows = referred.filter(u => [u.name, u.invite ?? ""].some(x => x.toLowerCase().includes(q.toLowerCase())));
  const { slice, pager } = usePaged(rows);
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Share2} label="Total Demo Referrals" value={referred.length} /><StatCard icon={Users} label="Active Referrals" value={referred.filter(u => u.status === "active").length} /><StatCard icon={Ticket} color="bg-sky/12 text-sky" label="Referral Codes" value={codes.length} /><StatCard icon={Award} color="bg-gold/20 text-gold" label="Demo Rewards Shown" value={<>{money(referred.length * 50)}<Demo /></>} /></div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Referral Codes" icon={Ticket}><ul className="space-y-2">{codes.map(x => <li key={x.c} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-mono font-bold text-primary-deep">{x.c}</p><p className="text-xs text-muted-foreground">{x.owner}</p></div><span className="text-sm font-semibold">{x.uses} uses</span></li>)}</ul></Section>
      <Section className="xl:col-span-2" title="Referral History" icon={Share2}><Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search user or code" /></Toolbar>
        <Table empty={!rows.length} head={["User","Code Used","Referred By","Joined","Status","Demo Reward"]}>{slice.map(u => <tr key={u.id}><td className="px-3 py-2"><span className="flex items-center gap-2"><Avatar name={u.name} size="h-7 w-7" />{u.name}</span></td><td className="px-3 font-mono">{u.invite}</td><td className="px-3">{owner(u.invite!)}</td><td className="px-3">{fmtDate(u.joined)}</td><td className="px-3 capitalize">{u.status}</td><td className="px-3">{money(50)} <span className="text-[10px] text-muted-foreground">visual</span></td></tr>)}</Table>{pager}</Section>
    </div>
    <Section title="Top Referrers" icon={Award}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{top.map((x, i) => <div key={x.c} className="flex items-center gap-3 rounded-xl border p-3"><span className="text-2xl font-extrabold text-primary">#{i + 1}</span><Avatar name={x.owner} /><div><p className="text-sm font-semibold">{x.owner}</p><p className="text-xs text-muted-foreground">{x.uses} referrals · {x.c}</p></div></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Rewards are display values only — no referral payouts exist.</p></Section>
  </>;
}
