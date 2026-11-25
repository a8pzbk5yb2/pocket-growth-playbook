# PowerBank: real PHP + MySQL backend (phased)

The look stays exactly as it is now. Screens switch one at a time from sample data to your own PHP API on Hostinger. Money pages (Transactions, Deposits, Withdrawals, Investments, Wallet, Withdraw, Deposit) stay as labelled demo screens.

## Limits you should know about
- **I can't run your Hostinger server from here.** I'll write the full PHP API and the database setup scripts in a `backend/` folder in this project. You upload them to Hostinger and import the SQL. I'll test them here on a local PHP 8.2 and MySQL 8 copy before handing them over.
- **Sign-in cookies need one shared domain.** The secure cookies you asked for only work reliably if the app and the API share a main domain, for example `app.yourdomain.com` and `yourdomain.com/api/v1`. That means connecting your custom domain to this app. On the default lovable.app address, many browsers block these cookies.
- **SMS codes need an SMS provider account.** I'll support MSG91 and Twilio, chosen in the server settings. Until it's set up, a "test mode" writes the code to the server log so you can try sign-up.
- **The first admin** gets created with a one-time setup command on the server. There's no public admin sign-up.

## Phases (one approval each, nothing destructive)
1. **API foundation:** the folder layout you listed, database connection, consistent JSON replies, error handling, CORS allowlist, rate limiting, logging, and all 14 tables with keys, indexes, timestamps and soft delete. Credentials stay outside `public_html`.
2. **Sign-up, codes and log-in:** register with name, +91 mobile, password, a required invitation code (checked on the server) and Terms and Privacy acceptance. No email field. Then SMS code, short-lived sign-in plus a rotating "stay signed in" token, Remember Me, password reset by SMS, and log-out. Duplicate mobile numbers are rejected.
3. **User panel:** profile, dashboard, plans list, referrals, notifications and settings all come from the API, with loading placeholders, empty states and error messages.
4. **Admin access and Users:** separate admin log-in, roles checked on the server, protected admin pages, activity log, and a user list with search, pages and filters. Admins can view, edit, block/unblock and activate/deactivate users.
5. **Plans, referrals, notifications:** admins create, edit and switch plans on or off (shown for information only, never sold). They also manage invitation codes, see referral history, and send notifications with read/unread tracking.
6. **Reports and security pass:** reports built from real data with CSV and PDF export, an activity log viewer, admin settings, and the 17 checks from your list run against the local copy.

## Technical details
- Frontend: `src/lib/api.ts` fetch client (`credentials: "include"`, CSRF double-submit header, automatic refresh on 401, typed errors), with base URL from `VITE_API_BASE_URL`. TanStack Query for data, debounced search, and refetch paused when the tab is hidden. Routing stays on the existing TanStack Router setup, which can't be swapped for React Router.
- The demo store stays only for the money modules. Each other screen switches its data source and keeps its current markup.
- Auth: access JWT (HS256, 15 min) in an HttpOnly `Secure` `SameSite=Lax` cookie. Opaque refresh token is stored hashed in `user_sessions`, rotated on every use, with reuse detection revoking the chain. `password_hash` uses the default (bcrypt/argon2id). Nothing sensitive goes in localStorage.
- OTP: 6 digits stored hashed, expire after 5 minutes, max 5 tries, resend cooldown. Rate limiting is per IP and per mobile, kept in a MySQL table so it works on shared hosting.
- PHP has no Composer requirement: a small router in `index.php` with `.htaccess` rewrite, PDO prepared statements only, and a validation helper. Output is JSON only, so there's no HTML to inject into.
- Admins are a separate `admin_users` table with a role enum (super_admin, admin, viewer). The role is read only from the server session, and every admin write goes into `admin_activity_logs`.
- Deliverables: `backend/api/v1/**`, `backend/database/migrations/*.sql`, `backend/README.md` with Hostinger upload steps, plus PHP tests run against local MySQL.
