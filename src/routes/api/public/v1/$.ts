import { createFileRoute } from "@tanstack/react-router";

// Same-site bridge to the Hostinger PHP API, so its sign-in cookies belong to this app's domain.
// The PHP API does all checks itself (CSRF, sessions, roles); this only forwards the request.
const UPSTREAM = "https://meta.mxpay.vip/api/v1";
const PASS_REQ = ["accept", "content-type", "cookie", "x-csrf-token", "user-agent"];

async function forward({ request, params }: { request: Request; params: { _splat?: string } }) {
  const url = new URL(request.url);
  const target = `${(process.env["API_UPSTREAM_URL"] ?? UPSTREAM).replace(/\/$/, "")}/${params._splat ?? ""}${url.search}`;
  const headers = new Headers();
  for (const h of PASS_REQ) { const v = request.headers.get(h); if (v) headers.set(h, v); }
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  if (ip) headers.set("x-forwarded-for", ip);
  let res: Response;
  try {
    res = await fetch(target, { method: request.method, headers, redirect: "manual", ...(["GET", "HEAD"].includes(request.method) ? {} : { body: await request.text() }) });
  } catch {
    return Response.json({ success: false, error: { code: "network", message: "Can't reach the server right now. Please try again." } }, { status: 502 });
  }
  const out = new Headers({ "content-type": res.headers.get("content-type") ?? "application/json", "cache-control": "no-store" });
  const retry = res.headers.get("retry-after"); if (retry) out.set("retry-after", retry);
  const isPlainHttpNonLocal = url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  for (const c of res.headers.getSetCookie()) {
    let cookie = c.replace(/;\s*domain=[^;]*/gi, "");
    if (isPlainHttpNonLocal) cookie = cookie.replace(/;\s*secure\b/gi, "");
    out.append("set-cookie", cookie);
  }
  return new Response(await res.arrayBuffer(), { status: res.status, headers: out });
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: { handlers: { GET: forward, POST: forward, PUT: forward, DELETE: forward } },
});
