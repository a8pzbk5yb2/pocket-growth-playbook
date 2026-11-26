import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Bell, Briefcase, Gem, LayoutDashboard, ListChecks, Share2, ShieldAlert, User } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { api, apiConfigured, type ApiDashboard } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DemoBanner, PanelLayout, type NavItem } from "@/components/panel/layout";
import { meta } from "@/components/pb/shell";
import { notesFor, useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/dashboard")({ head: () => meta("My Dashboard", "Your PowerBank account dashboard."), component: UserLayout });
const items: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true }, { to: "/dashboard/investments", label: "My Investments", icon: Briefcase },
  { to: "/dashboard/plans", label: "Investment Plans", icon: Gem }, { to: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/dashboard/deposits", label: "Deposit History", icon: ArrowDownToLine }, { to: "/dashboard/withdrawals", label: "Withdrawal History", icon: ArrowUpFromLine },
  { to: "/dashboard/tasks", label: "Tasks", icon: ListChecks }, { to: "/dashboard/referrals", label: "Referrals", icon: Share2 },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell }, { to: "/dashboard/profile", label: "My Profile", icon: User },
];
function Gate({ title, text }: { title: string; text: string }) {
  return <div className="min-h-screen bg-background"><DemoBanner /><div className="mx-auto mt-24 max-w-sm panel-card p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-3 text-xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{text}</p><div className="mt-5 flex justify-center gap-2"><Button asChild><Link to="/login">Log In</Link></Button><Button asChild variant="outline"><Link to="/signup">Sign Up</Link></Button></div></div></div>;
}
function UserLayout() {
  const d = useDemo(); const nav = useNavigate(); const qc = useQueryClient();
  const real = apiConfigured();
  const me = d.users.find(u => u.id === d.currentUserId);
  const q = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: real, retry: false, staleTime: 30_000, refetchIntervalInBackground: false });
  useEffect(() => {
    const u = q.data?.user;
    if (u && (!me || me.id !== u.id || me.name !== u.name || me.status !== u.status)) d.setApiUser(u);
  }, [q.data?.user, me]); // eslint-disable-line react-hooks/exhaustive-deps
  if (real && q.isLoading && !me) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading your account…</div>;
  if (!me) return <Gate title="Please log in" text={real ? "Log in or create an account to view your dashboard." : "Log in with a demo account or create one to see your dashboard."} />;
  if (me.status === "blocked") return <Gate title="Account blocked" text="An admin blocked this account. Please contact support." />;
  const unread = real && q.data ? q.data.unreadNotifications : notesFor(d.notifications, me.id).filter(n => !n.readBy.includes(me.id)).length;
  return <PanelLayout items={items} base="/dashboard" who={me.name.split(" ")[0]!} avatarName={me.name} unread={unread} profileTo="/dashboard/profile"
    onBell={() => nav({ to: "/dashboard/notifications" })} onLogout={() => { if (real) { void api.post("/auth/logout").catch(() => {}); qc.removeQueries({ queryKey: ["me-dashboard"] }); qc.removeQueries({ queryKey: ["me-referrals"] }); qc.removeQueries({ queryKey: ["me-notifications"] }); } d.logout(); toast("Logged out"); nav({ to: "/login" }); }}><Outlet /></PanelLayout>;
}
