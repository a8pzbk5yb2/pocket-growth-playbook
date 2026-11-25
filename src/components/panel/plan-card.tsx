import { Crown, Gem, Star, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { money } from "./ui";
import type { DemoPlan } from "@/lib/demo-store";
export const planIcons = { zap: Zap, star: Star, crown: Crown, gem: Gem };
const tints = { zap: "bg-primary/12 text-primary", star: "bg-muted text-muted-foreground", crown: "bg-gold/20 text-gold", gem: "bg-sky/15 text-sky" };
export function PlanCard({ p, children }: { p: DemoPlan; children?: ReactNode }) {
  const Icon = planIcons[p.icon];
  return <div className={`panel-card flex flex-col p-5 transition-transform hover:-translate-y-1 ${p.status === "inactive" ? "opacity-60" : ""}`}>
    <div className="flex items-center justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tints[p.icon]}`}><Icon className="h-6 w-6" /></span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{p.status}</span></div>
    <h3 className="mt-3 text-lg font-bold">{p.name}</h3><p className="text-3xl font-extrabold">{money(p.price)}</p><p className="text-sm text-primary-deep">{money(p.daily)}/day <span className="text-[10px] text-muted-foreground">illustrative</span></p>
    <p className="mt-2 flex-1 text-xs text-muted-foreground">{p.description} · {p.validity}</p>
    <p className="mt-2 text-[10px] font-semibold uppercase text-orange">Sample content · not an offer</p>
    {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
  </div>;
}
