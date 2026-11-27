import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, apiConfigured, type ApiDashboard } from "@/lib/api";
import { useDemo } from "@/lib/demo-store";

const PUBLIC = ["/login", "/signup", "/admin", "/api"];

/** Sends signed-out visitors of any user screen to /login. */
export function AuthGate() {
  const d = useDemo(); const navigate = useNavigate(); const real = apiConfigured();
  const path = useRouterState({ select: s => s.location.pathname });
  const isPublic = PUBLIC.some(p => path === p || path.startsWith(p + "/"));
  const need = !isPublic && !d.currentUserId;
  const q = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: need && real, retry: false, staleTime: 30_000 });
  useEffect(() => {
    if (!need) return;
    if (real && q.data?.user) { d.setApiUser(q.data.user); return; }
    if (!real || q.isError) navigate({ to: "/login", replace: true });
  }, [need, real, q.data, q.isError]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
