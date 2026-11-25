import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Newspaper, PlayCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import checkImg from "@/assets/powerbank-tasks.webp.asset.json";
import { GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";
export const Route = createFileRoute("/tasks")({ head: () => meta("Tasks", "Complete daily PowerBank tasks and earn bonus rewards."), component: Tasks });
const tasks = [
  { name: "Daily Login", reward: "₹2", icon: CalendarCheck, tint: "text-rose bg-rose/10", cat: "Daily" },
  { name: "Watch Video", reward: "₹5", icon: PlayCircle, tint: "text-rose bg-rose/10", cat: "Daily" },
  { name: "Share App", reward: "₹10", icon: Share2, tint: "text-sky bg-sky/10", cat: "Social" },
  { name: "Read News", reward: "₹3", icon: Newspaper, tint: "text-sky bg-sky/10", cat: "Daily" },
  { name: "Complete Survey", reward: "₹15", icon: ClipboardList, tint: "text-violet bg-violet/10", cat: "Special" },
];
const cats = ["All", "Daily", "Social", "Special"] as const;
function Tasks() {
  const [c, setC] = useState<(typeof cats)[number]>("All");
  const [done, setDone] = useState<string[]>([]);
  return <MobileShell><GreenHeader pageTitle="Task" title="Complete Tasks & Earn Bonus" image={checkImg.url} />
    <main className="pb-content"><Pills items={cats} value={c} onChange={setC} /><div className="space-y-3">
      {tasks.filter(t => c === "All" || t.cat === c).map(t => <div key={t.name} className="pb-list-card !min-h-[76px]">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${t.tint}`}><t.icon className="h-7 w-7" /></div>
        <div className="min-w-0 flex-1"><h2>{t.name}</h2><p className="mt-1 text-xs text-muted-foreground">Get {t.reward} Bonus</p></div>
        <Button disabled={done.includes(t.name)} onClick={() => { setDone([...done, t.name]); toast.success(`${t.name} completed (demo)`); }} className="pb-small-cta min-w-16">{done.includes(t.name) ? "Done" : "Go"}</Button>
      </div>)}
    </div></main>
  </MobileShell>;
}
