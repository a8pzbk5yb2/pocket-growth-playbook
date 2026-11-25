import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Briefcase, ChevronRight, Headphones, Info, KeyRound, Landmark, LogOut, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { Card, Logo, MobileShell, meta } from "@/components/pb/shell";
import { inr, user } from "@/lib/demo-data";

export const Route = createFileRoute("/me")({
  head: () => meta("Profile", "Your PowerBank profile, earnings and account settings."),
  component: Me,
});

const menu = [
  { l: "My Investments", i: Briefcase }, { l: "Bank/UPI Details", i: Landmark }, { l: "Contact Support", i: Headphones },
  { l: "Change Password", i: KeyRound }, { l: "News & Updates", i: Newspaper }, { l: "About Us", i: Info },
];

function Me() {
  return (
    <MobileShell>
      <header className="rounded-b-[50%_3rem] bg-gradient-primary px-5 pb-16 pt-6"><Logo /></header>
      <div className="-mt-12 flex flex-col items-center px-5 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-3xl font-extrabold text-primary shadow-card ring-4 ring-card">RK</div>
        <h1 className="mt-3 text-xl font-extrabold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary"><BadgeCheck className="h-4 w-4" />Active Member</span>
      </div>
      <div className="space-y-4 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center"><p className="text-lg font-extrabold text-primary">{inr(user.earnings)}</p><p className="text-xs text-muted-foreground">Total Earnings</p></Card>
          <Card className="text-center"><p className="text-lg font-extrabold text-primary">{user.team}</p><p className="text-xs text-muted-foreground">Team Members</p></Card>
        </div>
        <Card className="divide-y py-1">
          {menu.map(({ l, i: I }) => (
            <button key={l} onClick={() => toast(`${l} — coming soon`)} className="flex w-full items-center gap-3 py-3 text-left">
              <I className="h-5 w-5 text-primary" /><span className="flex-1 text-sm font-semibold">{l}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <Link to="/login" className="flex items-center gap-3 py-3 text-destructive"><LogOut className="h-5 w-5" /><span className="text-sm font-semibold">Logout</span></Link>
        </Card>
      </div>
    </MobileShell>
  );
}
