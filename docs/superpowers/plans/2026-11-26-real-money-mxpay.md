# Real-Money Wallet, Investments, Tasks & MXPay Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all demo-only money modules with an atomic MySQL-backed wallet/ledger, real investments/daily earnings/tasks/referral bonus, MXPay payment collection (`/api/web`) and admin-approved payouts (`/api/payout`), and remove Demo Mode labels when connected.

**Architecture:** Money amounts are stored as integer paise (`BIGINT UNSIGNED`) in MySQL and exposed as INR in JSON. Every wallet mutation runs inside `tx()` with `SELECT ... FOR UPDATE` row locks. MXPay callbacks authenticate via a secret webhook token in the URL and run idempotently. Frontend switches cleanly via `apiConfigured()` while keeping existing visual layout.

**Tech Stack:** PHP 8.2+, MySQL 8 (PDO prepared statements), MxPay HTTP API (`https://mxpay.one`), TanStack Start / React 19 / TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-26-real-money-mxpay-design.md`

## Global Constraints
- Amounts stored in MySQL as integer paise (`100 = ₹1.00`), returned to JSON API consumers as INR (`round($paise / 100, 2)`).
- Never store real MXPay keys, DB passwords, or webhook tokens in the repository (`backend/private/config.php` is gitignored).
- All state-changing browser routes enforce double-submit CSRF (`pb_csrf` + `X-CSRF-Token`); only `/webhooks/mxpay/*` are exempt and require `hash_equals` on `webhook_token`.
- Keep existing UI component structure (`src/components/pb/`, `src/components/panel/`) and `VITE_API_BASE_URL` demo-mode fallback when unset.

---

### Task 1: MySQL Money Schema, Ledger Service, MXPay Service & Cron Script

**Files:**
- Create: `backend/database/migrations/005_money_mxpay.sql`
- Create: `backend/database/migrations/006_seed_tasks.sql`
- Create: `backend/api/v1/services/ledger.php`
- Create: `backend/api/v1/services/mxpay.php`
- Create: `backend/bin/accrue-earnings.php`
- Modify: `backend/private/config.example.php`
- Modify: `backend/README.md`
- Modify: `backend/api/v1/controllers/AuthController.php`
- Modify: `backend/api/v1/controllers/AdminUsersController.php`

**Interfaces:**
- Produces in `ledger.php`:
  - `paise_to_inr(int $paise): float`
  - `inr_to_paise(int|float|string $inr): int`
  - `ensure_wallet(PDO $p, int $userId): void`
  - `lock_wallet(PDO $p, int $userId): array`
  - `record_wallet_tx(PDO $p, int $userId, string $type, string $bucket, string $dir, int $amountPaise, int $balAfterPaise, ?string $refId, string $status = 'success', string $note = ''): string`
  - `award_first_referral_bonus(PDO $p, int $userId): void`
  - `accrue_user_earnings(int $userId): int`
- Produces in `mxpay.php`:
  - `mxpay_cfg(): array`
  - `mxpay_create_order(string $orderId, float $amountInr, string $callbackUrl, string $pageUrl): array`
  - `mxpay_create_payout(string $orderId, float $amountInr, array $bank, string $callbackUrl): array`
  - `mxpay_verify_webhook_token(string $token): void`

- [ ] **Step 1:** Create `backend/database/migrations/005_money_mxpay.sql` and `006_seed_tasks.sql` with `wallets`, `bank_accounts`, `deposits`, `withdrawals`, `investments`, `tasks`, `task_completions`, `wallet_transactions`, and `referrals` reward columns.
- [ ] **Step 2:** Create `backend/api/v1/services/ledger.php` implementing atomic wallet locking, ledger entries, idempotent daily earnings accrual, and one-time `₹50` referral bonus.
- [ ] **Step 3:** Create `backend/api/v1/services/mxpay.php` implementing `https://mxpay.one/api/web` and `https://mxpay.one/api/payout` form-urlencoded calls plus `hash_equals` webhook token verification.
- [ ] **Step 4:** Create `backend/bin/accrue-earnings.php` CLI script and update `AuthController.php`, `AdminUsersController.php`, `config.example.php`, and `backend/README.md`.
- [ ] **Step 5:** Syntax check (`php -l`) and verify migrations apply cleanly on MySQL 8.

---

### Task 2: User Money Endpoints, MXPay Webhooks & CSRF Exemption

**Files:**
- Modify: `backend/api/v1/middleware/auth.php`
- Modify: `backend/api/v1/controllers/UserController.php`
- Create: `backend/api/v1/controllers/MoneyController.php`
- Create: `backend/api/v1/controllers/WebhookController.php`
- Create: `backend/api/v1/controllers/money.routes.php`

**Interfaces:**
- User routes: `GET /me/wallet`, `GET /me/bank-accounts`, `POST /me/bank-accounts`, `DELETE /me/bank-accounts/{id}`, `GET /me/deposits`, `POST /me/deposits`, `GET /me/withdrawals`, `POST /me/withdrawals`, `GET /me/investments`, `POST /me/investments`, `GET /me/transactions`, `GET /me/tasks`, `POST /me/tasks/{id}/complete`.
- Webhook routes: `POST /webhooks/mxpay/deposit/{token}`, `POST /webhooks/mxpay/payout/{token}`.

- [ ] **Step 1:** Update `require_csrf()` in `backend/api/v1/middleware/auth.php` to skip CSRF only when `$path` matches `#^/webhooks/mxpay/(deposit|payout)/[A-Za-z0-9_-]+$#`.
- [ ] **Step 2:** Implement `MoneyController.php` with atomic wallet checks, bank account CRUD, MXPay deposit initiation, withdrawal locking, plan investment purchase, transaction history, and task completion.
- [ ] **Step 3:** Implement `WebhookController.php` handling MXPay deposit & payout callbacks idempotently inside `tx()` with `FOR UPDATE` row locks.
- [ ] **Step 4:** Update `UserController.php` (`/me/dashboard` & `/me/referrals`) to include live wallet summary & earned referral bonuses.
- [ ] **Step 5:** Create `money.routes.php` and verify `php -l`.

---

### Task 3: Admin Money Management, Live Overview & Reports

**Files:**
- Create: `backend/api/v1/controllers/AdminMoneyController.php`
- Modify: `backend/api/v1/controllers/admin.routes.php`
- Modify: `backend/api/v1/controllers/AdminUsersController.php`
- Modify: `backend/api/v1/controllers/AdminReportsController.php`

**Interfaces:**
- Admin routes: `GET /admin/deposits`, `GET /admin/withdrawals`, `POST /admin/withdrawals/{id}/approve`, `POST /admin/withdrawals/{id}/reject`, `GET /admin/investments`, `PUT /admin/investments/{id}`, `GET /admin/transactions`, `GET/POST/PUT/DELETE /admin/tasks`.

- [ ] **Step 1:** Implement `AdminMoneyController.php` for deposits list, withdrawals list + approve (calls `mxpay_create_payout`, refunds on synchronous error) + reject (refunds wallet), investments list/update, transactions list, and tasks CRUD.
- [ ] **Step 2:** Update `AdminUsersController.php` (`GET /admin/users` and `GET /admin/users/{id}`) with real wallet balances and transaction history.
- [ ] **Step 3:** Update `AdminReportsController.php` (`GET /admin/overview` and `GET /admin/reports`) to aggregate real deposits, withdrawals, investments, and transactions from MySQL.
- [ ] **Step 4:** Wire routes in `admin.routes.php` and run `php -l`.

---

### Task 4: PHP + MySQL 8 + Mock MXPay Integration Test Suite

**Files:**
- Create: `backend/tests/mock_mxpay.php`
- Modify: `backend/tests/run_tests.php`

- [ ] **Step 1:** Create `backend/tests/mock_mxpay.php` implementing `/api/web` and `/api/payout` JSON responses for local integration tests.
- [ ] **Step 2:** Extend `backend/tests/run_tests.php` to test MXPay deposit creation, deposit callback idempotency, `₹50` referral bonus on first deposit, investment purchase, task reward credit, bank account CRUD, withdrawal locking, admin approval + payout callback, admin rejection + wallet refund, and daily earnings accrual.
- [ ] **Step 3:** Run the isolated MySQL 8 integration script and assert 100% pass.

---

### Task 5: Frontend API Types, Hooks & Demo Label Removal

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/components/panel/layout.tsx`
- Modify: `src/components/panel/ui.tsx`
- Modify: `src/components/panel/plan-card.tsx`
- Modify: `src/test/api.test.ts`

- [ ] **Step 1:** Add real-money TypeScript types (`ApiWallet`, `ApiBankAccount`, `ApiDeposit`, `ApiWithdrawal`, `ApiInvestment`, `ApiTransaction`, `ApiTask`, `ApiAdminOverview`, `ApiAdminRequest`, etc.) to `src/lib/api.ts`.
- [ ] **Step 2:** Hide `DemoBanner` and `<Demo />` when `apiConfigured()` is `true`; update `PlanCard` and `usePaged` copy when `apiConfigured()` is `true`.
- [ ] **Step 3:** Run `npm test` and `npx tsc --noEmit`.

---

### Task 6: Connect Mobile & User Dashboard Real-Money Routes

**Files:**
- Modify: `src/routes/index.tsx`, `src/routes/plans.tsx`, `src/routes/tasks.tsx`, `src/routes/team.tsx`, `src/routes/wallet.tsx`, `src/routes/me.tsx`, `src/routes/deposit.tsx`, `src/routes/withdraw.tsx`
- Modify: `src/routes/dashboard.index.tsx`, `src/routes/dashboard.plans.tsx`, `src/routes/dashboard.investments.tsx`, `src/routes/dashboard.tasks.tsx`, `src/routes/dashboard.transactions.tsx`, `src/routes/dashboard.profile.tsx`, `src/routes/dashboard.referrals.tsx`
- Modify: `src/components/panel/my-requests.tsx`

- [ ] **Step 1:** Update mobile screens (`/`, `/plans`, `/tasks`, `/team`, `/wallet`, `/me`, `/deposit`, `/withdraw`) to use live wallet, MXPay deposit checkout redirect, bank-account withdrawal, plan investment, and task completion when `apiConfigured()` is `true`.
- [ ] **Step 2:** Update user dashboard routes (`/dashboard/*`) and `MyRequests` to read/mutate real deposits, withdrawals, investments, transactions, tasks, and bank accounts.
- [ ] **Step 3:** Verify TypeScript compilation (`npx tsc --noEmit`).

---

### Task 7: Connect Admin Real-Money Routes & Full End-to-End Verification

**Files:**
- Modify: `src/components/panel/requests.tsx`
- Modify: `src/routes/admin.index.tsx`, `src/routes/admin.users.tsx`, `src/routes/admin.investments.tsx`, `src/routes/admin.transactions.tsx`, `src/routes/admin.tasks.tsx`, `src/routes/admin.reports.tsx`, `src/routes/admin.tsx`

- [ ] **Step 1:** Update `RequestsPage` (`src/components/panel/requests.tsx`) for real `GET /admin/deposits`, `GET /admin/withdrawals`, Approve (`POST /admin/withdrawals/{id}/approve` triggering MXPay payout), and Reject (`POST /admin/withdrawals/{id}/reject` refunding user).
- [ ] **Step 2:** Update `admin.index.tsx`, `admin.users.tsx` (real wallet & history modal), `admin.investments.tsx`, `admin.transactions.tsx`, `admin.tasks.tsx`, `admin.reports.tsx`, and `admin.tsx` (pending withdrawals unread badge).
- [ ] **Step 3:** Run full verification (`php -l`, MySQL 8 + Mock MXPay integration tests, `npm test`, `npx tsc --noEmit`, `npm run build`, ESLint).

