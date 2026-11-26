import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gem } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { PlanCard } from "@/components/panel/plan-card";
import { Section } from "@/components/panel/ui";
import { api, apiConfigured, type ApiPlan } from "@/lib/api";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/plans")({ head: () => meta("Investment Plans", "PowerBank illustrative plan cards."), component: P });
function P() {
  const { d, me } = useMe();
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["plans"], queryFn: () => api.get<{ plans: ApiPlan[] }>("/plans"), enabled: real, staleTime: 60_000 });
  const list = real ? (q.data?.plans ?? []) : d.plans.filter(p => p.status === "active");
  return <Section title="Investment Plans" icon={Gem}>
    {real && q.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading plans…</p>}
    {real && q.isError && <p className="py-8 text-center text-sm text-destructive">Couldn't load plans right now.</p>}
    {(!real || (!q.isLoading && !q.isError)) && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{list.map(p => <PlanCard key={p.id} p={p}><Button className="w-full rounded-full" onClick={() => { d.requestInvestment(me.id, p); toast.success(`Demo request for ${p.name} added — no money involved`); }}>Try demo request</Button></PlanCard>)}</div>{!list.length && <p className="py-8 text-center text-sm text-muted-foreground">No active plans right now.</p>}</>}
  </Section>;
}
