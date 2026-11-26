<?php
declare(strict_types=1);
/** Phase 5: Admin plans, invitation codes, referrals, and notifications. */

function plan_input(): array {
  $b = body();
  $v = new V($b);
  $in = [
    'name' => $v->str('name', 2, 60, null, 'Plan name must be 2–60 characters'),
    'icon' => $v->oneOf('icon', ['zap', 'star', 'crown', 'gem']),
    'price' => $v->int('price', 1, 10000000),
    'daily' => $v->int('daily', 0, 10000000),
    'duration' => $v->int('duration', 1, 3650),
    'description' => $v->optStr('description', 255, null, 'Description must be under 255 characters') ?? '',
    'status' => isset($b['status']) ? $v->oneOf('status', ['active', 'inactive']) : 'active',
    'sortOrder' => $v->optInt('sortOrder', -1000, 1000) ?? 0,
  ];
  $v->done();
  return $in;
}

function admin_plans_list(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
  $where = ['deleted_at IS NULL'];
  $params = [];
  if (in_array($status, ['active', 'inactive'], true)) { $where[] = 'status = ?'; $params[] = $status; }
  if ($q !== '') { $where[] = 'name LIKE ?'; $params[] = like_esc($q); }
  $s = db()->prepare('SELECT * FROM plans WHERE ' . implode(' AND ', $where) . ' ORDER BY sort_order ASC, id ASC');
  $s->execute($params);
  ok(['plans' => array_map('plan_out', $s->fetchAll())]);
}

function admin_plan_create(): never {
  $a = require_admin('admin');
  $in = plan_input();
  $p = db();
  $p->prepare('INSERT INTO plans (name, icon, display_price, display_daily, duration_days, description, status, sort_order) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$in['name'], $in['icon'], $in['price'], $in['daily'], $in['duration'], $in['description'], $in['status'], $in['sortOrder']]);
  $id = (int)$p->lastInsertId();
  $s = $p->prepare('SELECT * FROM plans WHERE id = ?'); $s->execute([$id]);
  admin_log($a, 'plan_create', 'plan', $id, ['name' => $in['name']]);
  ok(['plan' => plan_out($s->fetch())], 201);
}

function admin_plan_update(string $id): never {
  $a = require_admin('admin');
  if (!ctype_digit($id)) fail(404, 'not_found', 'Plan not found');
  $pid = (int)$id;
  $p = db();
  $chk = $p->prepare('SELECT * FROM plans WHERE id = ? AND deleted_at IS NULL'); $chk->execute([$pid]);
  $cur = $chk->fetch();
  if (!$cur) fail(404, 'not_found', 'Plan not found');

  $b = body();
  // Allow status-only toggle or full edit cleanly
  if (array_keys($b) === ['status']) {
    $v = new V($b);
    $st = $v->oneOf('status', ['active', 'inactive']);
    $v->done();
    $p->prepare('UPDATE plans SET status = ? WHERE id = ?')->execute([$st, $pid]);
  } else {
    $in = plan_input();
    $p->prepare('UPDATE plans SET name = ?, icon = ?, display_price = ?, display_daily = ?, duration_days = ?, description = ?, status = ?, sort_order = ? WHERE id = ?')
      ->execute([$in['name'], $in['icon'], $in['price'], $in['daily'], $in['duration'], $in['description'], $in['status'], $in['sortOrder'], $pid]);
  }
  $s = $p->prepare('SELECT * FROM plans WHERE id = ?'); $s->execute([$pid]);
  $out = plan_out($s->fetch());
  admin_log($a, 'plan_update', 'plan', $pid, ['status' => $out['status']]);
  ok(['plan' => $out]);
}

function admin_plan_delete(string $id): never {
  $a = require_admin('admin');
  if (!ctype_digit($id)) fail(404, 'not_found', 'Plan not found');
  $pid = (int)$id;
  $s = db()->prepare('UPDATE plans SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL');
  $s->execute([$pid]);
  if ($s->rowCount() === 0) fail(404, 'not_found', 'Plan not found');
  admin_log($a, 'plan_delete', 'plan', $pid);
  ok(['deleted' => true]);
}

function admin_referrals(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $p = db();

  $codes = array_map(fn($c) => [
    'id' => (string)$c['id'],
    'code' => $c['code'],
    'owner' => $c['owner_name'] ?? 'PowerBank (system)',
    'ownerId' => $c['owner_public_id'],
    'uses' => (int)$c['uses'],
    'maxUses' => $c['max_uses'] !== null ? (int)$c['max_uses'] : null,
    'status' => $c['status'],
    'expiresAt' => iso_utc($c['expires_at']),
  ], $p->query('SELECT ic.*, u.full_name AS owner_name, u.public_id AS owner_public_id FROM invitation_codes ic LEFT JOIN users u ON u.id = ic.owner_user_id WHERE ic.deleted_at IS NULL ORDER BY ic.uses DESC, ic.id DESC LIMIT 100')->fetchAll());

  $where = ['u.deleted_at IS NULL'];
  $params = [];
  if ($q !== '') {
    $like = like_esc($q);
    $where[] = '(u.full_name LIKE ? OR u.public_id LIKE ? OR ic.code LIKE ?)';
    array_push($params, $like, $like, $like);
  }
  $rs = $p->prepare('SELECT u.public_id, u.full_name, u.status, r.created_at, ic.code, ru.full_name AS referrer_name
    FROM referrals r
    JOIN users u ON u.id = r.referred_user_id
    JOIN invitation_codes ic ON ic.id = r.invitation_code_id
    LEFT JOIN users ru ON ru.id = r.referrer_user_id
    WHERE ' . implode(' AND ', $where) . ' ORDER BY r.created_at DESC, r.id DESC LIMIT 200');
  $rs->execute($params);
  $referrals = array_map(fn($r) => [
    'userId' => $r['public_id'],
    'userName' => $r['full_name'],
    'code' => $r['code'],
    'referredBy' => $r['referrer_name'] ?? 'PowerBank (system)',
    'joined' => iso_utc($r['created_at']),
    'status' => $r['status'],
  ], $rs->fetchAll());

  $totalReferrals = (int)$p->query('SELECT COUNT(*) FROM referrals')->fetchColumn();
  $activeReferrals = (int)$p->query("SELECT COUNT(*) FROM referrals r JOIN users u ON u.id = r.referred_user_id WHERE u.status = 'active' AND u.deleted_at IS NULL")->fetchColumn();
  $top = array_slice($codes, 0, 8);

  ok([
    'codes' => $codes,
    'referrals' => $referrals,
    'topReferrers' => $top,
    'stats' => ['total' => $totalReferrals, 'active' => $activeReferrals, 'codes' => count($codes)],
  ]);
}

function admin_invite_create(): never {
  $a = require_admin('admin');
  $b = body();
  $v = new V($b);
  $code = strtoupper($v->str('code', 3, 20, '/^[A-Za-z0-9]+$/', 'Code must be 3–20 letters or numbers'));
  $maxUses = $v->optInt('maxUses', 1, 1000000);
  $v->done();

  $p = db();
  $chk = $p->prepare('SELECT 1 FROM invitation_codes WHERE code = ?'); $chk->execute([$code]);
  if ($chk->fetch()) fail(422, 'validation', 'This code already exists', ['code' => 'This code already exists']);

  $p->prepare('INSERT INTO invitation_codes (code, max_uses, created_by_admin_id) VALUES (?, ?, ?)')->execute([$code, $maxUses, (int)$a['id']]);
  $id = (int)$p->lastInsertId();
  admin_log($a, 'invite_create', 'invitation_code', $id, ['code' => $code]);
  ok(['id' => (string)$id, 'code' => $code, 'maxUses' => $maxUses, 'status' => 'active'], 201);
}

function admin_invite_update(string $id): never {
  $a = require_admin('admin');
  if (!ctype_digit($id)) fail(404, 'not_found', 'Invitation code not found');
  $iid = (int)$id;
  $b = body();
  $v = new V($b);
  $status = $v->oneOf('status', ['active', 'disabled']);
  $v->done();

  $s = db()->prepare('UPDATE invitation_codes SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $s->execute([$status, $iid]);
  if ($s->rowCount() === 0) fail(404, 'not_found', 'Invitation code not found');
  admin_log($a, 'invite_update', 'invitation_code', $iid, ['status' => $status]);
  ok(['status' => $status]);
}

function admin_notifications_list(): never {
  require_admin('viewer');
  $rows = db()->query('SELECT n.*, u.public_id AS target_public_id, u.full_name AS target_name, COUNT(nr.user_id) AS read_count
    FROM notifications n
    LEFT JOIN users u ON u.id = n.user_id
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id
    WHERE n.deleted_at IS NULL
    GROUP BY n.id
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT 100')->fetchAll();

  $items = array_map(fn($n) => [
    'id' => (string)$n['id'],
    'title' => $n['title'],
    'body' => $n['body'],
    'audience' => $n['audience'],
    'targetUser' => $n['target_public_id'] ? ['id' => $n['target_public_id'], 'name' => $n['target_name']] : null,
    'date' => iso_utc($n['created_at']),
    'readCount' => (int)$n['read_count'],
  ], $rows);

  ok(['notifications' => $items]);
}

function admin_notifications_send(): never {
  $a = require_admin('admin');
  $b = body();
  $v = new V($b);
  $title = $v->str('title', 1, 120, null, 'Title is required (max 120 chars)');
  $bodyText = $v->str('body', 1, 1000, null, 'Message is required (max 1000 chars)');
  $audience = $v->oneOf('audience', ['all', 'selected']);
  $v->done();

  $p = db();
  if ($audience === 'all') {
    $p->prepare("INSERT INTO notifications (title, body, audience, user_id, created_by_admin_id) VALUES (?, ?, 'all', NULL, ?)")
      ->execute([$title, $bodyText, (int)$a['id']]);
    admin_log($a, 'notification_send', 'notification', $p->lastInsertId(), ['audience' => 'all']);
    ok(['sent' => 1], 201);
  }

  $pids = is_array($b['userIds'] ?? null) ? array_values(array_unique(array_filter($b['userIds'], 'is_string'))) : [];
  if (!$pids) fail(422, 'validation', 'Select at least one user', ['userIds' => 'Select at least one user']);
  $ph = implode(',', array_fill(0, count($pids), '?'));
  $us = $p->prepare("SELECT id FROM users WHERE public_id IN ($ph) AND deleted_at IS NULL");
  $us->execute($pids);
  $uids = $us->fetchAll(PDO::FETCH_COLUMN);
  if (!$uids) fail(422, 'validation', 'No valid selected users found', ['userIds' => 'No valid selected users found']);

  tx(function (PDO $txp) use ($uids, $title, $bodyText, $a) {
    $ins = $txp->prepare("INSERT INTO notifications (title, body, audience, user_id, created_by_admin_id) VALUES (?, ?, 'user', ?, ?)");
    foreach ($uids as $uid) $ins->execute([$title, $bodyText, (int)$uid, (int)$a['id']]);
  });
  admin_log($a, 'notification_send', 'notification', null, ['audience' => 'selected', 'count' => count($uids)]);
  ok(['sent' => count($uids)], 201);
}

