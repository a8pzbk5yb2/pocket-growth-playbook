import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Bell, ClipboardCheck, FileBarChart, Gem, LayoutDashboard, Settings, Share2, TrendingUp, ArrowLeftRight, Users } from "lucide-react";
import { toast } from "sonner";
import { PanelLayout, type NavItem } from "@/components/panel/layout";
import { meta } from "@/components/pb/shell";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin")({ head: () => meta("Admin Panel", "PowerBank admin prototype with sample data."), component: AdminLayout });
const items: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }, { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/investments", label: "Investments", icon: TrendingUp }, { to: "/admin/plans", label: "Plans", icon: Gem },
  { to: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight }, { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine }, { to: "/admin/tasks", label: "Tasks", icon: ClipboardCheck },
  { to: "/admin/referrals", label: "Referrals", icon: Share2 }, { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/notifications", label: "Notifications", icon: Bell }, { to: "/admin/settings", label: "Settings", icon: Settings },
];
function AdminLayout() {
  const d = useDemo(); const nav = useNavigate();
  const pending = d.requests.filter(r => r.status === "pending").length;
  return <PanelLayout items={items} base="/admin" who="Admin" avatarName="Admin User" unread={d.adminUnread + pending} profileTo="/admin/settings"
    onBell={() => { d.markAllRead("admin"); nav({ to: "/admin/deposits" }); toast(`${pending} demo requests awaiting review`); }}
    onLogout={() => { toast("Signed out of the admin demo"); nav({ to: "/login" }); }}><Outlet /></PanelLayout>;
}
