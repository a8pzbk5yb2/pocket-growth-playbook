<?php
declare(strict_types=1);
/** Phase 6: Admin overview, reports, activity logs, and platform settings. */

function admin_overview(): never {
  require_admin('viewer');
  $p = db();
  $counts = ['total' => 0, 'active' => 0, 'inactive' => 0, 'blocked' => 0];
  foreach ($p->query('SELECT status, COUNT(*) AS c FROM users WHERE deleted_at IS NULL GROUP BY status')->fetchAll() as $r) {
    $counts[$r['status']] = (int)$r['c'];
    $counts['total'] += (int)$r['c'];
  }
  $referrals = (int)$p->query('SELECT COUNT(*) FROM referrals')->fetchColumn();
  $plans = (int)$p->query("SELECT COUNT(*) FROM plans WHERE status = 'active' AND deleted_at IS NULL")->fetchColumn();
  $totalDeposited = paise_to_inr((int)$p->query("SELECT COALESCE(SUM(amount_paise), 0) FROM deposits WHERE status = 'success'")->fetchColumn());
  $totalWithdrawn = paise_to_inr((int)$p->query("SELECT COALESCE(SUM(amount_paise), 0) FROM withdrawals WHERE status = 'success'")->fetchColumn());
  $activeInvestments = (int)$p->query("SELECT COUNT(*) FROM investments WHERE status = 'active'")->fetchColumn();
  $pendingWithdrawals = (int)$p->query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'")->fetchColumn();

  $recentUsers = array_map(fn($u) => [
    'id' => $u['public_id'],
    'name' => $u['full_name'],
    'mobile' => $u['mobile'],
    'status' => $u['status'],
    'joined' => iso_utc($u['created_at']),
  ], $p->query('SELECT public_id, full_name, mobile, status, created_at FROM users WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 5')->fetchAll());

  $recentLogs = array_map(fn($l) => [
    'id' => (string)$l['id'],
    'admin' => $l['username'] ?? 'system',
    'action' => $l['action'],
    'targetType' => $l['target_type'],
    'targetId' => $l['target_id'],
    'date' => iso_utc($l['created_at']),
  ], $p->query('SELECT l.*, a.username FROM admin_activity_logs l LEFT JOIN admin_users a ON a.id = l.admin_id ORDER BY l.id DESC LIMIT 8')->fetchAll());

  $recentTransactions = array_map(fn($t) => tx_out($t) + ['userId' => $t['user_public_id'], 'userName' => $t['user_name']],
    $p->query('SELECT t.*, u.public_id AS user_public_id, u.full_name AS user_name FROM wallet_transactions t JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT 5')->fetchAll());

  $pendingRequests = array_map(fn($w) => withdrawal_out($w) + ['userId' => $w['user_public_id'], 'userName' => $w['user_name']],
    $p->query("SELECT w.*, u.public_id AS user_public_id, u.full_name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.status = 'pending' ORDER BY w.id DESC LIMIT 5")->fetchAll());

  $revRows = $p->query("SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m') AS m, SUM(amount_paise) AS amt FROM deposits WHERE status = 'success' GROUP BY m ORDER BY m ASC LIMIT 12")->fetchAll();
  $revenueSeries = array_map(fn($r) => ['m' => $r['m'], 'v' => paise_to_inr((int)$r['amt'])], $revRows);

  $ugRows = $p->query("SELECT DATE_FORMAT(created_at, '%Y-%m') AS m, COUNT(*) AS c FROM users WHERE deleted_at IS NULL GROUP BY m ORDER BY m ASC LIMIT 12")->fetchAll();
  $userGrowthSeries = array_map(fn($r) => ['m' => $r['m'], 'v' => (int)$r['c']], $ugRows);

  ok([
    'users' => $counts,
    'referrals' => $referrals,
    'activePlans' => $plans,
    'totalDeposited' => $totalDeposited,
    'totalWithdrawn' => $totalWithdrawn,
    'activeInvestments' => $activeInvestments,
    'pendingWithdrawals' => $pendingWithdrawals,
    'recentUsers' => $recentUsers,
    'recentLogs' => $recentLogs,
    'recentTransactions' => $recentTransactions,
    'pendingRequests' => $pendingRequests,
    'revenueSeries' => $revenueSeries,
    'userGrowthSeries' => $userGrowthSeries,
  ]);
}

function admin_reports(): never {
  require_admin('viewer');
  $allowed = ['Users', 'Referrals', 'Deposits', 'Withdrawals', 'Investments', 'Transactions'];
  $kind = in_array($_GET['kind'] ?? 'Users', $allowed, true) ? (string)$_GET['kind'] : 'Users';
  $from = is_string($_GET['from'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
  $to = is_string($_GET['to'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';

  $p = db();
  $dateWhere = function (string $col) use ($from, $to): array {
    $w = ['1=1']; $pr = [];
    if ($from !== '') { $w[] = "$col >= ?"; $pr[] = "$from 00:00:00"; }
    if ($to !== '') { $w[] = "$col <= ?"; $pr[] = "$to 23:59:59"; }
    return [implode(' AND ', $w), $pr];
  };

  if ($kind === 'Users') {
    [$dw, $params] = $dateWhere('created_at');
    $s = $p->prepare("SELECT public_id, full_name, created_at FROM users WHERE deleted_at IS NULL AND $dw ORDER BY created_at ASC LIMIT 1000");
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['full_name']} ({$r['public_id']})", 'amount' => 1], $s->fetchAll());
  } elseif ($kind === 'Referrals') {
    [$dw, $params] = $dateWhere('r.created_at');
    $s = $p->prepare("SELECT u.full_name, ic.code, r.created_at FROM referrals r JOIN users u ON u.id = r.referred_user_id JOIN invitation_codes ic ON ic.id = r.invitation_code_id WHERE u.deleted_at IS NULL AND $dw ORDER BY r.created_at ASC LIMIT 1000");
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['full_name']} via {$r['code']}", 'amount' => 1], $s->fetchAll());
  } elseif ($kind === 'Deposits') {
    [$dw, $params] = $dateWhere('d.created_at');
    $s = $p->prepare("SELECT d.order_id, d.amount_paise, d.status, d.created_at, u.full_name FROM deposits d JOIN users u ON u.id = d.user_id WHERE $dw ORDER BY d.created_at ASC LIMIT 1000");
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['order_id']} · {$r['full_name']} ({$r['status']})", 'amount' => paise_to_inr((int)$r['amount_paise'])], $s->fetchAll());
  } elseif ($kind === 'Withdrawals') {
    [$dw, $params] = $dateWhere('w.created_at');
    $s = $p->prepare("SELECT w.order_id, w.amount_paise, w.status, w.created_at, u.full_name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE $dw ORDER BY w.created_at ASC LIMIT 1000");
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['order_id']} · {$r['full_name']} ({$r['status']})", 'amount' => paise_to_inr((int)$r['amount_paise'])], $s->fetchAll());
  } elseif ($kind === 'Investments') {
    [$dw, $params] = $dateWhere('i.started_at');
    $s = $p->prepare("SELECT i.public_id, i.amount_paise, i.status, i.started_at, pl.name AS plan_name FROM investments i JOIN plans pl ON pl.id = i.plan_id WHERE $dw ORDER BY i.started_at ASC LIMIT 1000");
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['started_at']), 'label' => "{$r['public_id']} · {$r['plan_name']} ({$r['status']})", 'amount' => paise_to_inr((int)$r['amount_paise'])], $s->fetchAll());
  } else {
    [$dw, $params] = $dateWhere('t.created_at');
    $s = $p->prepare("SELECT t.tx_ref, t.type, t.amount_paise, t.created_at FROM wallet_transactions t WHERE $dw ORDER BY t.created_at ASC LIMIT 1000");
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['tx_ref']} {$r['type']}", 'amount' => paise_to_inr((int)$r['amount_paise'])], $s->fetchAll());
  }

  $byMonthMap = [];
  foreach ($rows as $r) {
    $m = substr((string)$r['date'], 0, 7);
    $byMonthMap[$m] = round(($byMonthMap[$m] ?? 0) + $r['amount'], 2);
  }
  ksort($byMonthMap);
  $byMonth = [];
  foreach ($byMonthMap as $m => $v) $byMonth[] = ['m' => $m, 'v' => $v];

  ok(['kind' => $kind, 'records' => $rows, 'byMonth' => $byMonth]);
}

function admin_activity_logs(): never {
  require_admin('viewer');
  $page = max(1, (int)($_GET['page'] ?? 1));
  $perPage = max(1, min(100, (int)($_GET['perPage'] ?? 20)));
  $offset = ($page - 1) * $perPage;
  $p = db();
  $total = (int)$p->query('SELECT COUNT(*) FROM admin_activity_logs')->fetchColumn();
  $rows = $p->query("SELECT l.id, a.username, l.action, l.target_type, l.target_id, l.details, INET6_NTOA(l.ip) AS ip_str, l.created_at
    FROM admin_activity_logs l LEFT JOIN admin_users a ON a.id = l.admin_id
    ORDER BY l.id DESC LIMIT $perPage OFFSET $offset")->fetchAll();
  $items = array_map(fn($l) => [
    'id' => (string)$l['id'],
    'admin' => $l['username'] ?? 'system',
    'action' => $l['action'],
    'targetType' => $l['target_type'],
    'targetId' => $l['target_id'],
    'details' => $l['details'] ? json_decode($l['details'], true) : null,
    'ip' => $l['ip_str'] ?? '—',
    'date' => iso_utc($l['created_at']),
  ], $rows);
  ok(['items' => $items, 'total' => $total, 'page' => $page, 'perPage' => $perPage]);
}

function admin_settings_get(): never {
  require_admin('viewer');
  $rows = db()->query('SELECT setting_key, setting_value FROM platform_settings')->fetchAll();
  $out = [];
  foreach ($rows as $r) $out[$r['setting_key']] = $r['setting_value'];
  ok(['settings' => $out]);
}

function admin_settings_update(): never {
  $a = require_admin('admin');
  $b = body();
  $allowed = ['site_name', 'logo_text', 'support_contact', 'website_url', 'registration_open', 'policy_version', 'maintenance_mode'];
  $v = new V($b);
  $updates = [];
  foreach ($allowed as $k) {
    if (!array_key_exists($k, $b)) continue;
    if ($k === 'registration_open' || $k === 'maintenance_mode') {
      $val = ($b[$k] === '1' || $b[$k] === true || $b[$k] === 1) ? '1' : '0';
    } else {
      $val = $v->str($k, 1, 200, null, "Invalid $k");
    }
    $updates[$k] = $val;
  }
  $v->done();
  if (!$updates) fail(422, 'validation', 'No valid settings provided');

  tx(function (PDO $p) use ($updates, $a) {
    $st = $p->prepare('INSERT INTO platform_settings (setting_key, setting_value, updated_by_admin_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by_admin_id = VALUES(updated_by_admin_id)');
    foreach ($updates as $k => $val) $st->execute([$k, $val, (int)$a['id']]);
  });
  admin_log($a, 'settings_update', 'platform_settings', null, ['keys' => array_keys($updates)]);
  admin_settings_get();
}

