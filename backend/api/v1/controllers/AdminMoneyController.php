<?php
declare(strict_types=1);
/** Admin real-money endpoints: deposits, MXPay withdrawal approvals/rejections, investments, transactions, tasks. */

function admin_deposits_list(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
  $where = ['1=1'];
  $params = [];
  if (in_array($status, ['pending', 'success', 'failed'], true)) { $where[] = 'd.status = ?'; $params[] = $status; }
  if ($q !== '') {
    $like = like_esc($q);
    $where[] = '(d.order_id LIKE ? OR u.full_name LIKE ? OR u.public_id LIKE ? OR COALESCE(d.platform_id,"") LIKE ?)';
    array_push($params, $like, $like, $like, $like);
  }
  $wSql = implode(' AND ', $where);
  $p = db();
  $s = $p->prepare("SELECT d.*, u.public_id AS user_public_id, u.full_name AS user_name FROM deposits d JOIN users u ON u.id = d.user_id WHERE $wSql ORDER BY d.id DESC LIMIT 200");
  $s->execute($params);
  $items = array_map(fn($d) => deposit_out($d) + ['userId' => $d['user_public_id'], 'userName' => $d['user_name']], $s->fetchAll());
  $counts = ['pending' => 0, 'success' => 0, 'failed' => 0];
  foreach ($p->query('SELECT status, COUNT(*) AS c FROM deposits GROUP BY status')->fetchAll() as $r) {
    $counts[$r['status']] = (int)$r['c'];
  }
  ok(['items' => $items, 'counts' => $counts]);
}

function admin_withdrawals_list(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
  $where = ['1=1'];
  $params = [];
  if (in_array($status, ['pending', 'processing', 'success', 'rejected', 'failed'], true)) { $where[] = 'w.status = ?'; $params[] = $status; }
  if ($q !== '') {
    $like = like_esc($q);
    $where[] = '(w.order_id LIKE ? OR u.full_name LIKE ? OR u.public_id LIKE ? OR w.bank_name LIKE ? OR w.ifsc LIKE ?)';
    array_push($params, $like, $like, $like, $like, $like);
  }
  $wSql = implode(' AND ', $where);
  $p = db();
  $s = $p->prepare("SELECT w.*, u.public_id AS user_public_id, u.full_name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE $wSql ORDER BY w.id DESC LIMIT 200");
  $s->execute($params);
  $items = array_map(fn($w) => withdrawal_out($w) + ['userId' => $w['user_public_id'], 'userName' => $w['user_name']], $s->fetchAll());
  $counts = ['pending' => 0, 'processing' => 0, 'success' => 0, 'rejected' => 0, 'failed' => 0];
  foreach ($p->query('SELECT status, COUNT(*) AS c FROM withdrawals GROUP BY status')->fetchAll() as $r) {
    $counts[$r['status']] = (int)$r['c'];
  }
  ok(['items' => $items, 'counts' => $counts]);
}

function admin_withdrawal_approve(string $orderId): never {
  $a = require_admin('admin');
  [$apiBase, , $token] = mxpay_urls();

  $wdr = tx(function (PDO $p) use ($orderId, $a) {
    $s = $p->prepare('SELECT * FROM withdrawals WHERE order_id = ? FOR UPDATE');
    $s->execute([$orderId]);
    $row = $s->fetch();
    if (!$row) fail(404, 'not_found', 'Withdrawal request not found');
    if ($row['status'] !== 'pending') fail(422, 'invalid_state', 'Only pending withdrawals can be approved');
    $p->prepare("UPDATE withdrawals SET status = 'processing', reviewed_by_admin_id = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?")
      ->execute([(int)$a['id'], (int)$row['id']]);
    return $row;
  });

  $callback = "$apiBase/webhooks/mxpay/payout/$token";
  $amtInr = paise_to_inr((int)$wdr['amount_paise']);
  $refundAndFail = function (string $msg) use ($wdr, $orderId, $a): never {
    tx(function (PDO $p) use ($wdr, $orderId, $msg) {
      $s = $p->prepare('SELECT * FROM withdrawals WHERE id = ? FOR UPDATE');
      $s->execute([(int)$wdr['id']]);
      $cur = $s->fetch();
      if (!$cur || $cur['status'] !== 'processing') return;
      $uid = (int)$cur['user_id'];
      $amt = (int)$cur['amount_paise'];
      $p->prepare("UPDATE withdrawals SET status = 'failed', gateway_message = ?, completed_at = UTC_TIMESTAMP() WHERE id = ?")
        ->execute([substr($msg, 0, 255), (int)$cur['id']]);
      $w = lock_wallet($p, $uid);
      $newTotal = (int)$w['deposit_paise'] + (int)$w['withdrawable_paise'] + $amt;
      $p->prepare('UPDATE wallets SET withdrawable_paise = withdrawable_paise + ? WHERE user_id = ?')->execute([$amt, $uid]);
      $p->prepare("UPDATE wallet_transactions SET status = 'failed' WHERE ref_id = ? AND type = 'withdrawal' AND status = 'pending'")->execute([$orderId]);
      record_wallet_tx($p, $uid, 'refund', 'withdrawable', 'credit', $amt, $newTotal, $orderId, 'success', 'MxPay payout rejected — refunded');
    });
    admin_log($a, 'withdrawal_failed', 'withdrawal', $orderId, ['message' => $msg]);
    fail(502, 'gateway_error', $msg);
  };

  try {
    $res = mxpay_create_payout($orderId, $amtInr, $wdr, $callback);
  } catch (Throwable $e) {
    $refundAndFail($e->getMessage());
  }

  if (($res['status'] ?? false) !== true) {
    $refundAndFail((string)($res['message'] ?? 'MxPay payout request failed'));
  }

  $msg = is_string($res['message'] ?? null) ? $res['message'] : 'Payout initiated';
  db()->prepare('UPDATE withdrawals SET gateway_message = ? WHERE id = ?')->execute([substr($msg, 0, 255), (int)$wdr['id']]);
  admin_log($a, 'withdrawal_approve', 'withdrawal', $orderId, ['amount' => $amtInr]);

  $s = db()->prepare('SELECT w.*, u.public_id AS user_public_id, u.full_name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.id = ?');
  $s->execute([(int)$wdr['id']]);
  $row = $s->fetch();
  ok(['withdrawal' => withdrawal_out($row) + ['userId' => $row['user_public_id'], 'userName' => $row['user_name']]]);
}

function admin_withdrawal_reject(string $orderId): never {
  $a = require_admin('admin');
  $note = is_string(body()['note'] ?? null) ? substr(trim(body()['note']), 0, 255) : 'Rejected by admin';
  if ($note === '') $note = 'Rejected by admin';

  tx(function (PDO $p) use ($orderId, $a, $note) {
    $s = $p->prepare('SELECT * FROM withdrawals WHERE order_id = ? FOR UPDATE');
    $s->execute([$orderId]);
    $wdr = $s->fetch();
    if (!$wdr) fail(404, 'not_found', 'Withdrawal request not found');
    if ($wdr['status'] !== 'pending') fail(422, 'invalid_state', 'Only pending withdrawals can be rejected');

    $uid = (int)$wdr['user_id'];
    $amt = (int)$wdr['amount_paise'];
    $p->prepare("UPDATE withdrawals SET status = 'rejected', gateway_message = ?, reviewed_by_admin_id = ?, reviewed_at = UTC_TIMESTAMP(), completed_at = UTC_TIMESTAMP() WHERE id = ?")
      ->execute([$note, (int)$a['id'], (int)$wdr['id']]);
    $w = lock_wallet($p, $uid);
    $newTotal = (int)$w['deposit_paise'] + (int)$w['withdrawable_paise'] + $amt;
    $p->prepare('UPDATE wallets SET withdrawable_paise = withdrawable_paise + ? WHERE user_id = ?')->execute([$amt, $uid]);
    $p->prepare("UPDATE wallet_transactions SET status = 'failed' WHERE ref_id = ? AND type = 'withdrawal' AND status = 'pending'")->execute([$orderId]);
    record_wallet_tx($p, $uid, 'refund', 'withdrawable', 'credit', $amt, $newTotal, $orderId, 'success', $note);
  });

  admin_log($a, 'withdrawal_reject', 'withdrawal', $orderId, ['note' => $note]);
  $s = db()->prepare('SELECT w.*, u.public_id AS user_public_id, u.full_name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.order_id = ?');
  $s->execute([$orderId]);
  $row = $s->fetch();
  ok(['withdrawal' => withdrawal_out($row) + ['userId' => $row['user_public_id'], 'userName' => $row['user_name']]]);
}

function admin_investments_list(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
  $planName = is_string($_GET['plan'] ?? null) ? trim($_GET['plan']) : 'all';
  $from = is_string($_GET['from'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
  $to = is_string($_GET['to'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';

  $where = ['1=1'];
  $params = [];
  if (in_array($status, ['active', 'completed'], true)) { $where[] = 'i.status = ?'; $params[] = $status; }
  if ($planName !== '' && $planName !== 'all') { $where[] = 'pl.name = ?'; $params[] = $planName; }
  if ($q !== '') {
    $like = like_esc($q);
    $where[] = '(i.public_id LIKE ? OR u.full_name LIKE ? OR u.public_id LIKE ?)';
    array_push($params, $like, $like, $like);
  }
  if ($from !== '') { $where[] = 'i.started_at >= ?'; $params[] = "$from 00:00:00"; }
  if ($to !== '') { $where[] = 'i.started_at <= ?'; $params[] = "$to 23:59:59"; }

  $p = db();
  $s = $p->prepare('SELECT i.*, pl.name AS plan_name, u.public_id AS user_public_id, u.full_name AS user_name FROM investments i JOIN plans pl ON pl.id = i.plan_id JOIN users u ON u.id = i.user_id WHERE ' . implode(' AND ', $where) . ' ORDER BY i.id DESC LIMIT 200');
  $s->execute($params);
  $items = array_map(fn($r) => investment_out($r) + ['userId' => $r['user_public_id'], 'userName' => $r['user_name']], $s->fetchAll());

  $counts = ['active' => 0, 'completed' => 0, 'totalAmount' => 0];
  $sumPaise = 0;
  foreach ($p->query('SELECT status, COUNT(*) AS c, COALESCE(SUM(amount_paise),0) AS amt FROM investments GROUP BY status')->fetchAll() as $r) {
    $counts[$r['status']] = (int)$r['c'];
    $sumPaise += (int)$r['amt'];
  }
  $counts['totalAmount'] = paise_to_inr($sumPaise);

  $dist = array_map(fn($r) => ['name' => $r['name'], 'value' => (int)$r['c']],
    $p->query('SELECT pl.name, COUNT(*) AS c FROM investments i JOIN plans pl ON pl.id = i.plan_id GROUP BY pl.id ORDER BY c DESC')->fetchAll());
  $monthly = array_map(fn($r) => ['m' => $r['ym'], 'count' => (int)$r['c'], 'value' => paise_to_inr((int)$r['amt'])],
    $p->query("SELECT DATE_FORMAT(started_at, '%Y-%m') AS ym, COUNT(*) AS c, SUM(amount_paise) AS amt FROM investments GROUP BY ym ORDER BY ym ASC LIMIT 12")->fetchAll());

  ok(['items' => $items, 'counts' => $counts, 'distribution' => $dist, 'monthly' => $monthly]);
}

function admin_investment_update(string $publicId): never {
  $a = require_admin('admin');
  $v = new V(body());
  $status = $v->oneOf('status', ['active', 'completed']);
  $v->done();
  $s = db()->prepare('UPDATE investments SET status = ? WHERE public_id = ?');
  $s->execute([$status, $publicId]);
  if ($s->rowCount() === 0) fail(404, 'not_found', 'Investment not found');
  admin_log($a, 'investment_status', 'investment', $publicId, ['status' => $status]);
  ok(['status' => $status]);
}

function admin_transactions_list(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $type = is_string($_GET['type'] ?? null) ? strtolower(trim($_GET['type'])) : 'all';
  $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
  $from = is_string($_GET['from'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
  $to = is_string($_GET['to'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';

  $where = ['1=1'];
  $params = [];
  $allowed = ['deposit', 'withdrawal', 'investment', 'earning', 'task', 'referral', 'refund', 'admin_adjust'];
  if (in_array($type, $allowed, true)) { $where[] = 't.type = ?'; $params[] = $type; }
  if (in_array($status, ['success', 'pending', 'failed'], true)) { $where[] = 't.status = ?'; $params[] = $status; }
  if ($q !== '') {
    $like = like_esc($q);
    $where[] = '(t.tx_ref LIKE ? OR COALESCE(t.ref_id,"") LIKE ? OR u.full_name LIKE ? OR u.public_id LIKE ?)';
    array_push($params, $like, $like, $like, $like);
  }
  if ($from !== '') { $where[] = 't.created_at >= ?'; $params[] = "$from 00:00:00"; }
  if ($to !== '') { $where[] = 't.created_at <= ?'; $params[] = "$to 23:59:59"; }

  $s = db()->prepare('SELECT t.*, u.public_id AS user_public_id, u.full_name AS user_name FROM wallet_transactions t JOIN users u ON u.id = t.user_id WHERE ' . implode(' AND ', $where) . ' ORDER BY t.id DESC LIMIT 200');
  $s->execute($params);
  $items = array_map(fn($r) => tx_out($r) + ['userId' => $r['user_public_id'], 'userName' => $r['user_name']], $s->fetchAll());
  ok(['items' => $items]);
}

function task_input(PDO $p): array {
  $b = body();
  $v = new V($b);
  $title = $v->str('title', 2, 80, null, 'Title must be 2–80 characters');
  $category = isset($b['category']) ? $v->oneOf('category', ['Daily', 'Social', 'Special']) : 'Daily';
  $reward = $v->int('reward', 1, 100000);
  $status = isset($b['status']) ? $v->oneOf('status', ['active', 'paused']) : 'active';
  $assigned = is_string($b['assignedUserId'] ?? null) ? trim($b['assignedUserId']) : 'all';
  $v->done();

  $uid = null;
  if ($assigned !== '' && $assigned !== 'all') {
    $us = $p->prepare('SELECT id FROM users WHERE public_id = ? AND deleted_at IS NULL');
    $us->execute([$assigned]);
    $uid = $us->fetchColumn();
    if ($uid === false) fail(422, 'validation', 'Assigned user not found', ['assignedUserId' => 'User not found']);
    $uid = (int)$uid;
  }
  return ['title' => $title, 'category' => $category, 'reward_paise' => $reward * 100, 'status' => $status, 'assigned_user_id' => $uid];
}

function admin_tasks_list(): never {
  require_admin('viewer');
  $p = db();
  $totalUsers = max(1, (int)$p->query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL')->fetchColumn());
  $rows = $p->query('SELECT t.*, u.public_id AS assigned_public_id, u.full_name AS assigned_name,
    (SELECT COUNT(DISTINCT tc.user_id) FROM task_completions tc WHERE tc.task_id = t.id) AS completions
    FROM tasks t LEFT JOIN users u ON u.id = t.assigned_user_id
    WHERE t.deleted_at IS NULL ORDER BY t.id DESC')->fetchAll();

  $items = array_map(fn($t) => [
    'id' => (string)$t['id'],
    'title' => $t['title'],
    'category' => $t['category'],
    'reward' => paise_to_inr((int)$t['reward_paise']),
    'status' => $t['status'],
    'assigned' => $t['assigned_public_id'] ?? 'all',
    'assignedName' => $t['assigned_name'] ?? 'All users',
    'completions' => (int)$t['completions'],
    'totalUsers' => $totalUsers,
  ], $rows);
  ok(['tasks' => $items]);
}

function admin_task_create(): never {
  $a = require_admin('admin');
  $p = db();
  $in = task_input($p);
  $p->prepare('INSERT INTO tasks (title, category, reward_paise, status, assigned_user_id) VALUES (?,?,?,?,?)')
    ->execute([$in['title'], $in['category'], $in['reward_paise'], $in['status'], $in['assigned_user_id']]);
  $id = (int)$p->lastInsertId();
  admin_log($a, 'task_create', 'task', $id, ['title' => $in['title']]);
  ok(['id' => (string)$id], 201);
}

function admin_task_update(string $id): never {
  $a = require_admin('admin');
  if (!ctype_digit($id)) fail(404, 'not_found', 'Task not found');
  $tid = (int)$id;
  $p = db();
  $chk = $p->prepare('SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL');
  $chk->execute([$tid]);
  if (!$chk->fetch()) fail(404, 'not_found', 'Task not found');

  $in = task_input($p);
  $p->prepare('UPDATE tasks SET title = ?, category = ?, reward_paise = ?, status = ?, assigned_user_id = ? WHERE id = ?')
    ->execute([$in['title'], $in['category'], $in['reward_paise'], $in['status'], $in['assigned_user_id'], $tid]);
  admin_log($a, 'task_update', 'task', $tid, ['title' => $in['title']]);
  ok(['updated' => true]);
}

function admin_task_delete(string $id): never {
  $a = require_admin('admin');
  if (!ctype_digit($id)) fail(404, 'not_found', 'Task not found');
  $tid = (int)$id;
  $s = db()->prepare('UPDATE tasks SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL');
  $s->execute([$tid]);
  if ($s->rowCount() === 0) fail(404, 'not_found', 'Task not found');
  admin_log($a, 'task_delete', 'task', $tid);
  ok(['deleted' => true]);
}

