<?php
declare(strict_types=1);
/** User real-money endpoints: wallet, bank accounts, MXPay deposits, withdrawals, investments, transactions, tasks. */

function mask_acc(string $acc): string {
  $len = strlen($acc);
  return $len <= 4 ? $acc : '•••• ' . substr($acc, -4);
}

function bank_out(array $b): array {
  return [
    'id' => (string)$b['id'],
    'bankName' => $b['bank_name'],
    'accountNumber' => mask_acc($b['account_number']),
    'accountName' => $b['account_name'],
    'ifsc' => $b['ifsc'],
    'isDefault' => (bool)$b['is_default'],
  ];
}

function tx_out(array $t): array {
  $labels = [
    'deposit' => 'Deposit', 'withdrawal' => 'Withdrawal', 'investment' => 'Investment',
    'earning' => 'Daily Earning', 'task' => 'Task Reward', 'referral' => 'Referral Bonus',
    'refund' => 'Refund', 'admin_adjust' => 'Adjustment',
  ];
  return [
    'id' => $t['tx_ref'],
    'type' => $labels[$t['type']] ?? ucfirst($t['type']),
    'rawType' => $t['type'],
    'bucket' => $t['bucket'],
    'direction' => $t['direction'],
    'amount' => paise_to_inr((int)$t['amount_paise']),
    'balanceAfter' => paise_to_inr((int)$t['balance_after_paise']),
    'ref' => $t['ref_id'] ?? $t['tx_ref'],
    'status' => $t['status'],
    'note' => $t['note'],
    'date' => iso_utc($t['created_at']),
  ];
}

function deposit_out(array $d): array {
  return [
    'id' => $d['order_id'],
    'amount' => paise_to_inr((int)$d['amount_paise']),
    'method' => 'MXPay',
    'gatewayOrderNo' => $d['gateway_order_no'],
    'platformId' => $d['platform_id'],
    'paymentLink' => $d['payment_link'],
    'status' => $d['status'],
    'date' => iso_utc($d['created_at']),
    'paidAt' => iso_utc($d['paid_at']),
  ];
}

function withdrawal_out(array $w): array {
  return [
    'id' => $w['order_id'],
    'amount' => paise_to_inr((int)$w['amount_paise']),
    'method' => $w['bank_name'] . ' ' . mask_acc($w['account_number']),
    'bankName' => $w['bank_name'],
    'accountNumber' => mask_acc($w['account_number']),
    'accountName' => $w['account_name'],
    'ifsc' => $w['ifsc'],
    'status' => $w['status'],
    'note' => $w['gateway_message'] ?? '',
    'date' => iso_utc($w['created_at']),
    'reviewedAt' => iso_utc($w['reviewed_at']),
  ];
}

function investment_out(array $i): array {
  return [
    'id' => $i['public_id'],
    'planId' => (string)$i['plan_id'],
    'planName' => $i['plan_name'] ?? 'Plan',
    'amount' => paise_to_inr((int)$i['amount_paise']),
    'daily' => paise_to_inr((int)$i['daily_paise']),
    'duration' => (int)$i['duration_days'],
    'daysCredited' => (int)$i['days_credited'],
    'start' => iso_utc($i['started_at']),
    'status' => $i['status'],
  ];
}

function money_wallet(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  accrue_user_earnings($uid);
  $p = db();
  ensure_wallet($p, $uid);

  $ws = $p->prepare('SELECT * FROM wallets WHERE user_id = ?');
  $ws->execute([$uid]);
  $w = $ws->fetch();

  $bs = $p->prepare('SELECT * FROM bank_accounts WHERE user_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, id DESC');
  $bs->execute([$uid]);
  $banks = array_map('bank_out', $bs->fetchAll());

  $ts = $p->prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 20');
  $ts->execute([$uid]);
  $txs = array_map('tx_out', $ts->fetchAll());

  ok(['wallet' => wallet_out($w), 'bankAccounts' => $banks, 'recentTransactions' => $txs]);
}

function money_bank_list(): never {
  $u = require_user();
  $s = db()->prepare('SELECT * FROM bank_accounts WHERE user_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, id DESC');
  $s->execute([(int)$u['id']]);
  ok(['bankAccounts' => array_map('bank_out', $s->fetchAll())]);
}

function money_bank_add(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $b = body();
  $v = new V($b);
  $bankName = $v->str('bankName', 2, 120, null, 'Enter bank name');
  $accNum = $v->str('accountNumber', 6, 34, '/^[0-9]{6,34}$/', 'Enter a valid bank account number (digits only)');
  $accName = $v->str('accountName', 2, 100, RE_NAME, 'Enter account holder name');
  $ifsc = strtoupper($v->str('ifsc', 11, 11, '/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/', 'Enter a valid 11-character IFSC code'));
  $v->done();

  $row = tx(function (PDO $p) use ($uid, $bankName, $accNum, $accName, $ifsc) {
    $p->prepare('UPDATE bank_accounts SET is_default = 0 WHERE user_id = ? AND deleted_at IS NULL')->execute([$uid]);
    $p->prepare('INSERT INTO bank_accounts (user_id, bank_name, account_number, account_name, ifsc, is_default) VALUES (?,?,?,?,?,1)')
      ->execute([$uid, $bankName, $accNum, $accName, $ifsc]);
    $id = (int)$p->lastInsertId();
    $s = $p->prepare('SELECT * FROM bank_accounts WHERE id = ?');
    $s->execute([$id]);
    return $s->fetch();
  });
  ok(['bankAccount' => bank_out($row)], 201);
}

function money_bank_delete(string $id): never {
  $u = require_user();
  if (!ctype_digit($id)) fail(404, 'not_found', 'Bank account not found');
  $s = db()->prepare('UPDATE bank_accounts SET deleted_at = UTC_TIMESTAMP(), is_default = 0 WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
  $s->execute([(int)$id, (int)$u['id']]);
  if ($s->rowCount() === 0) fail(404, 'not_found', 'Bank account not found');
  ok(['deleted' => true]);
}

function money_deposits_list(): never {
  $u = require_user();
  $s = db()->prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY id DESC LIMIT 100');
  $s->execute([(int)$u['id']]);
  ok(['deposits' => array_map('deposit_out', $s->fetchAll())]);
}

function money_deposit_create(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $b = body();
  $v = new V($b);
  $amount = $v->int('amount', 100, 500000);
  $v->done();

  [$apiBase, $appUrl, $token] = mxpay_urls();
  $orderId = make_ref('DEP');
  $amountPaise = $amount * 100;
  $p = db();
  ensure_wallet($p, $uid);
  $p->prepare("INSERT INTO deposits (order_id, user_id, amount_paise, gateway, status) VALUES (?, ?, ?, 'mxpay', 'pending')")
    ->execute([$orderId, $uid, $amountPaise]);

  $callback = "$apiBase/webhooks/mxpay/deposit/$token";
  $pageUrl = "$appUrl/wallet?deposit=$orderId";
  try {
    $res = mxpay_create_order($orderId, (float)$amount, $callback, $pageUrl);
  } catch (Throwable $e) {
    $p->prepare("UPDATE deposits SET status = 'failed' WHERE order_id = ?")->execute([$orderId]);
    throw $e;
  }

  if (($res['status'] ?? false) !== true || empty($res['payment_link'])) {
    $p->prepare("UPDATE deposits SET status = 'failed', raw_callback = ? WHERE order_id = ?")
      ->execute([json_encode($res), $orderId]);
    fail(502, 'gateway_error', (string)($res['message'] ?? 'Could not create payment link. Please try again.'));
  }

  $orderNo = is_string($res['orderNo'] ?? null) ? $res['orderNo'] : null;
  $link = (string)$res['payment_link'];
  $p->prepare('UPDATE deposits SET gateway_order_no = ?, payment_link = ? WHERE order_id = ?')
    ->execute([$orderNo, $link, $orderId]);

  $s = $p->prepare('SELECT * FROM deposits WHERE order_id = ?');
  $s->execute([$orderId]);
  ok(['deposit' => deposit_out($s->fetch()), 'paymentLink' => $link], 201);
}

function money_withdrawals_list(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  accrue_user_earnings($uid);
  $s = db()->prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT 100');
  $s->execute([$uid]);
  ok(['withdrawals' => array_map('withdrawal_out', $s->fetchAll())]);
}

function money_withdrawal_create(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $b = body();
  $v = new V($b);
  $amount = $v->int('amount', 100, 500000);
  $bankId = $v->int('bankAccountId', 1, 999999999);
  $v->done();

  accrue_user_earnings($uid);
  $amountPaise = $amount * 100;
  $orderId = make_ref('WDR');

  $row = tx(function (PDO $p) use ($uid, $bankId, $amountPaise, $orderId) {
    $bs = $p->prepare('SELECT * FROM bank_accounts WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
    $bs->execute([$bankId, $uid]);
    $bank = $bs->fetch();
    if (!$bank) fail(422, 'validation', 'Select a valid bank account', ['bankAccountId' => 'Select a valid bank account']);

    $w = lock_wallet($p, $uid);
    if ((int)$w['withdrawable_paise'] < $amountPaise) {
      fail(422, 'insufficient_balance', 'Amount is more than your withdrawable earnings balance', ['amount' => 'Insufficient withdrawable balance']);
    }

    $newWdr = (int)$w['withdrawable_paise'] - $amountPaise;
    $newTotal = (int)$w['deposit_paise'] + $newWdr;
    $p->prepare('UPDATE wallets SET withdrawable_paise = ? WHERE user_id = ?')->execute([$newWdr, $uid]);
    $p->prepare("INSERT INTO withdrawals (order_id, user_id, bank_account_id, bank_name, account_number, account_name, ifsc, amount_paise, status) VALUES (?,?,?,?,?,?,?,?,'pending')")
      ->execute([$orderId, $uid, (int)$bank['id'], $bank['bank_name'], $bank['account_number'], $bank['account_name'], $bank['ifsc'], $amountPaise]);
    record_wallet_tx($p, $uid, 'withdrawal', 'withdrawable', 'debit', $amountPaise, $newTotal, $orderId, 'pending', 'Withdrawal requested');

    $ws = $p->prepare('SELECT * FROM withdrawals WHERE order_id = ?');
    $ws->execute([$orderId]);
    return $ws->fetch();
  });

  ok(['withdrawal' => withdrawal_out($row)], 201);
}

function money_investments_list(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  accrue_user_earnings($uid);
  $s = db()->prepare('SELECT i.*, p.name AS plan_name FROM investments i JOIN plans p ON p.id = i.plan_id WHERE i.user_id = ? ORDER BY i.id DESC LIMIT 100');
  $s->execute([$uid]);
  ok(['investments' => array_map('investment_out', $s->fetchAll())]);
}

function money_investment_create(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $b = body();
  $v = new V($b);
  $planId = $v->int('planId', 1, 999999999);
  $v->done();

  accrue_user_earnings($uid);
  $invId = make_ref('INV');

  $res = tx(function (PDO $p) use ($uid, $planId, $invId) {
    $ps = $p->prepare("SELECT * FROM plans WHERE id = ? AND status = 'active' AND deleted_at IS NULL");
    $ps->execute([$planId]);
    $plan = $ps->fetch();
    if (!$plan) fail(404, 'not_found', 'Plan not found or inactive');

    $pricePaise = (int)$plan['display_price'] * 100;
    $dailyPaise = (int)$plan['display_daily'] * 100;
    $days = (int)$plan['duration_days'];

    $w = lock_wallet($p, $uid);
    $dep = (int)$w['deposit_paise'];
    $wdr = (int)$w['withdrawable_paise'];
    if ($dep + $wdr < $pricePaise) {
      fail(422, 'insufficient_balance', 'Insufficient balance. Add funds to invest in this plan.');
    }

    $fromDep = min($dep, $pricePaise);
    $fromWdr = $pricePaise - $fromDep;
    $newDep = $dep - $fromDep;
    $newWdr = $wdr - $fromWdr;
    $bucket = $fromDep > 0 ? 'deposit' : 'withdrawable';

    $p->prepare('UPDATE wallets SET deposit_paise = ?, withdrawable_paise = ? WHERE user_id = ?')->execute([$newDep, $newWdr, $uid]);
    $p->prepare("INSERT INTO investments (public_id, user_id, plan_id, amount_paise, daily_paise, duration_days, days_credited, status) VALUES (?,?,?,?,?,?,0,'active')")
      ->execute([$invId, $uid, $planId, $pricePaise, $dailyPaise, $days]);
    record_wallet_tx($p, $uid, 'investment', $bucket, 'debit', $pricePaise, $newDep + $newWdr, $invId, 'success', 'Invested in ' . $plan['name']);
    award_first_referral_bonus($p, $uid);

    $is = $p->prepare('SELECT i.*, p.name AS plan_name FROM investments i JOIN plans p ON p.id = i.plan_id WHERE i.public_id = ?');
    $is->execute([$invId]);
    $ws = $p->prepare('SELECT * FROM wallets WHERE user_id = ?');
    $ws->execute([$uid]);
    return ['investment' => investment_out($is->fetch()), 'wallet' => wallet_out($ws->fetch())];
  });

  ok($res, 201);
}

function money_transactions_list(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  accrue_user_earnings($uid);
  $type = is_string($_GET['type'] ?? null) ? strtolower(trim($_GET['type'])) : 'all';
  $allowed = ['deposit', 'withdrawal', 'investment', 'earning', 'task', 'referral', 'refund', 'admin_adjust'];
  $where = ['user_id = ?'];
  $params = [$uid];
  if (in_array($type, $allowed, true)) {
    $where[] = 'type = ?';
    $params[] = $type;
  }
  $s = db()->prepare('SELECT * FROM wallet_transactions WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC LIMIT 100');
  $s->execute($params);
  ok(['transactions' => array_map('tx_out', $s->fetchAll())]);
}

function money_tasks_list(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $today = gmdate('Y-m-d');
  $s = db()->prepare("SELECT t.*,
    EXISTS(SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id AND tc.user_id = ? AND tc.completed_date = IF(t.category = 'Daily', ?, '1970-01-01')) AS is_done
    FROM tasks t
    WHERE t.deleted_at IS NULL AND t.status = 'active' AND (t.assigned_user_id IS NULL OR t.assigned_user_id = ?)
    ORDER BY t.id ASC");
  $s->execute([$uid, $today, $uid]);
  $items = array_map(fn($r) => [
    'id' => (string)$r['id'],
    'title' => $r['title'],
    'category' => $r['category'],
    'reward' => paise_to_inr((int)$r['reward_paise']),
    'status' => $r['status'],
    'completed' => (bool)$r['is_done'],
  ], $s->fetchAll());
  ok(['tasks' => $items]);
}

function money_task_complete(string $id): never {
  $u = require_user();
  $uid = (int)$u['id'];
  if (!ctype_digit($id)) fail(404, 'not_found', 'Task not found');
  $tid = (int)$id;
  $today = gmdate('Y-m-d');

  $res = tx(function (PDO $p) use ($uid, $tid, $today) {
    $ts = $p->prepare("SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL AND status = 'active' AND (assigned_user_id IS NULL OR assigned_user_id = ?)");
    $ts->execute([$tid, $uid]);
    $task = $ts->fetch();
    if (!$task) fail(404, 'not_found', 'Task not found');

    $compDate = $task['category'] === 'Daily' ? $today : '1970-01-01';
    $rewardPaise = (int)$task['reward_paise'];
    try {
      $p->prepare('INSERT INTO task_completions (task_id, user_id, completed_date, reward_paise) VALUES (?, ?, ?, ?)')
        ->execute([$tid, $uid, $compDate, $rewardPaise]);
    } catch (PDOException $e) {
      if ((string)$e->getCode() === '23000') fail(422, 'already_completed', 'Task already completed');
      throw $e;
    }

    $w = lock_wallet($p, $uid);
    $newTotal = (int)$w['deposit_paise'] + (int)$w['withdrawable_paise'] + $rewardPaise;
    $p->prepare('UPDATE wallets SET withdrawable_paise = withdrawable_paise + ?, total_earned_paise = total_earned_paise + ? WHERE user_id = ?')
      ->execute([$rewardPaise, $rewardPaise, $uid]);
    record_wallet_tx($p, $uid, 'task', 'withdrawable', 'credit', $rewardPaise, $newTotal, 'TASK-' . $tid, 'success', 'Task completed: ' . $task['title']);

    $ws = $p->prepare('SELECT * FROM wallets WHERE user_id = ?');
    $ws->execute([$uid]);
    return ['reward' => paise_to_inr($rewardPaise), 'wallet' => wallet_out($ws->fetch())];
  });

  ok($res);
}

