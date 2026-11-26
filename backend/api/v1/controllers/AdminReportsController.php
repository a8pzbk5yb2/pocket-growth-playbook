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

  ok([
    'users' => $counts,
    'referrals' => $referrals,
    'activePlans' => $plans,
    'recentUsers' => $recentUsers,
    'recentLogs' => $recentLogs,
  ]);
}

function admin_reports(): never {
  require_admin('viewer');
  $kind = ($_GET['kind'] ?? 'Users') === 'Referrals' ? 'Referrals' : 'Users';
  $from = is_string($_GET['from'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
  $to = is_string($_GET['to'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';

  $p = db();
  if ($kind === 'Users') {
    $where = ['deleted_at IS NULL']; $params = [];
    if ($from !== '') { $where[] = 'created_at >= ?'; $params[] = "$from 00:00:00"; }
    if ($to !== '') { $where[] = 'created_at <= ?'; $params[] = "$to 23:59:59"; }
    $s = $p->prepare('SELECT public_id, full_name, status, created_at FROM users WHERE ' . implode(' AND ', $where) . ' ORDER BY created_at ASC LIMIT 1000');
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['full_name']} ({$r['public_id']})", 'amount' => 1], $s->fetchAll());
  } else {
    $where = ['u.deleted_at IS NULL']; $params = [];
    if ($from !== '') { $where[] = 'r.created_at >= ?'; $params[] = "$from 00:00:00"; }
    if ($to !== '') { $where[] = 'r.created_at <= ?'; $params[] = "$to 23:59:59"; }
    $s = $p->prepare('SELECT u.full_name, ic.code, r.created_at FROM referrals r JOIN users u ON u.id = r.referred_user_id JOIN invitation_codes ic ON ic.id = r.invitation_code_id WHERE ' . implode(' AND ', $where) . ' ORDER BY r.created_at ASC LIMIT 1000');
    $s->execute($params);
    $rows = array_map(fn($r) => ['date' => iso_utc($r['created_at']), 'label' => "{$r['full_name']} via {$r['code']}", 'amount' => 1], $s->fetchAll());
  }

  $byMonthMap = [];
  foreach ($rows as $r) {
    $m = substr((string)$r['date'], 0, 7);
    $byMonthMap[$m] = ($byMonthMap[$m] ?? 0) + $r['amount'];
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

