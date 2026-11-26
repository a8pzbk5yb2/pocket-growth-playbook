import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Bell, ClipboardCheck, FileBarChart, Gem, LayoutDashboard, Loader2, Lock, Settings, Share2, ShieldCheck, TrendingUp, ArrowLeftRight, User, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PanelLayout, type NavItem } from "@/components/panel/layout";
import { meta } from "@/components/pb/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiConfigured, errMessage, type ApiAdmin, type ApiAdminOverview } from "@/lib/api";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin")({ head: () => meta("Admin Panel", "PowerBank admin panel."), component: AdminLayout });
const items: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }, { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/investments", label: "Investments", icon: TrendingUp }, { to: "/admin/plans", label: "Plans", icon: Gem },
  { to: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight }, { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine }, { to: "/admin/tasks", label: "Tasks", icon: ClipboardCheck },
  { to: "/admin/referrals", label: "Referrals", icon: Share2 }, { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/notifications", label: "Notifications", icon: Bell }, { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setErr("Enter username and password"); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/admin/auth/login", { username: username.trim(), password, remember });
      toast.success("Admin signed in");
      onSuccess();
    } catch (er) {
      const m = errMessage(er); setErr(m); toast.error(m);
    } finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-background">
    <DemoBanner />
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="panel-card p-6 sm:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <h1 className="mt-3 text-center text-xl font-extrabold">Admin Sign In</h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">Sign in with an administrator account created on the server.</p>
        <form className="mt-5 space-y-3" onSubmit={e => void submit(e)}>
          <div><Label htmlFor="adm-user">Username</Label><div className="relative mt-1"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="adm-user" className="pl-9" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></div></div>
          <div><Label htmlFor="adm-pass">Password</Label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="adm-pass" type="password" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div></div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 accent-primary" />Remember Me</label>
          {err && <p className="text-xs font-medium text-destructive">{err}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Signing in…</> : "Sign In"}</Button>
        </form>
        <p className="mt-4 text-center text-xs"><Link to="/login" className="font-semibold text-primary">← Back to User Login</Link></p>
      </div>
    </div>
  </div>;
}

function AdminLayout() {
  const d = useDemo(); const nav = useNavigate(); const qc = useQueryClient();
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["admin-me"], queryFn: () => api.get<{ admin: ApiAdmin }>("/admin/me"), enabled: real, retry: false, staleTime: 30_000, refetchIntervalInBackground: false });
  const ovQ = useQuery({ queryKey: ["admin-overview"], queryFn: () => api.get<ApiAdminOverview>("/admin/overview"), enabled: real && !!q.data?.admin, staleTime: 30_000, refetchIntervalInBackground: false });

  if (real && q.isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking admin session…</div>;
  if (real && !q.data?.admin) return <AdminLoginGate onSuccess={() => void qc.invalidateQueries({ queryKey: ["admin-me"] })} />;

  const admin = q.data?.admin;
  const pending = real ? (ovQ.data?.pendingWithdrawals ?? 0) : d.requests.filter(r => r.status === "pending").length;
  return <PanelLayout items={items} base="/admin" who={admin ? `${admin.name.split(" ")[0]} (${admin.role})` : "Admin"} avatarName={admin ? admin.name : "Admin User"} unread={real ? pending : d.adminUnread + pending} profileTo="/admin/settings"
    onBell={() => { if (!real) d.markAllRead("admin"); nav({ to: real ? "/admin/withdrawals" : "/admin/deposits" }); toast(`${pending} ${real ? "withdrawal" : "demo"} requests awaiting review`); }}
    onLogout={() => {
      if (real) {
        void api.post("/admin/auth/logout").catch(() => {});
        qc.clear();
      }
      toast("Signed out of admin"); nav({ to: "/login" });
    }}><Outlet /></PanelLayout>;
}
