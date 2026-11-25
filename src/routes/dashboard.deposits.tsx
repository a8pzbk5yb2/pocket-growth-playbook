import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/pb/shell";
import { MyRequests } from "@/components/panel/my-requests";
export const Route = createFileRoute("/dashboard/deposits")({ head: () => meta("Deposit History", "Your sample deposit requests and their status."), component: () => <MyRequests kind="deposit" /> });
