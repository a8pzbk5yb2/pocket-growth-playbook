import { SignedIn } from "@/components/pb/signed-in";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState, MobileShell, PageBar, Pills, meta } from "@/components/pb/shell";
import { Status } from "@/components/panel/ui";
import { api, apiConfigured, type ApiTransaction } from "@/lib/api";
import { inr } from "@/lib/demo-data";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/history")({ head: () => meta("Transaction History", "All your PowerBank wallet transactions."), component: () => <SignedIn title="Transaction History"><P /></SignedIn> });
const tabs = ["All", "Deposit", "Withdrawal", "Investment", "Daily Earning"] as const;
function P() {
  const { d, me } = useMe(); const real = apiConfigured();
  const [t, setT] = useState<(typeof tabs)[number]>("All");
  const q = useQuery({ queryKey: ["me-transactions"], queryFn: () => api.get<{ transactions: ApiTransaction[] }>("/me/transactions"), enabled: real, staleTime: 15_000 });
  const all = real ? (q.data?.transactions ?? []) : d.transactions.filter(x => x.userId === me.id).map(x => ({ ...x, direction: "credit" as const }));
  const rows = all.filter(x => t === "All" || x.type === t);
  return <MobileShell>
    <header className="pb-green-header"><PageBar title="Transaction History" backTo="/wallet" /></header>
    <main className="pb-content">
      <Pills items={tabs} value={t} onChange={setT} />
      {real && q.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        : rows.length ? <ul className="space-y-2">{rows.map(x => <li key={x.id} className="flex items-center justify-between rounded-2xl bg-card p-3 text-sm shadow-card">
          <div className="min-w-0"><p className="truncate font-semibold">{x.type}</p><p className="text-xs text-muted-foreground">{x.ref} · {fmtDate(x.date, true)}</p></div>
          <div className="text-right"><p className={`font-bold ${x.direction === "credit" ? "text-success" : ""}`}>{x.direction === "credit" ? "+" : "-"}{inr(x.amount)}</p><Status s={x.status} /></div></li>)}</ul>
        : <EmptyState text="Your transactions will appear here." />}
    </main>
  </MobileShell>;
}
