import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MobileShell, PageBar } from "@/components/pb/shell";
import { api, apiConfigured, type ApiDashboard } from "@/lib/api";
import { useDemo } from "@/lib/demo-store";

/** Shows account screens only to a signed-in, non-blocked user (replaces the old web panel gate). */
export function SignedIn({ title, children }: { title: string; children: ReactNode }) {
  const d = useDemo(); const real = apiConfigured();
  const me = d.users.find(u => u.id === d.currentUserId);
  const q = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: real, retry: false, staleTime: 30_000 });
  useEffect(() => { const u = q.data?.user; if (u && (!me || me.id !== u.id || me.name !== u.name || me.status !== u.status)) d.setApiUser(u); }, [q.data?.user, me]); // eslint-disable-line react-hooks/exhaustive-deps
  if (me && me.status !== "blocked") return <>{children}</>;
  const loading = real && q.isLoading;
  return <MobileShell><header className="pb-green-header"><PageBar title={title} backTo="/me" /></header><main className="pb-content">
    <div className="rounded-2xl bg-card p-6 text-center shadow-card">
      {loading ? <p className="text-sm text-muted-foreground">Loading your account…</p> : <>
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-2 font-bold">{me ? "Account blocked" : "Please log in"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{me ? "An admin blocked this account. Please contact support." : "Log in or create an account to continue."}</p>
        {!me && <div className="mt-4 flex justify-center gap-2"><Button asChild className="rounded-full"><Link to="/login">Log In</Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/signup">Sign Up</Link></Button></div>}
      </>}
    </div></main></MobileShell>;
}
