# PowerBank API (PHP 8.2 + MySQL 8) — Hostinger setup

1. hPanel → Databases → create a NEW MySQL database and user.
2. phpMyAdmin → import `database/migrations/001_schema.sql`, then `002_settings.sql`.
3. Create `/home/YOURUSER/powerbank_private/` (outside `public_html`). Copy `private/config.example.php` there as `config.php` and fill in DB details, a 64-char `jwt_secret`, your app origin, and cookie domain.
4. Upload `api/v1/` to `public_html/api/v1/`. Make `storage/logs` writable.
5. Check `https://yourdomain.com/api/v1/health` returns `{"success":true,...}`.
6. In the app, set `VITE_API_BASE_URL=https://yourdomain.com/api/v1`.

Cookies use `SameSite=Lax`, so the app must be served from the same main domain (e.g. `app.yourdomain.com`).
Responses: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, fields? } }`.
