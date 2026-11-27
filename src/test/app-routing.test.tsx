import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { isPublicPath } from "@/components/pb/auth-gate";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("allows password recovery without signing in while keeping wallet protected", () => {
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/wallet")).toBe(false);
    expect(isPublicPath("/forgot-password-other")).toBe(false);
  });

  it("matches the password recovery page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/forgot-password").at(-1)?.routeId).toBe("/forgot-password");
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
