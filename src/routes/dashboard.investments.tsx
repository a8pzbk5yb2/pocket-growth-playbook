import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Section, Status, Table, money, usePaged } from "@/components/panel/ui";
import { fmtDate, useLookups } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/investments")({ head: () => meta("My Investments", "Your sample PowerBank investment records."), component: P });
function P() {
  const { d, me } = useMe(); const L = useLookups(); const rows = d.investments.filter(i => i.userId === me.id); const { slice, pager } = usePaged(rows);
  return <Section title="My Investments" icon={Briefcase} action={<Button asChild size="sm"><Link to="/dashboard/plans">Browse plans</Link></Button>}>
    <Table empty={!rows.length} head={["ID","Plan","Amount","Illustrative label","Duration","Start","Status"]}>{slice.map(i => <tr key={i.id}><td className="px-3 py-2.5">{i.id}</td><td className="px-3">{L.plan(i.planId)?.name ?? "—"}</td><td className="px-3 font-semibold">{money(i.amount)}</td><td className="px-3">{money(i.daily)}/day</td><td className="px-3">{i.duration} days</td><td className="px-3">{fmtDate(i.start)}</td><td className="px-3"><Status s={i.status} /></td></tr>)}</Table>{pager}
    <p className="mt-2 text-xs text-muted-foreground">Sample records only. No returns are calculated or paid.</p></Section>;
}
