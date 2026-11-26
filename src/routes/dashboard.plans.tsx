import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gem } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { meta } from "@/components/pb/shell";
import { PlanCard } from "@/components/panel/plan-card";
import { Section, money } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiInvestment, type ApiPlan } from "@/lib/api";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/plans")({ head: () => meta("Investment Plans", "Choose a PowerBank investment plan."), component: P });
function P() {
  const { d, me } = useMe();
  const qc = useQueryClient();
  const real = apiConfigured();
  const [confirmPlan, setConfirmPlan] = useState<ApiPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["plans"], queryFn: () => api.get<{ plans: ApiPlan[] }>("/plans"), enabled: real, staleTime: 60_000 });
  const list = real ? (q.data?.plans ?? []) : d.plans.filter(p => p.status === "active");

  const invest = async (p: ApiPlan) => {
    setBusy(true);
    try {
      await api.post<{ investment: ApiInvestment }>("/me/investments", { planId: Number(p.id) });
      invalidateMoneyQueries(qc);
      toast.success(`Invested ${money(p.price)} in ${p.name}! Daily earnings start after 24h.`);
      setConfirmPlan(null);
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  return <Section title="Investment Plans" icon={Gem}>
    {real && q.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading plans…</p>}
    {real && q.isError && <p className="py-8 text-center text-sm text-destructive">Couldn't load plans right now.</p>}
    {(!real || (!q.isLoading && !q.isError)) && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{list.map(p => <PlanCard key={p.id} p={p}><Button className="w-full rounded-full" onClick={() => {
      if (!real) { d.requestInvestment(me.id, p); toast.success(`Demo request for ${p.name} added — no money involved`); return; }
      setConfirmPlan(p);
    }}>{real ? "Invest Now" : "Try demo request"}</Button></PlanCard>)}</div>{!list.length && <p className="py-8 text-center text-sm text-muted-foreground">No active plans right now.</p>}</>}
    {confirmPlan && <Dialog open onOpenChange={() => !busy && setConfirmPlan(null)}><DialogContent>
      <DialogHeader><DialogTitle>Confirm Investment</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Invest <b>{money(confirmPlan.price)}</b> in <b>{confirmPlan.name}</b>? Returns <b>{money(confirmPlan.daily)}/day</b> for {confirmPlan.duration} days into your withdrawable balance.</p>
      <DialogFooter className="gap-2">
        <Button variant="outline" disabled={busy} onClick={() => setConfirmPlan(null)}>Cancel</Button>
        <Button disabled={busy} onClick={() => void invest(confirmPlan)}>{busy ? "Investing…" : `Pay ${money(confirmPlan.price)}`}</Button>
      </DialogFooter>
    </DialogContent></Dialog>}
  </Section>;
}
