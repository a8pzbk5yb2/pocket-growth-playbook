import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { RefreshCw, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { api, apiConfigured } from "@/lib/api";
import { Logo, MobileShell } from "./shell";

/** Check before mounting user screens, including login and registration. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const exempt = path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/");
  const enabled = apiConfigured() && !exempt;
  const status = useQuery({
    queryKey: ["platform-status"], queryFn: () => api.get<{ maintenance: boolean }>("/status"),
    enabled, retry: false, staleTime: 0, refetchInterval: 15_000,
  });
  if (!enabled) return children;
  if (status.isPending) return <MobileShell nav={false}><div role="status" className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div></MobileShell>;
  if (!status.data?.maintenance) return children;
  return <MobileShell nav={false}>
    <header className="bg-primary px-6 py-8 text-primary-foreground"><Logo /></header>
    <main className="flex min-h-[65vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <Wrench className="h-14 w-14 text-primary" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Under Maintenance</h1>
      <p className="max-w-sm text-sm text-muted-foreground">PowerBank is temporarily unavailable. Please check back shortly.</p>
      <Button disabled={status.isFetching} onClick={() => void status.refetch()}><RefreshCw className="h-4 w-4" />Check again</Button>
    </main>
  </MobileShell>;
}