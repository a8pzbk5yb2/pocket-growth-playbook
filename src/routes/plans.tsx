import { createFileRoute } from "@tanstack/react-router";
import { Crown, Gem, Star, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import giftImg from "@/assets/pb-gift.webp.asset.json";
import { GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";
import { inr, plans } from "@/lib/demo-data";

export const Route = createFileRoute("/plans")({
  head: () => meta("Plans", "Compare PowerBank Basic, Silver, Gold and Diamond plans."),
  component: Plans,
});

const icons = { zap: Zap, star: Star, crown: Crown, gem: Gem };
const tints = ["bg-secondary text-primary", "bg-muted text-sky", "bg-secondary text-gold", "bg-secondary text-violet"];
const filters = ["All Plans", "Popular", "Premium"] as const;

function Plans() {
  const [f, setF] = useState<(typeof filters)[number]>("All Plans");
  const list = plans.filter((p) => f === "All Plans" || p.tag === f.toLowerCase());
  return (
    <MobileShell>
      <GreenHeader title="Choose Your Plan & Start Earning Today!" image={giftImg.url} />
      <div className="space-y-4 px-5 pt-5">
        <Pills items={filters} value={f} onChange={setF} />
        {list.map((p, i) => {
          const Icon = icons[p.icon];
          return (
            <div key={p.name} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card">
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${tints[plans.indexOf(p)] ?? tints[i]}`}><Icon className="h-7 w-7" /></div>
              <div className="flex-1">
                <p className="font-bold">{p.name}</p>
                <p className="text-xl font-extrabold text-primary">{inr(p.price)}</p>
                <p className="text-xs text-muted-foreground">Earn {inr(p.daily)}/day</p>
              </div>
              <button onClick={() => toast("Demo only — no real investment is made")} className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground">Invest Now</button>
            </div>
          );
        })}
      </div>
    </MobileShell>
  );
}
