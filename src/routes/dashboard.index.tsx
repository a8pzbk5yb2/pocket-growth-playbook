import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, Briefcase, Copy, Gem, Share2, TrendingUp, User, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import art from "@/assets/powerbank-home.webp.asset.json";
import { meta } from "@/components/pb/shell";
import { PlanCard } from "@/components/panel/plan-card";
import { Demo, Section, StatCard, Status, money } from "@/components/panel/ui";
import { api, apiConfigured, type ApiDashboard } from "@/lib/api";
import { fmtDate, notesFor, useLookups } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/")({ head: () => meta("Dashboard", "Your PowerBank balance, plans and activity."), component: Dash });
const more = (to: "/dashboard/investments" | "/dashboard/plans" | "/dashboard/transactions" | "/dashboard/notifications" | "/dashboard/referrals" | "/dashboard/profile") => <Link to={to} className="text-sm font-semibold text-primary">View All →</Link>;

function Dash() {
  const { d, me } = useMe(); const L = useLookups();
  const real = apiConfigured();
  const { data: dash } = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: real, staleTime: 30_000 });

  const demoInv = d.investments.filter(i => i.userId === me.id);
  const demoTx = d.transactions.filter(t => t.userId === me.id);
  const availBal = real && dash ? dash.wallet.availableBalance : me.balance;
  const totalInv = real && dash ? dash.totalInvested : demoInv.reduce((a, i) => a + i.amount, 0);
  const totalEarn = real && dash ? dash.wallet.totalEarned : 0;
  const inv = real && dash ? dash.investments.map(i => ({ id: i.id, name: i.planName, start: i.start, amount: i.amount, status: i.status })) : demoInv.map(i => ({ id: i.id, name: L.plan(i.planId)?.name ?? "Plan", start: i.start, amount: i.amount, status: i.status }));
  const tx = real && dash ? dash.recentTransactions.map(t => ({ id: t.id, type: t.type, date: t.date, amount: t.amount, status: t.status, dir: t.direction })) : demoTx.map(t => ({ id: t.id, type: t.type, date: t.date, amount: t.amount, status: t.status, dir: "credit" as const }));
  const refs = real && dash ? dash.referralCount : d.users.filter(u => u.invite === me.inviteCode).length;
  const notes = real && dash ? dash.recentNotifications.map(n => ({ id: n.id, title: n.title, body: n.body, unread: !n.read })) : notesFor(d.notifications, me.id).slice(0, 4).map(n => ({ id: n.id, title: n.title, body: n.body, unread: !n.readBy.includes(me.id) }));
  const plans = real && dash ? dash.plans : d.plans.filter(p => p.status === "active");
  const inviteCode = real && dash ? dash.inviteCode : me.inviteCode;

  return <>
    <div className="relative overflow-hidden rounded-2xl bg-banner-gradient p-6 text-primary-foreground shadow-soft"><h2 className="text-2xl font-extrabold md:text-3xl">Welcome back, {me.name}!</h2><p className="mt-1 text-primary-foreground/90">{real ? "Your wallet, active investments, referrals and notifications are live." : "Here's your demo account at a glance. All figures are sample data."}</p><img src={art.url} alt="" className="absolute -bottom-3 right-3 hidden h-32 md:block" /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Wallet} label={real ? "Available Balance" : "Demo Wallet Balance"} value={<>{money(availBal)}<Demo /></>} />
      <StatCard icon={Briefcase} color="bg-sky/12 text-sky" label={real ? "Total Invested" : "Total Demo Investments"} value={<>{money(totalInv)}<Demo /></>} />
      <StatCard icon={TrendingUp} color="bg-gold/20 text-gold" label={real ? "Total Earnings" : "Demo Earnings"} value={<>{money(totalEarn)}<Demo /></>} />
      <StatCard icon={Users} color="bg-violet/12 text-violet" label="Referral Count" value={refs} />
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="My Investments" icon={Briefcase} action={more("/dashboard/investments")}>{inv.length ? <ul className="space-y-2">{inv.slice(0, 4).map(i => <li key={i.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>{i.name}<br /><span className="text-xs text-muted-foreground">{fmtDate(i.start)}</span></span><span className="text-right font-semibold">{money(i.amount)}<br /><Status s={i.status} /></span></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">{real ? "No investments yet. Pick a plan to start earning." : "No demo investments yet. Pick a plan to try the flow."}</p>}</Section>
      <Section title="Recent Transactions" icon={Activity} action={more("/dashboard/transactions")}>{tx.length ? <ul className="space-y-2">{tx.slice(0, 4).map(t => <li key={t.id} className="flex items-center justify-between text-sm"><span>{t.type}<br /><span className="text-xs text-muted-foreground">{fmtDate(t.date, true)}</span></span><span className="text-right font-semibold">{real ? (t.dir === "credit" ? "+" : "-") : ""}{money(t.amount)}<br /><Status s={t.status} /></span></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">{real ? "No transactions yet." : "No sample transactions yet."}</p>}</Section>
      <Section title="Notifications" icon={Bell} action={more("/dashboard/notifications")}>{notes.length ? <ul className="space-y-2">{notes.slice(0, 4).map(n => <li key={n.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{n.unread && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />}{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}</Section>
    </div>
    <Section title="Available Plans" icon={Gem} action={more("/dashboard/plans")}>{plans.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{plans.map(p => <PlanCard key={p.id} p={p} />)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No active plans right now.</p>}</Section>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Recent Activity" icon={Activity}><ul className="space-y-2 text-sm"><li>Signed in · just now</li><li>Joined PowerBank · {fmtDate(me.joined)}</li>{real ? tx.slice(0, 3).map(t => <li key={t.id}>{t.type} · {money(t.amount)} ({t.status})</li>) : d.requests.filter(r => r.userId === me.id).slice(0, 3).map(r => <li key={r.id} className="capitalize">{r.kind} request {r.id} · {r.status}</li>)}</ul></Section>
      <Section title="Referral Information" icon={Share2} action={more("/dashboard/referrals")}><p className="text-sm text-muted-foreground">Your invitation code</p><div className="mt-1 flex items-center gap-2"><span className="rounded-xl bg-secondary px-4 py-2 font-mono text-lg font-bold text-primary-deep">{inviteCode}</span><Button size="icon" variant="outline" aria-label="Copy code" onClick={() => { void navigator.clipboard?.writeText(inviteCode); toast.success("Code copied"); }}><Copy /></Button></div><p className="mt-2 text-xs text-muted-foreground">{real ? `${refs} referrals · earn ₹50 bonus per active referral` : `${refs} referrals · no referral payouts exist`}</p></Section>
      <Section title="Profile Settings" icon={User} action={more("/dashboard/profile")}><p className="text-sm"><b>{me.name}</b></p><p className="text-sm text-muted-foreground">ID {me.id} · +91 {me.mobile}</p><div className="mt-2 flex gap-2"><Status s={me.status} />{!real && <Status s={me.kyc} />}</div></Section>
    </div>
  </>;
}
