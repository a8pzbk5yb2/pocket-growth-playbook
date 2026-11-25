import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, Trophy, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import teamImg from "@/assets/powerbank-team.webp.asset.json";
import giftImg from "@/assets/powerbank-gift.webp.asset.json";
import { PageBar, MobileShell, meta } from "@/components/pb/shell";
import { user } from "@/lib/demo-data";
export const Route = createFileRoute("/team")({ head: () => meta("My Team", "Track your PowerBank team and invite friends for a bonus."), component: Team });
const benefits = ["Earn bonus on every friend who joins", "Track active team members", "Grow team income over time", "Instant referral rewards"];
function Team() {
  return <MobileShell>
    <header className="pb-green-header !pb-0"><PageBar title="My Team" /><img src={teamImg.url} alt="Your growing team" className="mx-auto h-44 w-full object-contain object-bottom" />
      <div className="relative -mt-3 flex items-center justify-center gap-3 rounded-[18px] border border-primary bg-primary-deep px-5 py-3 shadow-card"><Users className="h-7 w-7" /><div className="text-center"><p className="text-sm font-semibold">My Team Members</p><p className="text-3xl font-bold">{user.team}</p></div></div>
    </header>
    <main className="pb-content pt-4">
      <div className="grid grid-cols-3 gap-2">{[{ l: "Total Team", v: "0", i: Users }, { l: "Active Team", v: "0", i: UserCheck }, { l: "Team Income", v: "₹0.00", i: Trophy }].map(({l,v,i:Icon}) => <div key={l} className="pb-stat !min-h-24"><Icon /><p className="pb-stat-label">{l}</p><p className="pb-stat-value">{v}</p></div>)}</div>
      <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-lime bg-gradient-primary p-3 text-primary-foreground"><img src={giftImg.url} alt="" className="h-20 w-20 object-contain" /><div><h2 className="text-base font-bold leading-tight">Invite Your Friends<br />Get <span className="text-lime">₹50 Bonus</span></h2><Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(user.inviteCode); toast.success("Invite code copied"); }} className="mt-1 h-7 gap-2 px-0 text-xs text-primary-foreground hover:bg-transparent hover:text-lime">Code: {user.inviteCode}<Copy /></Button></div></div>
      <section className="pt-6"><h2 className="text-base font-bold">Team Benefits</h2><ul className="mt-4 space-y-3">{benefits.map(b => <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{b}</li>)}</ul></section>
    </main>
  </MobileShell>;
}
