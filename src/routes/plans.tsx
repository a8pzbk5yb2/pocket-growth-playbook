import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Crown, Gem, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import giftImg from "@/assets/powerbank-gift.webp.asset.json";
import { GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";
import { inr, plans } from "@/lib/demo-data";
export const Route = createFileRoute("/plans")({ head: () => meta("Plans", "Compare PowerBank Basic, Silver, Gold and Diamond plans."), component: Plans });
const icons = { zap: Star, star: Crown, crown: Crown, gem: Gem };
const tints = ["text-gold fill-gold/25", "text-muted-foreground fill-border", "text-gold fill-gold/25", "text-sky fill-sky/20"];
const filters = ["All Plans", "Popular", "Premium"] as const;
function Plans() {
  const [f, setF] = useState<(typeof filters)[number]>("All Plans");
  const list = plans.filter(p => f === "All Plans" || p.tag === f.toLowerCase());
  return <MobileShell>
    <GreenHeader pageTitle="Plans" title="Choose Your Plan & Start Earning Today!" image={giftImg.url} />
    <main className="pb-content"><Pills items={filters} value={f} onChange={setF} /><div className="space-y-3">
      {list.map(p => { const Icon = icons[p.icon]; return <div key={p.name} className="pb-list-card">
        <div className={`pb-plan-icon ${tints[plans.indexOf(p)] ?? ""}`}><Icon /></div>
        <div className="min-w-0 flex-1"><h2>{p.name}</h2><p className="text-[23px] font-extrabold leading-tight">{inr(p.price)}</p><p className="mt-1 text-xs">{inr(p.daily)} / day</p></div>
        <Button onClick={() => toast("Demo only — no real investment is made")} className="pb-small-cta">Invest Now<ChevronRight /></Button>
      </div>; })}
    </div></main>
  </MobileShell>;
}
