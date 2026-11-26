import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Crown, Gem, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import giftImg from "@/assets/powerbank-gift.webp.asset.json";
import { GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";
import { ApiError, api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiInvestment, type ApiPlan } from "@/lib/api";
import { inr, plans as demoPlans } from "@/lib/demo-data";

export const Route = createFileRoute("/plans")({ head: () => meta("Plans", "Compare PowerBank Basic, Silver, Gold and Diamond plans."), component: Plans });
const icons = { zap: Star, star: Crown, crown: Crown, gem: Gem };
const tints = ["text-gold fill-gold/25", "text-muted-foreground fill-border", "text-gold fill-gold/25", "text-sky fill-sky/20"];
const filters = ["All Plans", "Popular", "Premium"] as const;

type DisplayPlan = { id: string; name: string; price: number; daily: number; duration?: number; icon: "zap" | "star" | "crown" | "gem"; tag: string };

function Plans() {
  const real = apiConfigured();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<(typeof filters)[number]>("All Plans");
  const [confirmPlan, setConfirmPlan] = useState<DisplayPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["plans"], queryFn: () => api.get<{ plans: ApiPlan[] }>("/plans"), enabled: real, staleTime: 60_000 });

  const allPlans: DisplayPlan[] = real
    ? (q.data?.plans ?? []).map(p => ({
        id: p.id, name: p.name, price: p.price, daily: p.daily, duration: p.duration, icon: p.icon,
        tag: p.price >= 1000 ? "premium" : p.price >= 500 ? "popular" : "all",
      }))
    : demoPlans.map((p, idx) => ({ id: String(idx + 1), name: p.name, price: p.price, daily: p.daily, icon: p.icon, tag: p.tag }));

  const list = allPlans.filter(p => f === "All Plans" || p.tag === f.toLowerCase());

  const invest = async (p: DisplayPlan) => {
    setBusy(true);
    try {
      await api.post<{ investment: ApiInvestment }>("/me/investments", { planId: Number(p.id) });
      invalidateMoneyQueries(qc);
      toast.success(`Invested ${inr(p.price)} in ${p.name}! Daily earnings start after 24h.`);
      setConfirmPlan(null);
    } catch (er) {
      if (er instanceof ApiError && er.status === 401) {
        setConfirmPlan(null);
        toast.error("Please log in to invest");
        void nav({ to: "/login" });
        return;
      }
      toast.error(errMessage(er));
    } finally { setBusy(false); }
  };

  return <MobileShell>
    <GreenHeader pageTitle="Plans" title="Choose Your Plan & Start Earning Today!" image={giftImg.url} />
    <main className="pb-content"><Pills items={filters} value={f} onChange={setF} />
      {real && q.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading plans…</p>}
      {real && q.isError && <p className="py-8 text-center text-sm text-destructive">Couldn't load plans right now.</p>}
      {(!real || (!q.isLoading && !q.isError)) && <div className="space-y-3">
        {list.map((p, idx) => { const Icon = icons[p.icon]; return <div key={p.id} className="pb-list-card">
          <div className={`pb-plan-icon ${tints[idx % tints.length] ?? ""}`}><Icon /></div>
          <div className="min-w-0 flex-1"><h2>{p.name}</h2><p className="text-[23px] font-extrabold leading-tight">{inr(p.price)}</p><p className="mt-1 text-xs">{inr(p.daily)} / day{p.duration ? ` · ${p.duration} days` : ""}</p></div>
          <Button onClick={() => { if (!real) { toast("Demo only — no real investment is made"); return; } setConfirmPlan(p); }} className="pb-small-cta">Invest Now<ChevronRight /></Button>
        </div>; })}
        {!list.length && <p className="py-8 text-center text-sm text-muted-foreground">No plans available in this category.</p>}
      </div>}
    </main>
    {confirmPlan && <Dialog open onOpenChange={() => !busy && setConfirmPlan(null)}><DialogContent>
      <DialogHeader><DialogTitle>Confirm Investment</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Invest <b>{inr(confirmPlan.price)}</b> in <b>{confirmPlan.name}</b>? You will earn <b>{inr(confirmPlan.daily)}/day</b> for {confirmPlan.duration ?? 30} days directly into your withdrawable wallet.</p>
      <DialogFooter className="gap-2">
        <Button variant="outline" disabled={busy} onClick={() => setConfirmPlan(null)}>Cancel</Button>
        <Button disabled={busy} onClick={() => void invest(confirmPlan)}>{busy ? "Investing…" : `Pay ${inr(confirmPlan.price)}`}</Button>
      </DialogFooter>
    </DialogContent></Dialog>}
  </MobileShell>;
}
