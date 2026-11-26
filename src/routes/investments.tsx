import { SignedIn } from "@/components/pb/signed-in";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell, PageBar, meta } from "@/components/pb/shell";
import { Status } from "@/components/panel/ui";
import { api, apiConfigured, type ApiInvestment } from "@/lib/api";
import { inr } from "@/lib/demo-data";
import { fmtDate, useLookups } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/investments")({ head: () => meta("My Investments", "Your PowerBank investment records."), component: () => <SignedIn title="My Investments"><P /></SignedIn> });
function P() {
  const { d, me } = useMe(); const L = useLookups(); const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-investments"], queryFn: () => api.get<{ investments: ApiInvestment[] }>("/me/investments"), enabled: real, staleTime: 15_000 });
  const rows: { id: string; planName: string; amount: number; daily: number; duration: number; daysCredited: number; start: string; status: string }[] = real
    ? (q.data?.investments ?? [])
    : d.investments.filter(i => i.userId === me.id).map(i => ({ ...i, planName: L.plan(i.planId)?.name ?? "—", daysCredited: 0 }));
  return <MobileShell>
    <header className="pb-green-header"><PageBar title="My Investments" backTo="/me" /></header>
    <main className="pb-content space-y-2">
      {real && q.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        : rows.length ? rows.map(i => <div key={i.id} className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-bold"><Briefcase className="h-4 w-4 text-primary" />{i.planName}</p><Status s={i.status} /></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{inr(i.amount)}</p></div><div><p className="text-muted-foreground">Daily</p><p className="font-semibold text-success">{inr(i.daily)}</p></div><div><p className="text-muted-foreground">Days</p><p className="font-semibold">{real ? `${i.daysCredited}/${i.duration}` : i.duration}</p></div></div>
          <p className="mt-2 text-[11px] text-muted-foreground">{i.id} · Started {fmtDate(i.start)}</p></div>)
        : <div className="rounded-2xl bg-card p-6 text-center shadow-card"><p className="text-sm text-muted-foreground">No investments yet.</p><Button asChild className="mt-3 rounded-full"><Link to="/plans">Browse Plans</Link></Button></div>}
    </main>
  </MobileShell>;
}
