import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, Bell, Plus, TrendingUp } from "lucide-react";
import walletImg from "@/assets/pb-wallet.webp.asset.json";
import { Card, EmptyState, Logo, MobileShell, meta } from "@/components/pb/shell";
import { inr, user } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => meta("Home", "Your PowerBank balance, earnings and quick actions."),
  component: Home,
});

function Home() {
  return (
    <MobileShell>
      <header className="rounded-b-[2rem] bg-gradient-primary px-5 pb-24 pt-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Logo />
          <button className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/15" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
        </div>
        <p className="mt-5 text-sm text-primary-foreground/80">Welcome back,</p>
        <h1 className="text-2xl font-extrabold">{user.name} 👋</h1>
      </header>
      <div className="-mt-20 space-y-4 px-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-card ring-4 ring-card">
          <p className="text-sm text-primary-foreground/80">Total Balance</p>
          <p className="mt-1 text-4xl font-extrabold">₹0.00</p>
          <img src={walletImg.url} alt="" className="absolute right-4 top-4 h-20 w-20 rounded-3xl bg-card object-contain p-1" />
          <div className="mt-6 flex gap-2">
            <Link to="/deposit" className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-sm font-bold text-primary"><Plus className="h-4 w-4" />Add Funds</Link>
            <Link to="/withdraw" className="flex items-center gap-1 rounded-full border border-primary-foreground/50 px-4 py-2 text-sm font-bold"><ArrowDownToLine className="h-4 w-4" />Withdraw</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card><TrendingUp className="h-5 w-5 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Withdrawable Earnings</p><p className="text-lg font-extrabold">{inr(user.earnings)}</p></Card>
          <Card><Plus className="h-5 w-5 text-gold" /><p className="mt-2 text-xs text-muted-foreground">Deposit Funds</p><p className="text-lg font-extrabold">{inr(user.balance)}</p></Card>
        </div>
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-bold">Recent Transactions</h2><Link to="/wallet" className="text-sm font-semibold text-primary">See all</Link></div>
          <EmptyState text="Add funds to start investing" />
        </Card>
      </div>
    </MobileShell>
  );
}
