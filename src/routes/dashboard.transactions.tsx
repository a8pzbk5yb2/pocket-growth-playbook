import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { meta } from "@/components/pb/shell";
import { FilterSelect, Section, Status, Table, Toolbar, money, usePaged } from "@/components/panel/ui";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/transactions")({ head: () => meta("Transactions", "Your sample PowerBank transactions."), component: P });
function P() {
  const { d, me } = useMe(); const [t, setT] = useState("all"); const rows = d.transactions.filter(x => x.userId === me.id && (t === "all" || x.type === t)); const { slice, pager } = usePaged(rows);
  return <Section title="Transactions" icon={ArrowLeftRight}><Toolbar><FilterSelect label="Types" value={t} onChange={setT} options={["Deposit","Withdrawal","Investment","Refund","Other"]} /></Toolbar>
    <Table empty={!rows.length} head={["ID","Type","Amount","Reference","Status","Date"]}>{slice.map(x => <tr key={x.id}><td className="px-3 py-2.5">{x.id}</td><td className="px-3">{x.type}</td><td className="px-3 font-semibold">{money(x.amount)}</td><td className="px-3">{x.ref}</td><td className="px-3"><Status s={x.status} /></td><td className="px-3">{fmtDate(x.date, true)}</td></tr>)}</Table>{pager}</Section>;
}
