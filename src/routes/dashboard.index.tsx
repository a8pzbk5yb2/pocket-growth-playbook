import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bell, Briefcase, Copy, Gem, Share2, TrendingUp, User, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import art from "@/assets/powerbank-home.webp.asset.json";
import { meta } from "@/components/pb/shell";
import { PlanCard } from "@/components/panel/plan-card";
import { Demo, Section, StatCard, Status, money } from "@/components/panel/ui";
import { fmtDate, notesFor, useLookups } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/")({ head: () => meta("Dashboard", "Your PowerBank demo balance, plans and activity."), component: Dash });
const more = (to: "/dashboard/investments" | "/dashboard/plans" | "/dashboard/transactions" | "/dashboard/notifications" | "/dashboard/referrals" | "/dashboard/profile") => <Link to={to} className="text-sm font-semibold text-primary">View All →</Link>;
function Dash() {
  const { d, me } = useMe(); const L = useLookups();
  const inv = d.investments.filter(i => i.userId === me.id); const tx = d.transactions.filter(t => t.userId === me.id);
  const refs = d.users.filter(u => u.invite === me.inviteCode).length; const notes = notesFor(d.notifications, me.id);
  return <>
    <div className="relative overflow-hidden rounded-2xl bg-banner-gradient p-6 text-primary-foreground shadow-soft"><h2 className="text-2xl font-extrabold md:text-3xl">Welcome back, {me.name}!</h2><p className="mt-1 text-primary-foreground/90">Here's your demo account at a glance. All figures are sample data.</p><img src={art.url} alt="" className="absolute -bottom-3 right-3 hidden h-32 md:block" /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Wallet} label="Demo Wallet Balance" value={<>{money(me.balance)}<Demo /></>} /><StatCard icon={Briefcase} color="bg-sky/12 text-sky" label="Total Demo Investments" value={<>{money(inv.reduce((a, i) => a + i.amount, 0))}<Demo /></>} /><StatCard icon={TrendingUp} color="bg-gold/20 text-gold" label="Demo Earnings" value={<>{money(0)}<Demo /></>} /><StatCard icon={Users} color="bg-violet/12 text-violet" label="Referral Count" value={refs} /></div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="My Investments" icon={Briefcase} action={more("/dashboard/investments")}>{inv.length ? <ul className="space-y-2">{inv.slice(0, 4).map(i => <li key={i.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>{L.plan(i.planId)?.name ?? "Plan"}<br /><span className="text-xs text-muted-foreground">{fmtDate(i.start)}</span></span><span className="text-right font-semibold">{money(i.amount)}<br /><Status s={i.status} /></span></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">No demo investments yet. Pick a plan to try the flow.</p>}</Section>
      <Section title="Recent Transactions" icon={Activity} action={more("/dashboard/transactions")}>{tx.length ? <ul className="space-y-2">{tx.slice(0, 4).map(t => <li key={t.id} className="flex items-center justify-between text-sm"><span>{t.type}<br /><span className="text-xs text-muted-foreground">{fmtDate(t.date, true)}</span></span><span className="text-right font-semibold">{money(t.amount)}<br /><Status s={t.status} /></span></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">No sample transactions yet.</p>}</Section>
      <Section title="Notifications" icon={Bell} action={more("/dashboard/notifications")}><ul className="space-y-2">{notes.slice(0, 4).map(n => <li key={n.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{!n.readBy.includes(me.id) && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />}{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></li>)}</ul></Section>
    </div>
    <Section title="Available Plans" icon={Gem} action={more("/dashboard/plans")}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{d.plans.filter(p => p.status === "active").map(p => <PlanCard key={p.id} p={p} />)}</div></Section>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Recent Activity" icon={Activity}><ul className="space-y-2 text-sm"><li>Signed in to the demo · just now</li><li>Joined PowerBank · {fmtDate(me.joined)}</li>{d.requests.filter(r => r.userId === me.id).slice(0, 3).map(r => <li key={r.id} className="capitalize">{r.kind} request {r.id} · {r.status}</li>)}</ul></Section>
      <Section title="Referral Information" icon={Share2} action={more("/dashboard/referrals")}><p className="text-sm text-muted-foreground">Your invitation code</p><div className="mt-1 flex items-center gap-2"><span className="rounded-xl bg-secondary px-4 py-2 font-mono text-lg font-bold text-primary-deep">{me.inviteCode}</span><Button size="icon" variant="outline" aria-label="Copy code" onClick={() => { void navigator.clipboard?.writeText(me.inviteCode); toast.success("Code copied"); }}><Copy /></Button></div><p className="mt-2 text-xs text-muted-foreground">{refs} demo referrals · no referral payouts exist</p></Section>
      <Section title="Profile Settings" icon={User} action={more("/dashboard/profile")}><p className="text-sm"><b>{me.name}</b></p><p className="text-sm text-muted-foreground">ID {me.id} · +91 {me.mobile}</p><div className="mt-2 flex gap-2"><Status s={me.status} /><Status s={me.kyc} /></div></Section>
    </div>
  </>;
}
