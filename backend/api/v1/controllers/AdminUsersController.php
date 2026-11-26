<?php
declare(strict_types=1);
/** Phase 4: Admin user management (search, filters, pagination, create, edit, status). */

function admin_user_row(array $u): array {
  return [
    'id' => $u['public_id'],
    'name' => $u['full_name'],
    'mobile' => $u['mobile'],
    'status' => $u['status'],
    'joined' => iso_utc($u['created_at']),
    'lastLogin' => iso_utc($u['last_login_at'] ?? null),
    'displayName' => $u['display_name'] ?? $u['full_name'],
    'city' => $u['city'] ?? '',
    'inviteCode' => $u['own_code'] ?? $u['public_id'],
  ];
}

function admin_users_list(): never {
  require_admin('viewer');
  $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
  $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
  $from = is_string($_GET['from'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
  $to = is_string($_GET['to'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';
  $page = max(1, (int)($_GET['page'] ?? 1));
  $perPage = max(1, min(100, (int)($_GET['perPage'] ?? 20)));
  $offset = ($page - 1) * $perPage;

  $where = ['u.deleted_at IS NULL'];
  $params = [];
  if (in_array($status, ['active', 'inactive', 'blocked'], true)) {
    $where[] = 'u.status = ?';
    $params[] = $status;
  }
  if ($q !== '') {
    $like = like_esc($q);
    $where[] = '(u.full_name LIKE ? OR u.mobile LIKE ? OR u.public_id LIKE ?)';
    array_push($params, $like, $like, $like);
  }
  if ($from !== '') { $where[] = 'u.created_at >= ?'; $params[] = "$from 00:00:00"; }
  if ($to !== '') { $where[] = 'u.created_at <= ?'; $params[] = "$to 23:59:59"; }
  $wSql = implode(' AND ', $where);

  $p = db();
  $cs = $p->prepare("SELECT COUNT(*) FROM users u WHERE $wSql");
  $cs->execute($params);
  $total = (int)$cs->fetchColumn();

  $sql = "SELECT u.id, u.public_id, u.full_name, u.mobile, u.status, u.created_at, u.last_login_at, up.display_name, up.city,
    (SELECT ic.code FROM invitation_codes ic WHERE ic.owner_user_id = u.id AND ic.deleted_at IS NULL ORDER BY ic.id ASC LIMIT 1) AS own_code
    FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE $wSql ORDER BY u.id DESC LIMIT $perPage OFFSET $offset";
  $ls = $p->prepare($sql);
  $ls->execute($params);
  $items = array_map('admin_user_row', $ls->fetchAll());

  $counts = ['total' => 0, 'active' => 0, 'inactive' => 0, 'blocked' => 0];
  foreach ($p->query('SELECT status, COUNT(*) AS c FROM users WHERE deleted_at IS NULL GROUP BY status')->fetchAll() as $row) {
    $counts[$row['status']] = (int)$row['c'];
    $counts['total'] += (int)$row['c'];
  }

  ok(['items' => $items, 'total' => $total, 'page' => $page, 'perPage' => $perPage, 'counts' => $counts]);
}

function admin_user_get(string $publicId): never {
  require_admin('viewer');
  $p = db();
  $s = $p->prepare("SELECT u.*, up.display_name, up.city,
    (SELECT ic.code FROM invitation_codes ic WHERE ic.owner_user_id = u.id AND ic.deleted_at IS NULL ORDER BY ic.id ASC LIMIT 1) AS own_code
    FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.public_id = ? AND u.deleted_at IS NULL");
  $s->execute([$publicId]);
  $u = $s->fetch();
  if (!$u) fail(404, 'not_found', 'User not found');

  $by = $p->prepare('SELECT ic.code, ru.full_name AS referrer_name FROM referrals r JOIN invitation_codes ic ON ic.id = r.invitation_code_id LEFT JOIN users ru ON ru.id = r.referrer_user_id WHERE r.referred_user_id = ?');
  $by->execute([(int)$u['id']]);
  $inv = $by->fetch();

  $rc = $p->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ?');
  $rc->execute([(int)$u['id']]);

  ok([
    'user' => admin_user_row($u) + [
      'invitedWith' => $inv ? $inv['code'] : null,
      'referredBy' => $inv ? ($inv['referrer_name'] ?? 'PowerBank') : null,
      'referralCount' => (int)$rc->fetchColumn(),
    ],
  ]);
}

function admin_user_create(): never {
  $a = require_admin('admin');
  $b = body();
  $v = new V($b);
  $name = $v->str('name', 2, 60, RE_NAME, 'Enter full name (letters only)');
  $mobile = $v->str('mobile', 10, 10, RE_MOBILE, 'Enter a valid 10-digit Indian mobile number');
  $pw = $v->optStr('password', 72, null, 'Password must be 6–72 characters');
  if ($pw !== null && mb_strlen($pw) < 6) $v->error('password', 'Password must be at least 6 characters');
  $status = isset($b['status']) ? $v->oneOf('status', ['active', 'inactive', 'blocked']) : 'active';
  $city = $v->optStr('city', 80, null, 'City must be under 80 characters');
  $v->done();

  $exists = db()->prepare("SELECT 1 FROM users WHERE country_code = '+91' AND mobile = ?");
  $exists->execute([$mobile]);
  if ($exists->fetch()) fail(422, 'validation', 'This mobile number is already registered', ['mobile' => 'This mobile number is already registered']);

  $rawPw = $pw ?? bin2hex(random_bytes(8));
  $row = tx(function (PDO $p) use ($name, $mobile, $rawPw, $status, $city) {
    $pid = create_unique_public_id($p);
    $p->prepare("INSERT INTO users (public_id, full_name, country_code, mobile, password_hash, status) VALUES (?, ?, '+91', ?, ?, ?)")
      ->execute([$pid, $name, $mobile, password_hash($rawPw, PASSWORD_DEFAULT), $status]);
    $id = (int)$p->lastInsertId();
    $p->prepare('INSERT INTO user_profiles (user_id, display_name, city) VALUES (?, ?, ?)')->execute([$id, $name, $city]);
    $p->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$id]);
    $p->prepare('INSERT INTO invitation_codes (code, owner_user_id) VALUES (?, ?)')->execute([$pid, $id]);
    $s = $p->prepare("SELECT u.*, up.display_name, up.city, ? AS own_code FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?");
    $s->execute([$pid, $id]);
    return $s->fetch();
  });

  admin_log($a, 'user_create', 'user', $row['public_id'], ['status' => $status]);
  ok(['user' => admin_user_row($row)], 201);
}

function admin_user_update(string $publicId): never {
  $a = require_admin('admin');
  $p = db();
  $s = $p->prepare('SELECT * FROM users WHERE public_id = ? AND deleted_at IS NULL');
  $s->execute([$publicId]);
  $cur = $s->fetch();
  if (!$cur) fail(404, 'not_found', 'User not found');

  $b = body();
  $v = new V($b);
  $name = isset($b['name']) ? $v->str('name', 2, 60, RE_NAME, 'Enter full name (letters only)') : $cur['full_name'];
  $mobile = isset($b['mobile']) ? $v->str('mobile', 10, 10, RE_MOBILE, 'Enter a valid 10-digit Indian mobile number') : $cur['mobile'];
  $status = isset($b['status']) ? $v->oneOf('status', ['active', 'inactive', 'blocked']) : $cur['status'];
  $city = array_key_exists('city', $b) ? $v->optStr('city', 80, null, 'City must be under 80 characters') : null;
  $v->done();

  if ($mobile !== $cur['mobile']) {
    $chk = $p->prepare("SELECT 1 FROM users WHERE country_code = '+91' AND mobile = ? AND id <> ?");
    $chk->execute([$mobile, $cur['id']]);
    if ($chk->fetch()) fail(422, 'validation', 'Mobile already in use', ['mobile' => 'This mobile number is already registered']);
  }

  $updated = tx(function (PDO $txp) use ($cur, $name, $mobile, $status, $b, $city) {
    $uid = (int)$cur['id'];
    $txp->prepare('UPDATE users SET full_name = ?, mobile = ?, status = ? WHERE id = ?')->execute([$name, $mobile, $status, $uid]);
    if (array_key_exists('city', $b)) {
      $txp->prepare('INSERT INTO user_profiles (user_id, display_name, city) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), city = VALUES(city)')
        ->execute([$uid, $name, $city]);
    }
    if ($status !== 'active') {
      $txp->prepare("UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE subject_type = 'user' AND subject_id = ? AND revoked_at IS NULL")->execute([$uid]);
    }
    $r = $txp->prepare("SELECT u.*, up.display_name, up.city,
      (SELECT ic.code FROM invitation_codes ic WHERE ic.owner_user_id = u.id AND ic.deleted_at IS NULL ORDER BY ic.id ASC LIMIT 1) AS own_code
      FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?");
    $r->execute([$uid]);
    return $r->fetch();
  });

  admin_log($a, $status !== $cur['status'] ? 'user_status' : 'user_update', 'user', $publicId, ['status' => $status]);
  ok(['user' => admin_user_row($updated)]);
}

