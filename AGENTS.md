<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- PowerBank screens share `src/components/pb/` (shell, header, bottom tabs, auth form parts); sample data and money rules live in `src/lib/demo-data.ts` so they stay testable.
- Admin (`/admin/*`) and the mobile user screens share in-memory demo state from `src/lib/demo-store.tsx` (React context in __root) so changes on one side show on the other; it resets on refresh by design. Users get mobile screens only (no desktop user panel); account screens wrap in `SignedIn` from `src/components/pb/signed-in.tsx`.
- PHP API lives in `backend/` (deployed separately to Hostinger); the app talks to it only via `src/lib/api.ts` (cookie auth + CSRF header) because MySQL must never be reached from the browser.
- The browser reaches the PHP API only through the same-site proxy route `src/routes/api/public/v1/$.ts`, because cross-domain sign-in cookies get blocked by browsers.
