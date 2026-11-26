import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/pb/shell";
import { RequestsPage } from "@/components/panel/requests";
export const Route = createFileRoute("/admin/withdrawals")({ head: () => meta("Withdrawals", "Approve or reject PowerBank withdrawal payout requests."), component: () => <RequestsPage kind="withdrawal" /> });
