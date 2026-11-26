import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/pb/shell";
import { Avatar, Section, Status, money } from "@/components/panel/ui";
import { api, apiConfigured, type ApiReferrals } from "@/lib/api";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/referrals")({ head: () => meta("Referrals", "Your invitation code and referrals."), component: P });
function P() {
  const { d, me } = useMe();
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-referrals"], queryFn: () => api.get<ApiReferrals>("/me/referrals"), enabled: real, staleTime: 30_000 });
  const inviteCode = real && q.data ? q.data.inviteCode : me.inviteCode;
  const refs = real
    ? (q.data?.referrals ?? [])
    : d.users.filter(u => u.invite === me.inviteCode).map(u => ({ id: u.id, name: u.name, status: u.status, reward: 0, joined: u.joined }));
  return <Section title="Referrals" icon={Share2}>
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-banner-gradient p-5 text-primary-foreground">
      <div className="flex-1"><p className="text-sm">Your invitation code</p><p className="font-mono text-2xl font-extrabold">{inviteCode}</p>{real && q.data && <p className="mt-1 text-xs text-primary-foreground/85">Total bonus earned: <b>{money(q.data.bonusEarned)}</b> (₹50 per qualifying friend)</p>}</div>
      <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(inviteCode); toast.success("Code copied"); }}><Copy />Copy</Button>
    </div>
    {real && q.data?.invitedBy && <p className="mb-3 text-sm text-muted-foreground">You joined with code <b>{q.data.invitedBy.code}</b> ({q.data.invitedBy.name}).</p>}
    {!real && me.invite && <p className="mb-3 text-sm text-muted-foreground">You joined with code <b>{me.invite}</b>.</p>}
    {real && q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading referrals…</p>}
    {real && q.isError && <p className="py-6 text-center text-sm text-destructive">Couldn't load referrals right now.</p>}
    {(!real || (!q.isLoading && !q.isError)) && <><ul className="space-y-2">{refs.map(u => <li key={u.id} className="flex items-center gap-3 rounded-xl border p-3"><Avatar name={u.name} /><span className="flex-1">{u.name}<br /><span className="text-xs text-muted-foreground">{fmtDate(u.joined)}</span></span>{u.reward > 0 && <span className="text-xs font-bold text-success">+{money(u.reward)}</span>}<Status s={u.status} /></li>)}</ul>{!refs.length && <p className="py-6 text-center text-sm text-muted-foreground">{real ? "No referrals yet. Share your code — earn ₹50 when a friend deposits or invests." : "No referrals yet. Share your code — no payouts exist."}</p>}</>}
  </Section>;
}
