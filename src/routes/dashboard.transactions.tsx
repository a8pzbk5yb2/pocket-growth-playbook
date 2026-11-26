import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { meta } from "@/components/pb/shell";
import { FilterSelect, Section, Status, Table, Toolbar, money, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, type ApiTransaction } from "@/lib/api";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/dashboard/transactions")({ head: () => meta("Transactions", "Your PowerBank wallet transactions."), component: P });
const REAL_TYPES = ["Deposit", "Withdrawal", "Investment", "Daily Earning", "Task Reward", "Referral Bonus", "Refund", "Adjustment"];
const DEMO_TYPES = ["Deposit", "Withdrawal", "Investment", "Refund", "Other"];

function P() {
  const { d, me } = useMe();
  const real = apiConfigured();
  const [t, setT] = useState("all");
  const q = useQuery({ queryKey: ["me-transactions"], queryFn: () => api.get<{ transactions: ApiTransaction[] }>("/me/transactions"), enabled: real, staleTime: 15_000 });
  const rows = (real ? (q.data?.transactions ?? []) : d.transactions.filter(x => x.userId === me.id).map(x => ({ ...x, direction: "credit" as const }))).filter(x => t === "all" || x.type === t);
  const { slice, pager } = usePaged(rows);
  return <Section title="Transactions" icon={ArrowLeftRight}><Toolbar><FilterSelect label="Types" value={t} onChange={setT} options={real ? REAL_TYPES : DEMO_TYPES} /></Toolbar>
    {real && q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading transactions…</p>}
    {(!real || !q.isLoading) && <><Table empty={!rows.length} head={["ID", "Type", "Amount", "Reference", "Status", "Date"]}>{slice.map(x => <tr key={x.id}><td className="px-3 py-2.5">{x.id}</td><td className="px-3">{x.type}</td><td className="px-3 font-semibold">{real ? (x.direction === "credit" ? "+" : "-") : ""}{money(x.amount)}</td><td className="px-3">{x.ref}</td><td className="px-3"><Status s={x.status} /></td><td className="px-3">{fmtDate(x.date, true)}</td></tr>)}</Table>{pager}</>}
  </Section>;
}
