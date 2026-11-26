import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Section, Status, Table, money, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, type ApiInvestment } from "@/lib/api";
import { fmtDate, useLookups } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/investments")({ head: () => meta("My Investments", "Your PowerBank investment records."), component: P });
function P() {
  const { d, me } = useMe(); const L = useLookups();
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-investments"], queryFn: () => api.get<{ investments: ApiInvestment[] }>("/me/investments"), enabled: real, staleTime: 15_000 });
  const rows: { id: string; planName: string; amount: number; daily: number; duration: number; daysCredited: number; start: string; status: string }[] = real
    ? (q.data?.investments ?? [])
    : d.investments.filter(i => i.userId === me.id).map(i => ({ ...i, planName: L.plan(i.planId)?.name ?? "—", daysCredited: 0 }));
  const { slice, pager } = usePaged(rows);
  return <Section title="My Investments" icon={Briefcase} action={<Button asChild size="sm"><Link to="/dashboard/plans">Browse plans</Link></Button>}>
    {real && q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading investments…</p>}
    {(!real || !q.isLoading) && <><Table empty={!rows.length} head={["ID", "Plan", "Amount", real ? "Daily Return" : "Illustrative label", "Duration", "Start", "Status"]}>{slice.map(i => <tr key={i.id}><td className="px-3 py-2.5">{i.id}</td><td className="px-3">{i.planName}</td><td className="px-3 font-semibold">{money(i.amount)}</td><td className="px-3">{money(i.daily)}/day</td><td className="px-3">{real ? `${i.daysCredited}/${i.duration} days` : `${i.duration} days`}</td><td className="px-3">{fmtDate(i.start)}</td><td className="px-3"><Status s={i.status} /></td></tr>)}</Table>{pager}</>}
    <p className="mt-2 text-xs text-muted-foreground">{real ? "Daily returns accrue every 24 hours to your withdrawable wallet." : "Sample records only. No returns are calculated or paid."}</p></Section>;
}
