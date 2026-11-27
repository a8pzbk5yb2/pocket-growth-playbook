import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaintenanceGate } from "@/components/pb/maintenance-gate";

const state = vi.hoisted(() => ({ path: "/login", get: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => state.path,
}));
vi.mock("@/lib/api", () => ({ apiConfigured: () => true, api: { get: state.get } }));
vi.mock("@/components/pb/shell", () => ({
  Logo: () => null,
  MobileShell: ({ children }: { children: React.ReactNode }) => children,
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Maintenance access", () => {
  it.each(["/login", "/signup", "/wallet", "/plans"])("does not mount %s during maintenance", async path => {
    state.path = path;
    state.get.mockResolvedValue({ maintenance: true });
    const child = vi.fn(() => null);
    const Child = child;
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MaintenanceGate><Child /></MaintenanceGate></QueryClientProvider>);
    await waitFor(() => expect(qc.getQueryData(["platform-status"])).toEqual({ maintenance: true }));
    expect(child).not.toHaveBeenCalled();
    qc.clear();
  });

  it("keeps admin settings reachable without a maintenance status request", () => {
    state.path = "/admin/settings";
    const child = vi.fn(() => null);
    const Child = child;
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MaintenanceGate><Child /></MaintenanceGate></QueryClientProvider>);
    expect(child).toHaveBeenCalled();
    expect(state.get).not.toHaveBeenCalled();
    qc.clear();
  });

  it("restores user access when maintenance is disabled", async () => {
    state.path = "/wallet";
    state.get.mockResolvedValue({ maintenance: true });
    const child = vi.fn(() => null);
    const Child = child;
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MaintenanceGate><Child /></MaintenanceGate></QueryClientProvider>);
    await waitFor(() => expect(qc.getQueryData(["platform-status"])).toEqual({ maintenance: true }));
    expect(child).not.toHaveBeenCalled();
    state.get.mockResolvedValue({ maintenance: false });
    await qc.invalidateQueries({ queryKey: ["platform-status"] });
    await waitFor(() => expect(child).toHaveBeenCalled());
    qc.clear();
  });
});