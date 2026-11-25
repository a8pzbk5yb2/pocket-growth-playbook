import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Plus, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-home.webp.asset.json";
import { EmptyState, Logo, MobileShell, meta } from "@/components/pb/shell";
import { inr, user } from "@/lib/demo-data";

export const Route = createFileRoute("/")({ head: () => meta("Home", "Your PowerBank balance, earnings and quick actions."), component: Home });
function Home() {
  return <MobileShell>
    <header className="pb-home-header">
      <div className="flex items-center justify-between"><Logo /><Button variant="ghost" size="icon" aria-label="Notifications" className="text-primary-foreground hover:bg-primary-foreground/10"><Bell /></Button></div>
      <h1>Welcome back,<br />{user.name} 👋</h1>
    </header>
    <main className="pb-content relative -mt-11">
      <div className="pb-balance"><p className="pb-balance-label">Available Balance</p><p className="pb-balance-value">{inr(user.balance)}</p><img src={walletImg.url} alt="Wallet and gold coins" /></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="pb-stat"><TrendingUp /><p className="pb-stat-label">Withdrawable<br />Earnings</p><p className="pb-stat-value">{inr(user.earnings)}</p></div>
        <div className="pb-stat"><Wallet /><p className="pb-stat-label">Deposit Funds</p><p className="pb-stat-value">{inr(user.balance)}</p></div>
      </div>
      <div className="my-4 grid grid-cols-2 gap-3">
        <Button asChild className="h-11 rounded-full font-semibold"><Link to="/deposit"><Plus />Add Funds</Link></Button>
        <Button asChild variant="outline" className="h-11 rounded-full border-primary bg-card font-semibold text-primary"><Link to="/withdraw">Withdraw</Link></Button>
      </div>
      <div className="rounded-[22px] bg-card"><EmptyState text="Start investing to see your transactions here." /></div>
      <Link to="/wallet" className="mt-2 block text-center text-xs font-semibold text-primary">View all transactions</Link>
    </main>
  </MobileShell>;
}
