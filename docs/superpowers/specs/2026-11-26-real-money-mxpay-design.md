# Real-Money Wallet, Investments, Tasks & MXPay Integration Design

**Date:** 2026-11-26
**Status:** Approved design (Approach A)

## 1. Overview & Goals
Replace all remaining in-memory demo money modules with an atomic MySQL-backed ledger and real payment collection / payouts via **MxPay** (`https://mxpay.one`), removing all "DEMO MODE" banners and `<Demo />` badges when `VITE_API_BASE_URL` is configured.

## 2. Database Schema (`backend/database/migrations/005_money_mxpay.sql`)
All monetary columns are stored in integer **paise** (`BIGINT UNSIGNED`, `100` = `₹1.00`) to prevent floating-point rounding drift. JSON API payloads expose monetary amounts in **INR** (`round($paise / 100, 2)`).

1. **`wallets`**
   - `user_id` (`BIGINT UNSIGNED PRIMARY KEY`, FK -> `users.id` ON DELETE CASCADE)
   - `deposit_paise` (`BIGINT UNSIGNED NOT NULL DEFAULT 0`)
   - `withdrawable_paise` (`BIGINT UNSIGNED NOT NULL DEFAULT 0`)
   - `total_deposited_paise` (`BIGINT UNSIGNED NOT NULL DEFAULT 0`)
   - `total_earned_paise` (`BIGINT UNSIGNED NOT NULL DEFAULT 0`)
   - `total_withdrawn_paise` (`BIGINT UNSIGNED NOT NULL DEFAULT 0`)
   - `updated_at` (`DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
2. **`bank_accounts`**
   - `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`)
   - `user_id` (`BIGINT UNSIGNED NOT NULL`, FK -> `users.id` ON DELETE CASCADE)
   - `bank_name` (`VARCHAR(120) NOT NULL`)
   - `account_number` (`VARCHAR(34) NOT NULL`)
   - `account_name` (`VARCHAR(100) NOT NULL`)
   - `ifsc` (`CHAR(11) NOT NULL`)
   - `is_default` (`TINYINT(1) NOT NULL DEFAULT 1`)
   - `created_at` (`DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`)
   - `deleted_at` (`DATETIME NULL`)
   - Key: `ix_ba_user (user_id, deleted_at)`
3. **`deposits`**
   - `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`)
   - `order_id` (`VARCHAR(32) NOT NULL UNIQUE`) — e.g. `DEP` + timestamp/random
   - `user_id` (`BIGINT UNSIGNED NOT NULL`, FK -> `users.id` ON DELETE CASCADE)
   - `amount_paise` (`BIGINT UNSIGNED NOT NULL`)
   - `gateway` (`VARCHAR(24) NOT NULL DEFAULT 'mxpay'`)
   - `gateway_order_no` (`VARCHAR(64) NULL`) — `orderNo` returned by MXPay `/api/web`
   - `platform_id` (`VARCHAR(64) NULL`) — `platform_id` sent in MXPay webhook
   - `payment_link` (`VARCHAR(500) NULL`)
   - `status` (`ENUM('pending','success','failed') NOT NULL DEFAULT 'pending'`)
   - `raw_callback` (`JSON NULL`)
   - `paid_at` (`DATETIME NULL`)
   - `created_at` (`DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`)
   - Key: `ix_dep_user (user_id, created_at)`, `ix_dep_status (status)`
4. **`withdrawals`**
   - `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`)
   - `order_id` (`VARCHAR(32) NOT NULL UNIQUE`) — e.g. `WDR` + timestamp/random
   - `user_id` (`BIGINT UNSIGNED NOT NULL`, FK -> `users.id` ON DELETE CASCADE)
   - `bank_account_id` (`BIGINT UNSIGNED NULL`, FK -> `bank_accounts.id` ON DELETE SET NULL)
   - `bank_name` (`VARCHAR(120) NOT NULL`)
   - `account_number` (`VARCHAR(34) NOT NULL`)
   - `account_name` (`VARCHAR(100) NOT NULL`)
   - `ifsc` (`CHAR(11) NOT NULL`)
   - `amount_paise` (`BIGINT UNSIGNED NOT NULL`)
   - `status` (`ENUM('pending','processing','success','rejected','failed') NOT NULL DEFAULT 'pending'`)
   - `gateway_message` (`VARCHAR(255) NULL`)
   - `raw_callback` (`JSON NULL`)
   - `reviewed_by_admin_id` (`BIGINT UNSIGNED NULL`, FK -> `admin_users.id` ON DELETE SET NULL)
   - `reviewed_at` (`DATETIME NULL`)
   - `completed_at` (`DATETIME NULL`)
   - `created_at` (`DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`)
   - Key: `ix_wdr_user (user_id, created_at)`, `ix_wdr_status (status)`
5. **`investments`**
   - `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`)
   - `public_id` (`VARCHAR(24) NOT NULL UNIQUE`) — e.g. `INV...`
   - `user_id` (`BIGINT UNSIGNED NOT NULL`, FK -> `users.id` ON DELETE CASCADE)
   - `plan_id` (`BIGINT UNSIGNED NOT NULL`, FK -> `plans.id`)
   - `amount_paise` (`BIGINT UNSIGNED NOT NULL`)
   - `daily_paise` (`BIGINT UNSIGNED NOT NULL`)
   - `duration_days` (`SMALLINT UNSIGNED NOT NULL`)
   - `days_credited` (`SMALLINT UNSIGNED NOT NULL DEFAULT 0`)
   - `started_at` (`DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`)
   - `last_credited_at` (`DATETIME NULL`)
   - `status` (`ENUM('active','completed') NOT NULL DEFAULT 'active'`)
   - Key: `ix_inv_user (user_id, status, started_at)`
6. **`tasks` & `task_completions`**
   - `tasks`: `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`), `title` (`VARCHAR(80)`), `category` (`ENUM('Daily','Social','Special') NOT NULL DEFAULT 'Daily'`), `reward_paise` (`BIGINT UNSIGNED NOT NULL`), `status` (`ENUM('active','paused') NOT NULL DEFAULT 'active'`), `assigned_user_id` (`BIGINT UNSIGNED NULL`, FK -> `users.id` ON DELETE SET NULL), `created_at`, `updated_at`, `deleted_at`.
   - `task_completions`: `id`, `task_id` (FK -> `tasks.id` ON DELETE CASCADE), `user_id` (FK -> `users.id` ON DELETE CASCADE), `completed_date` (`DATE NOT NULL` — UTC date for `Daily` tasks, `'1970-01-01'` sentinel for one-time `Social`/`Special` tasks), `reward_paise`, `created_at`, `UNIQUE KEY uq_tc (task_id, user_id, completed_date)`.
7. **`wallet_transactions`**
   - `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`)
   - `tx_ref` (`VARCHAR(32) NOT NULL UNIQUE`)
   - `user_id` (`BIGINT UNSIGNED NOT NULL`, FK -> `users.id` ON DELETE CASCADE)
   - `type` (`ENUM('deposit','withdrawal','investment','earning','task','referral','refund','admin_adjust') NOT NULL`)
   - `bucket` (`ENUM('deposit','withdrawable') NOT NULL`)
   - `direction` (`ENUM('credit','debit') NOT NULL`)
   - `amount_paise` (`BIGINT UNSIGNED NOT NULL`)
   - `balance_after_paise` (`BIGINT UNSIGNED NOT NULL`)
   - `ref_id` (`VARCHAR(32) NULL`)
   - `status` (`ENUM('success','pending','failed') NOT NULL DEFAULT 'success'`)
   - `note` (`VARCHAR(255) NOT NULL DEFAULT ''`)
   - `created_at` (`DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`)
   - Key: `ix_wt_user (user_id, created_at)`, `ix_wt_type (type, status)`
8. **`referrals` update + `006_seed_tasks.sql`**
   - Add `reward_paise INT UNSIGNED NOT NULL DEFAULT 0` and `reward_credited_at DATETIME NULL` to `referrals`.
   - Seed the 5 default tasks (`Daily Login` ₹2, `Watch Video` ₹5, `Share App` ₹10, `Read News` ₹3, `Complete Survey` ₹15) if `tasks` is empty.
   - Ensure `wallets` rows are auto-created lazily (`INSERT IGNORE INTO wallets (user_id) VALUES (?)`) for pre-existing users as well as at user registration/admin user creation.

## 3. MXPay Gateway Integration (`backend/api/v1/services/mxpay.php`)
- Configuration in `config.php` outside `public_html`:
  ```php
  'mxpay' => [
    'api_key' => 'CHANGE_ME',
    'chid' => 'CHANGE_ME',
    'base_url' => 'https://mxpay.one',
    'webhook_token' => 'CHANGE_ME_RANDOM_HEX',
    'public_base_url' => 'https://novel-mediumvioletred-stork-77.hostingersite.com/api/v1',
    'app_url' => 'https://pocket-growth-playbook.lovable.app',
    'allowed_ips' => [],
  ],
  ```
- **Create Payment (`POST /me/deposits`):**
  - Validates integer `amount` (`100` to `500000` INR).
  - Creates `deposits` row with unique `order_id` (`DEP...`) and `status = 'pending'`.
  - Calls `POST https://mxpay.one/api/web` (`application/x-www-form-urlencoded`) with `api_key`, `chid`, `amount`, `order_id`, `callback = public_base_url . '/webhooks/mxpay/deposit/' . webhook_token`, `page_url = app_url . '/wallet?deposit=' . order_id`.
  - Saves `gateway_order_no` (`orderNo`) and `payment_link`, returns `{ deposit, paymentLink }` (`201`). If MXPay returns `status !== true`, marks `deposits.status = 'failed'` and returns HTTP `502` with clear error.
- **Deposit Webhook (`POST /webhooks/mxpay/deposit/{token}`):**
  - Exempt from `require_csrf()`.
  - Verifies `{token}` via `hash_equals` against `mxpay.webhook_token` (and optional `mxpay.allowed_ips` if configured).
  - Parses JSON or form POST payload (`status`, `amount`, `platform_id`, `order_id`).
  - Inside `tx()`: locks `deposits` (`SELECT ... FOR UPDATE`), exits `200` idempotently if already `success`.
  - If `status` is truthy (`true`, `1`, `'1'`, `'true'`, `'success'`), verifies paid amount matches `amount_paise` (`(int)round((float)$amount * 100) >= $dep['amount_paise']`), updates `deposits` -> `success`, locks `wallets` (`FOR UPDATE`), adds `amount_paise` to `deposit_paise` & `total_deposited_paise`, inserts `wallet_transactions` (`deposit`, `credit`), and calls `award_first_referral_bonus($userId)`.
- **Withdrawal & MXPay Payout (`POST /me/withdrawals` + Admin `POST /admin/withdrawals/{orderId}/approve|reject`):**
  - User validates `amount` (`>= 100` INR, `<= 500000`) and `bankAccountId` belonging to user.
  - Inside `tx()`: runs `accrue_user_earnings($userId)` first, locks `wallets` (`FOR UPDATE`), checks `withdrawable_paise >= amount_paise`, deducts `withdrawable_paise`, inserts `withdrawals` (`status = 'pending'` with bank snapshot), inserts `wallet_transactions` (`withdrawal`, `debit`, `status = 'pending'`).
  - Admin **Approve** (`require_admin('admin')`): locks `withdrawals` (`FOR UPDATE`), requires `status === 'pending'`, sets `status = 'processing'`, records `reviewed_by_admin_id` and `reviewed_at`. Calls `POST https://mxpay.one/api/payout` (`api_key`, `amount`, `order_id`, `bank_name`, `account_number`, `account_name`, `ifsc`, `callback = public_base_url . '/webhooks/mxpay/payout/' . webhook_token`).
    - If MXPay synchronously returns `status !== true`: marks `withdrawals.status = 'failed'`, refunds `withdrawable_paise` inside `tx()`, records `refund` transaction, logs `withdrawal_failed`.
  - Admin **Reject** (`require_admin('admin')`): locks `withdrawals`, requires `status === 'pending'`, sets `rejected`, refunds `withdrawable_paise`, updates/inserts `refund` transaction, logs `withdrawal_reject`.
  - **Payout Webhook (`POST /webhooks/mxpay/payout/{token}`):** verifies `webhook_token`, locks `withdrawals` (`FOR UPDATE`), ignores if already `success`/`failed`/`rejected`. On success status: sets `withdrawals.status = 'success'`, increments `total_withdrawn_paise`, marks pending withdrawal transaction `success`. On failure status: marks `withdrawals.status = 'failed'`, refunds `withdrawable_paise`, marks pending transaction `failed` + inserts `refund` credit.

## 4. Investments, Daily Earnings, Referral Bonus & Tasks
- **Invest (`POST /me/investments`):**
  - Validates `planId` (active non-deleted plan).
  - Inside `tx()`: locks `wallets` (`FOR UPDATE`), checks `deposit_paise + withdrawable_paise >= price_paise`. Debits `deposit_paise` first, remainder from `withdrawable_paise`. Inserts `investments` (`active`), inserts `wallet_transactions` (`investment`, `debit`), calls `award_first_referral_bonus($userId)`.
- **Referral Bonus (`award_first_referral_bonus`):**
  - Locks `referrals` row for `referred_user_id` (`FOR UPDATE`). If `referrer_user_id IS NOT NULL` and `reward_credited_at IS NULL`, credits `5000` paise (`₹50`) to referrer's `withdrawable_paise` & `total_earned_paise`, sets `reward_paise = 5000, reward_credited_at = UTC_TIMESTAMP()`, records `wallet_transactions` (`referral`, `credit`).
- **Daily Earnings (`accrue_user_earnings`):**
  - Inside `tx()`: locks user's `investments` (`status = 'active' FOR UPDATE`) and `wallets` (`FOR UPDATE`).
  - Computes `elapsedDays = floor((nowUtc - started_at) / 86400)`, clamped to `duration_days`. `daysToCredit = min($elapsedDays, $inv['duration_days']) - $inv['days_credited']`.
  - If `$daysToCredit > 0`: credits `$daysToCredit * $inv['daily_paise']` to `withdrawable_paise` & `total_earned_paise`, updates `days_credited`, `last_credited_at`, sets `status = 'completed'` if `days_credited >= duration_days`, and inserts `wallet_transactions` (`earning`, `credit`).
  - Runs automatically on `/me/dashboard`, `/me/wallet`, `/me/investments`, `/me/withdrawals` AND via `backend/bin/accrue-earnings.php` CLI cron.
- **Tasks (`GET /me/tasks`, `POST /me/tasks/{id}/complete`):**
  - Returns tasks visible to user (`assigned_user_id IS NULL OR assigned_user_id = me.id`, `status = 'active'`) with `completed` boolean (today for `Daily`, ever for `Social`/`Special`).
  - Completing inside `tx()` inserts into `task_completions` (unique constraint prevents double reward), credits `withdrawable_paise` & `total_earned_paise`, inserts `wallet_transactions` (`task`, `credit`).

## 5. API Routes Summary
- **User Money Routes:** `GET /me/wallet`, `GET /me/bank-accounts`, `POST /me/bank-accounts`, `DELETE /me/bank-accounts/{id}`, `GET /me/deposits`, `POST /me/deposits`, `GET /me/withdrawals`, `POST /me/withdrawals`, `GET /me/investments`, `POST /me/investments`, `GET /me/transactions`, `GET /me/tasks`, `POST /me/tasks/{id}/complete`.
- **Webhooks (CSRF-exempt, token-validated):** `POST /webhooks/mxpay/deposit/{token}`, `POST /webhooks/mxpay/payout/{token}`.
- **Admin Money Routes:** `GET /admin/deposits`, `GET /admin/withdrawals`, `POST /admin/withdrawals/{id}/approve`, `POST /admin/withdrawals/{id}/reject`, `GET /admin/investments`, `PUT /admin/investments/{id}`, `GET /admin/transactions`, `GET/POST/PUT/DELETE /admin/tasks`, plus real `wallet` & `transactions` inside `GET /admin/users/{id}`, and live money totals in `GET /admin/overview` and `GET /admin/reports` (`Deposits`, `Withdrawals`, `Investments`, `Transactions`, `Users`, `Referrals`).
- **Registration & User Creation:** `AuthController` (`auth_register_verify`) and `AdminUsersController` (`admin_user_create`) create an initial `wallets` row inside the creation transaction, and `ensure_wallet($userId)` uses `INSERT IGNORE INTO wallets` lazily for any pre-existing users.

## 6. Frontend Integration & Removing Demo Mode
- Hide `<DemoBanner />` and `<Demo />` badges whenever `apiConfigured()` is `true` (retaining demo mode only when `VITE_API_BASE_URL` is unset).
- Remove sample wording from `PlanCard` when `apiConfigured()` is `true`.
- Connect all mobile routes (`/`, `/plans`, `/tasks`, `/team`, `/wallet`, `/me`, `/deposit`, `/withdraw`) and web panel routes (`/dashboard/*`, `/admin/*`) to live MySQL endpoints when `apiConfigured()` is `true`:
  - `/deposit`: choose amount (min ₹100 + quick chips), initiate `POST /me/deposits`, redirect to MXPay `paymentLink` (and refresh wallet on return to `/wallet?deposit=...`).
  - `/withdraw` & `/dashboard/withdrawals`: select or add saved bank account (`bank_name`, `account_number`, `account_name`, `ifsc`), submit `POST /me/withdrawals`.
  - `/plans` & `/dashboard/plans`: click Invest -> `POST /me/investments` (confirm dialog showing balance & plan cost).
  - `/tasks` & `/dashboard/tasks`: click Go -> `POST /me/tasks/{id}/complete` -> credits withdrawable balance.
  - `/me` & `/dashboard/profile`: add Bank Accounts dialog/section (`GET/POST/DELETE /me/bank-accounts`).
  - `/admin/deposits`, `/admin/withdrawals`, `/admin/investments`, `/admin/transactions`, `/admin/tasks`, `/admin/index`, `/admin/reports`: connect all to real MySQL data and MXPay payout approvals.
