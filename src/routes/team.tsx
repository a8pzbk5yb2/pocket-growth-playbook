import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import teamImg from "@/assets/pb-team.webp.asset.json";
import { Card, GreenHeader, MobileShell, meta } from "@/components/pb/shell";
import { user } from "@/lib/demo-data";

export const Route = createFileRoute("/team")({
  head: () => meta("My Team", "Track your PowerBank team and invite friends for a bonus."),
  component: Team,
});

const benefits = ["Earn bonus on every friend who joins", "Track active team members", "Grow team income over time", "Instant referral rewards"];

function Team() {
  return (
    <MobileShell>
      <GreenHeader title="My Team Members: 0" subtitle="Build your team, grow together" image={teamImg.url} />
      <div className="space-y-4 px-5 pt-5">
        <div className="grid grid-cols-3 gap-2">
          {[["Total Team", "0"], ["Active Team", "0"], ["Team Income", "₹0"]].map(([l, v]) => (
            <Card key={l} className="p-3 text-center"><p className="text-xl font-extrabold text-primary">{v}</p><p className="text-[11px] text-muted-foreground">{l}</p></Card>
          ))}
        </div>
        <div className="rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-card">
          <p className="text-lg font-extrabold">Invite Your Friends<br />Get <span className="text-lime">₹50 Bonus</span></p>
          <button
            onClick={() => { navigator.clipboard?.writeText(user.inviteCode); toast.success("Invite code copied"); }}
            className="mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-primary"
          >Code: {user.inviteCode} <Copy className="h-4 w-4" /></button>
        </div>
        <Card>
          <h2 className="font-bold">Team Benefits</h2>
          <ul className="mt-3 space-y-2.5">
            {benefits.map((b) => <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" />{b}</li>)}
          </ul>
        </Card>
      </div>
    </MobileShell>
  );
}
