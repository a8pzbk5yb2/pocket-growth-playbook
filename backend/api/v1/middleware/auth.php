<?php
declare(strict_types=1);
/** CSRF: double-submit cookie. Required on every state-changing request. */
function require_csrf(): void {
  $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if (in_array($m, ['GET', 'HEAD', 'OPTIONS'], true)) return;
  $c = $_COOKIE['pb_csrf'] ?? ''; $h = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if ($c === '' || !hash_equals($c, $h)) fail(403, 'csrf', 'Security check failed. Refresh and try again.');
}
/** Only a bare domain like .example.com is valid; anything else (e.g. a full https:// address) is ignored. */
function cookie_domain(): string { $d = (string)(app_config()['cookie_domain'] ?? ''); return preg_match('/^\.?[a-z0-9.-]+\.[a-z]{2,}$/i', $d) ? $d : ''; }
function set_cookie(string $name, string $value, int $ttl, bool $httpOnly = true, string $path = '/'): void {
  setcookie($name, $value, ['expires' => $ttl ? time() + $ttl : 0, 'path' => $path, 'domain' => cookie_domain(), 'secure' => true, 'httponly' => $httpOnly, 'samesite' => 'Lax']);
}
function clear_cookie(string $name, string $path = '/'): void { setcookie($name, '', ['expires' => 1, 'path' => $path, 'domain' => cookie_domain(), 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']); }
/** Returns authenticated user row (active). Role never comes from the client. */
function require_user(): array {
  $c = jwt_verify($_COOKIE['pb_at'] ?? '');
  if (!$c || ($c['typ'] ?? '') !== 'user') fail(401, 'unauthenticated', 'Please log in');
  $s = db()->prepare('SELECT id, public_id, full_name, country_code, mobile, status, created_at FROM users WHERE id = ? AND deleted_at IS NULL');
  $s->execute([(int)$c['sub']]); $u = $s->fetch();
  if (!$u) fail(401, 'unauthenticated', 'Please log in');
  if ($u['status'] === 'blocked') fail(403, 'blocked', 'This account is blocked');
  return $u;
}
