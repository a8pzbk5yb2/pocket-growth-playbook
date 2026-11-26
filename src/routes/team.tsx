import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, Trophy, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import teamImg from "@/assets/powerbank-team.webp.asset.json";
import giftImg from "@/assets/powerbank-gift.webp.asset.json";
import { PageBar, MobileShell, meta } from "@/components/pb/shell";
import { Status } from "@/components/panel/ui";
import { ApiError, api, apiConfigured, type ApiReferrals } from "@/lib/api";
import { inr, user } from "@/lib/demo-data";
import { fmtDate } from "@/lib/demo-store";

export const Route = createFileRoute("/team")({ head: () => meta("My Team", "Track your PowerBank team and invite friends for a bonus."), component: Team });
const benefits = ["Earn ₹50 bonus when a friend deposits or invests", "Track active team members", "Grow team income over time", "Instant withdrawable referral rewards"];
function Team() {
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-referrals"], queryFn: () => api.get<ApiReferrals>("/me/referrals"), enabled: real, retry: false, staleTime: 30_000 });
  const unauth = real && q.isError && q.error instanceof ApiError && q.error.status === 401;
  const refs = real ? (q.data?.referrals ?? []) : [];
  const totalTeam = real ? refs.length : user.team;
  const activeTeam = real ? refs.filter(r => r.status === "active").length : 0;
  const teamIncome = real ? (q.data?.bonusEarned ?? 0) : 0;
  const inviteCode = real ? (q.data?.inviteCode ?? "—") : user.inviteCode;

  return <MobileShell>
    <header className="pb-green-header !pb-0"><PageBar title="My Team" /><img src={teamImg.url} alt="Your growing team" className="mx-auto h-44 w-full object-contain object-bottom" />
      <div className="relative -mt-3 flex items-center justify-center gap-3 rounded-[18px] border border-primary bg-primary-deep px-5 py-3 shadow-card"><Users className="h-7 w-7" /><div className="text-center"><p className="text-sm font-semibold">My Team Members</p><p className="text-3xl font-bold">{totalTeam}</p></div></div>
    </header>
    <main className="pb-content pt-4">
      <div className="grid grid-cols-3 gap-2">{[{ l: "Total Team", v: String(totalTeam), i: Users }, { l: "Active Team", v: String(activeTeam), i: UserCheck }, { l: "Team Income", v: inr(teamIncome), i: Trophy }].map(({ l, v, i: Icon }) => <div key={l} className="pb-stat !min-h-24"><Icon /><p className="pb-stat-label">{l}</p><p className="pb-stat-value">{v}</p></div>)}</div>
      {unauth ? (
        <div className="mt-4 rounded-2xl bg-card p-5 text-center shadow-card">
          <p className="text-sm text-muted-foreground">Log in to get your invite code and earn ₹50 referral bonuses.</p>
          <Button asChild className="mt-3 rounded-full"><Link to="/login">Log In</Link></Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-lime bg-gradient-primary p-3 text-primary-foreground"><img src={giftImg.url} alt="" className="h-20 w-20 object-contain" /><div><h2 className="text-base font-bold leading-tight">Invite Your Friends<br />Get <span className="text-lime">₹50 Bonus</span></h2><Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(inviteCode); toast.success("Invite code copied"); }} className="mt-1 h-7 gap-2 px-0 text-xs text-primary-foreground hover:bg-transparent hover:text-lime">Code: {inviteCode}<Copy /></Button></div></div>
      )}
      {refs.length > 0 && (
        <section className="pt-5"><h2 className="text-base font-bold">Referred Members</h2><ul className="mt-3 space-y-2">{refs.map(r => (
          <li key={r.id} className="flex items-center justify-between rounded-xl bg-card p-3 text-sm shadow-card">
            <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{fmtDate(r.joined)}</p></div>
            <div className="text-right"><Status s={r.status} />{r.reward > 0 && <p className="mt-1 text-xs font-bold text-success">+{inr(r.reward)}</p>}</div>
          </li>
        ))}</ul></section>
      )}
      <section className="pt-6"><h2 className="text-base font-bold">Team Benefits</h2><ul className="mt-4 space-y-3">{benefits.map(b => <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{b}</li>)}</ul></section>
    </main>
  </MobileShell>;
}
