import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/pb/shell";
import { MyRequests } from "@/components/panel/my-requests";
export const Route = createFileRoute("/dashboard/withdrawals")({ head: () => meta("Withdrawal History", "Your sample withdrawal requests and their status."), component: () => <MyRequests kind="withdrawal" /> });
