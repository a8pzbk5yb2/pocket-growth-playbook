import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/pb/shell";
import { RequestsPage } from "@/components/panel/requests";
export const Route = createFileRoute("/admin/deposits")({ head: () => meta("Deposits", "Monitor PowerBank MXPay deposits and payment statuses."), component: () => <RequestsPage kind="deposit" /> });
