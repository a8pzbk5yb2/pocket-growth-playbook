# PowerBank API (PHP 8.2 + MySQL 8) — Hostinger setup

1. hPanel → Databases → create a NEW MySQL database and user.
2. phpMyAdmin → import `database/migrations/001_schema.sql`, `002_settings.sql`, `003_first_invite.sql`, and `004_seed_plans.sql` in order.
3. Create a folder `powerbank_private` **outside** `public_html` (e.g. `domains/YOURSITE/powerbank_private/` or `/home/YOURUSER/powerbank_private/`). Copy `private/config.example.php` there as `config.php` and fill in DB details, a 64-char `jwt_secret`, your app origin, and `cookie_domain` (`''` when using the `/api/public/v1` proxy).
4. Upload ONLY `api/v1/` to `public_html/api/v1/` (never upload `config.php`, `database/`, or `.zip` archives into `public_html/`). Make `storage/logs` writable.
5. Check `https://yourdomain.com/api/v1/health` returns `{"success":true,"data":{"status":"ok","db":"connected",...}}`.
6. Create the first admin via SSH/CLI on the server: `php bin/create-admin.php admin "Super Admin" "StrongPass123!" super_admin`.
7. In the app, set `VITE_API_BASE_URL=/api/public/v1` (with `API_UPSTREAM_URL=https://yourdomain.com/api/v1` in server env) or `VITE_API_BASE_URL=https://yourdomain.com/api/v1`.

Cookies use `SameSite=Lax`, so the app must be served from the same main domain (e.g. `app.yourdomain.com`).
Responses: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, fields? } }`.

SMS codes: sent through BlackSMS (blacksms.in). In `config.php` set `sms.provider` to `blacksms` and fill in your BlackSMS API key and sender ID. Leave it as `log` to test without sending real SMS.
