import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, ChevronRight, Headphones, KeyRound, Landmark, LogOut, Bell, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import avatar from "@/assets/powerbank-avatar.webp.asset.json";
import { PageBar, MobileShell, meta } from "@/components/pb/shell";
import { BankAccountsManager } from "@/components/panel/bank-accounts";
import { ApiError, api, apiConfigured, type ApiBankAccount, type ApiDashboard, type ApiTransaction, type ApiWallet } from "@/lib/api";
import { inr, user } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/me")({ head: () => meta("Profile", "Your PowerBank profile, earnings and account settings."), component: Me });
const demoMenu = [{ l: "My Investments", i: Briefcase }, { l: "Bank/UPI Details", i: Landmark }, { l: "Contact Support", i: Headphones }, { l: "Change Password", i: KeyRound }];

function Me() {
  const real = apiConfigured();
  const nav = useNavigate();
  const qc = useQueryClient();
  const d = useDemo();
  const [bankOpen, setBankOpen] = useState(false);

  const dashQ = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: real, retry: false, staleTime: 30_000 });
  const walletQ = useQuery({ queryKey: ["me-wallet"], queryFn: () => api.get<{ wallet: ApiWallet; bankAccounts: ApiBankAccount[]; recentTransactions: ApiTransaction[] }>("/me/wallet"), enabled: real && !dashQ.isError, retry: false, staleTime: 15_000 });
  const unauth = real && dashQ.isError && dashQ.error instanceof ApiError && dashQ.error.status === 401;

  const displayName = real ? (dashQ.data?.user.name ?? "Member") : user.name;
  const displayId = real ? (dashQ.data?.user.id ?? "—") : user.id;
  const earnings = real ? (dashQ.data?.wallet.totalEarned ?? 0) : user.earnings;
  const teamCount = real ? (dashQ.data?.referralCount ?? 0) : user.team;

  const logout = () => {
    if (real) {
      void api.post("/auth/logout").catch(() => {});
      qc.clear();
    }
    d.logout();
    toast("Logged out");
    void nav({ to: "/login" });
  };

  return <MobileShell>
    <header className="rounded-b-[50%_16px] bg-gradient-primary px-4 pb-14 text-primary-foreground"><PageBar title="Me" /></header>
    {unauth ? (
      <main className="pb-content pt-6">
        <div className="rounded-2xl bg-card p-6 text-center shadow-card">
          <h1 className="text-lg font-bold">Sign in to PowerBank</h1>
          <p className="mt-1 text-sm text-muted-foreground">View your wallet, bank details, referrals, and investments.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button asChild className="rounded-full"><Link to="/login">Log In</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link to="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </main>
    ) : (
      <>
        <div className="relative -mt-12 flex flex-col items-center text-center"><div className="h-24 w-24 overflow-hidden rounded-full border-[3px] border-card bg-secondary shadow-card"><img src={avatar.url} alt={displayName} className="h-full w-full object-contain object-bottom" /></div><h1 className="mt-2 text-xl font-bold">{displayName}</h1><p className="text-xs text-muted-foreground">User ID: {displayId}</p><span className="mt-2 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground"><BadgeCheck className="h-3 w-3" />{dashQ.data?.user.status ?? "Active"} Member</span></div>
        <main className="pb-content pt-4"><div className="mb-4 grid grid-cols-2 gap-3"><div className="pb-stat !min-h-24"><Trophy /><p className="pb-stat-label">Total Earnings</p><p className="pb-stat-value">{inr(earnings)}</p></div><div className="pb-stat !min-h-24"><Users /><p className="pb-stat-label">Team Members</p><p className="pb-stat-value">{teamCount}</p></div></div>
          {real ? (
            <div className="pb-menu">
              <Button variant="ghost" asChild className="pb-menu-row"><Link to="/investments"><Briefcase /><span>My Investments</span><ChevronRight /></Link></Button>
              <Button variant="ghost" onClick={() => setBankOpen(true)} className="pb-menu-row"><Landmark /><span>Bank Accounts</span><ChevronRight /></Button>
              <Button variant="ghost" asChild className="pb-menu-row"><Link to="/notifications"><Bell /><span>Notifications</span><ChevronRight /></Link></Button>
              <Button variant="ghost" asChild className="pb-menu-row"><Link to="/profile"><KeyRound /><span>Profile & Password</span><ChevronRight /></Link></Button>
              <Button variant="ghost" onClick={logout} className="pb-menu-row text-destructive"><LogOut className="!text-destructive" /><span>Logout</span><ChevronRight /></Button>
            </div>
          ) : (
            <div className="pb-menu">{demoMenu.map(({ l, i: Icon }) => <Button variant="ghost" key={l} onClick={() => toast(`${l} — coming soon`)} className="pb-menu-row"><Icon /><span>{l}</span><ChevronRight /></Button>)}<Button variant="ghost" asChild className="pb-menu-row text-destructive"><Link to="/login"><LogOut className="!text-destructive" /><span>Logout</span><ChevronRight /></Link></Button></div>
          )}
        </main>
        {bankOpen && <Dialog open onOpenChange={setBankOpen}><DialogContent><DialogHeader><DialogTitle>Bank Accounts</DialogTitle></DialogHeader><BankAccountsManager accounts={walletQ.data?.bankAccounts ?? []} /></DialogContent></Dialog>}
      </>
    )}
  </MobileShell>;
}
