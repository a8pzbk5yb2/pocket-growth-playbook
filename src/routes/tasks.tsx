import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Newspaper, PlayCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import checkImg from "@/assets/pb-checklist.webp.asset.json";
import { GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";

export const Route = createFileRoute("/tasks")({
  head: () => meta("Tasks", "Complete daily PowerBank tasks and earn bonus rewards."),
  component: Tasks,
});

const tasks = [
  { name: "Daily Login", reward: "₹2", icon: CalendarCheck, tint: "bg-primary", cat: "Daily" },
  { name: "Watch Video", reward: "₹5", icon: PlayCircle, tint: "bg-rose", cat: "Daily" },
  { name: "Share App", reward: "₹10", icon: Share2, tint: "bg-sky", cat: "Social" },
  { name: "Read News", reward: "₹3", icon: Newspaper, tint: "bg-orange", cat: "Daily" },
  { name: "Complete Survey", reward: "₹15", icon: ClipboardList, tint: "bg-violet", cat: "Special" },
];
const cats = ["All", "Daily", "Social", "Special"] as const;

function Tasks() {
  const [c, setC] = useState<(typeof cats)[number]>("All");
  const [done, setDone] = useState<string[]>([]);
  return (
    <MobileShell>
      <GreenHeader title="Complete Tasks & Earn Bonus" subtitle="New tasks every day" image={checkImg.url} />
      <div className="space-y-3 px-5 pt-5">
        <Pills items={cats} value={c} onChange={setC} />
        {tasks.filter((t) => c === "All" || t.cat === c).map((t) => (
          <div key={t.name} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
            <div className={`grid h-12 w-12 place-items-center rounded-xl text-primary-foreground ${t.tint}`}><t.icon className="h-6 w-6" /></div>
            <div className="flex-1"><p className="font-bold">{t.name}</p><p className="text-xs text-muted-foreground">Reward {t.reward}</p></div>
            <button
              disabled={done.includes(t.name)}
              onClick={() => { setDone([...done, t.name]); toast.success(`${t.name} completed (demo)`); }}
              className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >{done.includes(t.name) ? "Done" : "Go"}</button>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
