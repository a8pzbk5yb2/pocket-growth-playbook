import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/pb/shell";
import { RequestsPage } from "@/components/panel/requests";
export const Route = createFileRoute("/admin/withdrawals")({ head: () => meta("Withdrawals", "Review sample withdrawal requests — status changes only."), component: () => <RequestsPage kind="withdrawal" /> });
