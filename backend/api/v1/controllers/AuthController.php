<?php
declare(strict_types=1);
/** Phase 2: real sign-up with SMS code, login, session refresh/rotation, logout. */
function otp_hash(string $mobile, string $code): string { return hash_hmac('sha256', "$mobile|$code", app_config()['jwt_secret']); }
function user_out(array $u): array {
  return ['id' => $u['public_id'], 'name' => $u['full_name'], 'mobile' => $u['mobile'], 'status' => $u['status'], 'joined' => iso_utc($u['created_at'])];
}
function verify_otp_code(string $mobile, string $purpose, string $code): array {
  if (!preg_match('/^\d{6}$/', $code)) fail(422, 'validation', 'Enter the 6-digit code', ['code' => 'Enter the 6-digit code']);
  $s = db()->prepare('SELECT id, code_hash, attempts FROM otp_verifications WHERE mobile = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1');
  $s->execute([$mobile, $purpose]); $otp = $s->fetch();
  if (!$otp || (int)$otp['attempts'] >= OTP_MAX_ATTEMPTS) fail(422, 'validation', 'Code expired. Request a new one.', ['code' => 'Code expired. Request a new one.']);
  if (!hash_equals($otp['code_hash'], otp_hash($mobile, $code))) {
    db()->prepare('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?')->execute([$otp['id']]);
    fail(422, 'validation', 'Wrong code', ['code' => 'Wrong code. Please check the SMS.']);
  }
  return $otp;
}
function check_otp_cooldown(string $mobile, string $purpose): void {
  $s = db()->prepare('SELECT TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) FROM otp_verifications WHERE mobile = ? AND purpose = ? ORDER BY id DESC LIMIT 1');
  $s->execute([$mobile, $purpose]); $ago = $s->fetchColumn();
  if ($ago !== false && (int)$ago < OTP_RESEND_SECONDS) fail(429, 'otp_wait', 'Please wait ' . (OTP_RESEND_SECONDS - (int)$ago) . ' seconds before requesting a new code.');
}
function issue_session(string $type, int $id, bool $remember, ?string $family = null): void {
  $rt = bin2hex(random_bytes(32)); $ttl = $remember ? REFRESH_TTL_REMEMBER : REFRESH_TTL;
  db()->prepare('INSERT INTO user_sessions (subject_type, subject_id, family_id, refresh_hash, remember, user_agent, ip, expires_at) VALUES (?,?,?,?,?,?,?, UTC_TIMESTAMP() + INTERVAL ? SECOND)')
    ->execute([$type, $id, $family ?? bin2hex(random_bytes(16)), hash('sha256', $rt), (int)$remember, substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255), client_ip(), $ttl]);
  $p = $type === 'admin' ? 'pb_admin_' : 'pb_';
  set_cookie($p . 'at', jwt_sign(['sub' => $id, 'typ' => $type, 'exp' => time() + ACCESS_TTL]), ACCESS_TTL);
  set_cookie($p . 'rt', $rt, $remember ? $ttl : 0);
}
function signup_input(): array {
  $v = new V(body());
  $in = [
    'name' => $v->str('name', 2, 60, RE_NAME, 'Enter your full name (letters only)'),
    'mobile' => $v->str('mobile', 10, 10, RE_MOBILE, 'Enter a valid 10-digit Indian mobile number'),
    'password' => $v->str('password', 6, 72, null, 'Password must be 6–72 characters'),
    'invite' => strtoupper($v->str('invite', 1, 20, '/^[A-Za-z0-9]+$/', 'Invitation code is required')),
  ];
  if (($in['password'] !== (body()['confirm'] ?? null))) $v->error('confirm', 'Passwords do not match');
  if (!$v->bool('agree')) $v->error('agree', 'Please accept the Terms & Conditions and Privacy Policy');
  $v->done();
  $s = db()->prepare("SELECT 1 FROM users WHERE country_code = '+91' AND mobile = ?"); $s->execute([$in['mobile']]);
  if ($s->fetch()) fail(422, 'validation', 'Please fix the highlighted fields', ['mobile' => 'This mobile number is already registered']);
  $s = db()->prepare("SELECT id, owner_user_id FROM invitation_codes WHERE code = ? AND status = 'active' AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP()) AND (max_uses IS NULL OR uses < max_uses)");
  $s->execute([$in['invite']]); $inv = $s->fetch();
  if (!$inv) fail(422, 'validation', 'Please fix the highlighted fields', ['invite' => 'Invalid or expired invitation code']);
  return $in + ['inv' => $inv];
}
function create_unique_public_id(PDO $p): string {
  do { $pid = 'PB' . random_int(100000, 999999); $c = $p->prepare('SELECT 1 FROM users WHERE public_id = ?'); $c->execute([$pid]); } while ($c->fetch());
  return $pid;
}
function auth_register_start(): never {
  rate_limit('otp_ip', ip_key(), 30, 3600);
  $in = signup_input();
  rate_limit('otp_mobile', $in['mobile'], 5, 3600);
  check_otp_cooldown($in['mobile'], 'register');
  $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  db()->prepare("INSERT INTO otp_verifications (mobile, purpose, code_hash, expires_at) VALUES (?, 'register', ?, UTC_TIMESTAMP() + INTERVAL ? SECOND)")->execute([$in['mobile'], otp_hash($in['mobile'], $code), OTP_TTL]);
  send_otp_sms($in['mobile'], $code);
  ok(['resendIn' => OTP_RESEND_SECONDS, 'expiresIn' => OTP_TTL]);
}
function auth_register_verify(): never {
  $in = signup_input();
  $otp = verify_otp_code($in['mobile'], 'register', (string)(body()['code'] ?? ''));
  $user = tx(function (PDO $p) use ($in, $otp) {
    $p->prepare('UPDATE otp_verifications SET verified_at = UTC_TIMESTAMP(), consumed_at = UTC_TIMESTAMP() WHERE id = ? AND consumed_at IS NULL')->execute([$otp['id']]);
    $pid = create_unique_public_id($p);
    $p->prepare("INSERT INTO users (public_id, full_name, country_code, mobile, password_hash, mobile_verified_at) VALUES (?,?, '+91', ?, ?, UTC_TIMESTAMP())")
      ->execute([$pid, $in['name'], $in['mobile'], password_hash($in['password'], PASSWORD_DEFAULT)]);
    $id = (int)$p->lastInsertId();
    $p->prepare('INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)')->execute([$id, $in['name']]);
    $p->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$id]);
    $p->prepare('INSERT INTO referrals (referred_user_id, referrer_user_id, invitation_code_id) VALUES (?,?,?)')->execute([$id, $in['inv']['owner_user_id'], $in['inv']['id']]);
    $p->prepare('UPDATE invitation_codes SET uses = uses + 1 WHERE id = ?')->execute([$in['inv']['id']]);
    $p->prepare("INSERT INTO invitation_codes (code, owner_user_id) VALUES (?, ?)")->execute([$pid, $id]);
    foreach (['terms', 'privacy'] as $pol) $p->prepare("INSERT INTO policy_acceptances (user_id, policy, version, ip) VALUES (?, ?, '1.0', ?)")->execute([$id, $pol, client_ip()]);
    $u = $p->prepare('SELECT * FROM users WHERE id = ?'); $u->execute([$id]); return $u->fetch();
  });
  issue_session('user', (int)$user['id'], true);
  ok(['user' => user_out($user)], 201);
}
function auth_reset_start(): never {
  rate_limit('reset_ip', ip_key(), 30, 3600);
  $v = new V(body());
  $mobile = $v->str('mobile', 10, 10, RE_MOBILE, 'Enter a valid 10-digit Indian mobile number');
  $v->done();
  rate_limit('reset_mobile', $mobile, 5, 3600);
  check_otp_cooldown($mobile, 'reset');
  $s = db()->prepare("SELECT id, status FROM users WHERE country_code = '+91' AND mobile = ? AND deleted_at IS NULL");
  $s->execute([$mobile]); $u = $s->fetch();
  if ($u && $u['status'] !== 'blocked') {
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    db()->prepare("INSERT INTO otp_verifications (mobile, purpose, code_hash, expires_at) VALUES (?, 'reset', ?, UTC_TIMESTAMP() + INTERVAL ? SECOND)")
      ->execute([$mobile, otp_hash($mobile, $code), OTP_TTL]);
    send_otp_sms($mobile, $code);
  }
  ok(['resendIn' => OTP_RESEND_SECONDS, 'expiresIn' => OTP_TTL]);
}
function auth_reset_verify(): never {
  $v = new V(body());
  $mobile = $v->str('mobile', 10, 10, RE_MOBILE, 'Enter a valid 10-digit Indian mobile number');
  $password = $v->str('password', 6, 72, null, 'Password must be 6–72 characters');
  if ($password !== (body()['confirm'] ?? null)) $v->error('confirm', 'Passwords do not match');
  $v->done();
  $otp = verify_otp_code($mobile, 'reset', (string)(body()['code'] ?? ''));
  $s = db()->prepare("SELECT id, status FROM users WHERE country_code = '+91' AND mobile = ? AND deleted_at IS NULL");
  $s->execute([$mobile]); $u = $s->fetch();
  if (!$u) fail(422, 'validation', 'Code expired. Request a new one.', ['code' => 'Code expired. Request a new one.']);
  if ($u['status'] === 'blocked') fail(403, 'blocked', 'This account is blocked. Please contact support.');
  tx(function (PDO $p) use ($otp, $u, $password) {
    $p->prepare('UPDATE otp_verifications SET verified_at = UTC_TIMESTAMP(), consumed_at = UTC_TIMESTAMP() WHERE id = ? AND consumed_at IS NULL')->execute([$otp['id']]);
    $p->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
    $p->prepare("UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE subject_type = 'user' AND subject_id = ? AND revoked_at IS NULL")->execute([$u['id']]);
  });
  ok(['reset' => true]);
}
function auth_login(): never {
  $b = body(); $mobile = is_string($b['mobile'] ?? null) ? $b['mobile'] : ''; $pw = is_string($b['password'] ?? null) ? $b['password'] : '';
  rate_limit('login_ip', ip_key(), 60, 900); rate_limit('login_mobile', $mobile, 8, 900);
  $s = db()->prepare("SELECT * FROM users WHERE country_code = '+91' AND mobile = ? AND deleted_at IS NULL"); $s->execute([$mobile]); $u = $s->fetch();
  if (!$u || !password_verify($pw, $u['password_hash'])) fail(401, 'bad_credentials', 'Incorrect mobile number or password');
  if ($u['status'] === 'blocked') fail(403, 'blocked', 'This account is blocked. Please contact support.');
  db()->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$u['id']]);
  issue_session('user', (int)$u['id'], ($b['remember'] ?? false) === true);
  ok(['user' => user_out($u)]);
}
function auth_refresh(string $type): never {
  $p = $type === 'admin' ? 'pb_admin_' : 'pb_'; $rt = $_COOKIE[$p . 'rt'] ?? '';
  $s = db()->prepare('SELECT * FROM user_sessions WHERE refresh_hash = ? AND subject_type = ?'); $s->execute([hash('sha256', $rt), $type]); $ses = $s->fetch();
  if (!$ses || $ses['revoked_at'] || strtotime($ses['expires_at'] . ' UTC') < time()) { clear_cookie($p . 'at'); clear_cookie($p . 'rt'); fail(401, 'unauthenticated', 'Please log in'); }
  if ($ses['rotated_at']) { // reuse of an old token: end the whole session family
    db()->prepare('UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE family_id = ?')->execute([$ses['family_id']]);
    clear_cookie($p . 'at'); clear_cookie($p . 'rt'); fail(401, 'unauthenticated', 'Please log in');
  }
  db()->prepare('UPDATE user_sessions SET rotated_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$ses['id']]);
  issue_session($type, (int)$ses['subject_id'], (bool)$ses['remember'], $ses['family_id']);
  ok(['refreshed' => true]);
}
function auth_logout(string $type): never {
  $p = $type === 'admin' ? 'pb_admin_' : 'pb_'; $rt = $_COOKIE[$p . 'rt'] ?? '';
  if ($rt !== '') db()->prepare('UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE refresh_hash = ?')->execute([hash('sha256', $rt)]);
  clear_cookie($p . 'at'); clear_cookie($p . 'rt'); ok(['loggedOut' => true]);
}
