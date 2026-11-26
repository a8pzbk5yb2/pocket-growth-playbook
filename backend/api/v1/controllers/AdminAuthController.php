<?php
declare(strict_types=1);
/** Phase 4: Admin authentication (separate admin_users table + role check + activity log). */

function admin_out(array $a): array {
  return [
    'id' => (int)$a['id'],
    'username' => $a['username'],
    'name' => $a['full_name'],
    'role' => $a['role'],
  ];
}

function admin_login(): never {
  $b = body();
  $username = is_string($b['username'] ?? null) ? strtolower(trim($b['username'])) : '';
  $pw = is_string($b['password'] ?? null) ? $b['password'] : '';
  rate_limit('admin_ip', ip_key(), 40, 900);
  rate_limit('admin_user', $username, 8, 900);

  $s = db()->prepare('SELECT * FROM admin_users WHERE username = ? AND deleted_at IS NULL');
  $s->execute([$username]);
  $a = $s->fetch();
  if (!$a || !password_verify($pw, $a['password_hash'])) fail(401, 'bad_credentials', 'Incorrect username or password');
  if ($a['status'] !== 'active') fail(403, 'disabled', 'This admin account is disabled.');

  db()->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$a['id']]);
  issue_session('admin', (int)$a['id'], ($b['remember'] ?? false) === true);
  admin_log($a, 'admin_login');
  ok(['admin' => admin_out($a)]);
}

function admin_change_password(): never {
  $a = require_admin('viewer');
  $b = body();
  $v = new V($b);
  $cur = $v->str('currentPassword', 1, 72, null, 'Current password is required');
  $new = $v->str('newPassword', 8, 72, null, 'New password must be 8–72 characters');
  if ($new !== ($b['confirm'] ?? null)) $v->error('confirm', 'Passwords do not match');
  $v->done();

  $s = db()->prepare('SELECT password_hash FROM admin_users WHERE id = ?');
  $s->execute([(int)$a['id']]);
  if (!password_verify($cur, (string)$s->fetchColumn())) fail(422, 'validation', 'Current password is incorrect', ['currentPassword' => 'Current password is incorrect']);

  tx(function (PDO $p) use ($a, $new) {
    $p->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), (int)$a['id']]);
    $p->prepare("UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE subject_type = 'admin' AND subject_id = ? AND revoked_at IS NULL")->execute([(int)$a['id']]);
  });
  issue_session('admin', (int)$a['id'], true);
  admin_log($a, 'admin_password_change');
  ok(['changed' => true]);
}

