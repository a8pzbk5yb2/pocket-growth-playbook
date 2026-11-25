import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Briefcase, ChevronRight, Headphones, Info, KeyRound, Landmark, LogOut, Newspaper, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import avatar from "@/assets/powerbank-avatar.webp.asset.json";
import { PageBar, MobileShell, meta } from "@/components/pb/shell";
import { inr, user } from "@/lib/demo-data";
export const Route = createFileRoute("/me")({ head: () => meta("Profile", "Your PowerBank profile, earnings and account settings."), component: Me });
const menu = [{ l: "My Investments", i: Briefcase }, { l: "Bank/UPI Details", i: Landmark }, { l: "Contact Support", i: Headphones }, { l: "Change Password", i: KeyRound }, { l: "News & Updates", i: Newspaper }, { l: "About Us", i: Info }];
function Me() {
  return <MobileShell>
    <header className="rounded-b-[50%_16px] bg-gradient-primary px-4 pb-14 text-primary-foreground"><PageBar title="Me" /></header>
    <div className="relative -mt-12 flex flex-col items-center text-center"><div className="h-24 w-24 overflow-hidden rounded-full border-[3px] border-card bg-secondary shadow-card"><img src={avatar.url} alt="Riyaj Khan" className="h-full w-full object-contain object-bottom" /></div><h1 className="mt-2 text-xl font-bold">{user.name}</h1><p className="text-xs text-muted-foreground">User ID: {user.id}</p><span className="mt-2 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground"><BadgeCheck className="h-3 w-3" />Active Member</span></div>
    <main className="pb-content pt-4"><div className="mb-4 grid grid-cols-2 gap-3"><div className="pb-stat !min-h-24"><Trophy /><p className="pb-stat-label">Total Earnings</p><p className="pb-stat-value">{inr(user.earnings)}</p></div><div className="pb-stat !min-h-24"><Users /><p className="pb-stat-label">Team Members</p><p className="pb-stat-value">{user.team}</p></div></div>
      <div className="pb-menu">{menu.map(({l,i:Icon}) => <Button variant="ghost" key={l} onClick={() => toast(`${l} — coming soon`)} className="pb-menu-row"><Icon /><span>{l}</span><ChevronRight /></Button>)}<Button variant="ghost" asChild className="pb-menu-row text-destructive"><Link to="/login"><LogOut className="!text-destructive" /><span>Logout</span><ChevronRight /></Link></Button></div>
    </main>
  </MobileShell>;
}
