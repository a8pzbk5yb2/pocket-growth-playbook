<?php
return [
  'GET /me/wallet' => fn() => money_wallet(),
  'GET /me/bank-accounts' => fn() => money_bank_list(),
  'POST /me/bank-accounts' => fn() => money_bank_add(),
  'DELETE /me/bank-accounts/{id}' => fn(array $p) => money_bank_delete($p['id'] ?? ''),

  'GET /me/deposits' => fn() => money_deposits_list(),
  'POST /me/deposits' => fn() => money_deposit_create(),

  'GET /me/withdrawals' => fn() => money_withdrawals_list(),
  'POST /me/withdrawals' => fn() => money_withdrawal_create(),

  'GET /me/investments' => fn() => money_investments_list(),
  'POST /me/investments' => fn() => money_investment_create(),

  'GET /me/transactions' => fn() => money_transactions_list(),
  'GET /me/tasks' => fn() => money_tasks_list(),
  'POST /me/tasks/{id}/complete' => fn(array $p) => money_task_complete($p['id'] ?? ''),

  'POST /webhooks/mxpay/deposit/{token}' => fn(array $p) => webhook_mxpay_deposit($p['token'] ?? ''),
  'POST /webhooks/mxpay/payout/{token}' => fn(array $p) => webhook_mxpay_payout($p['token'] ?? ''),
];

