import { createFileRoute } from "@tanstack/react-router";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Avatar, Section, Status } from "@/components/panel/ui";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/referrals")({ head: () => meta("Referrals", "Your invitation code and sample referrals."), component: P });
function P() {
  const { d, me } = useMe(); const refs = d.users.filter(u => u.invite === me.inviteCode);
  return <Section title="Referrals" icon={Share2}><div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-banner-gradient p-5 text-primary-foreground"><div className="flex-1"><p className="text-sm">Your invitation code</p><p className="font-mono text-2xl font-extrabold">{me.inviteCode}</p></div><Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(me.inviteCode); toast.success("Code copied"); }}><Copy />Copy</Button></div>
    {me.invite && <p className="mb-3 text-sm text-muted-foreground">You joined with code <b>{me.invite}</b>.</p>}
    <ul className="space-y-2">{refs.map(u => <li key={u.id} className="flex items-center gap-3 rounded-xl border p-3"><Avatar name={u.name} /><span className="flex-1">{u.name}<br /><span className="text-xs text-muted-foreground">{fmtDate(u.joined)}</span></span><Status s={u.status} /></li>)}</ul>{!refs.length && <p className="py-6 text-center text-sm text-muted-foreground">No referrals yet. Share your code — no payouts exist in this demo.</p>}</Section>;
}
