<?php
declare(strict_types=1);
function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string|false { return base64_decode(strtr($s, '-_', '+/'), true); }
function jwt_sign(array $claims): string {
  $h = b64u('{"alg":"HS256","typ":"JWT"}'); $p = b64u(json_encode($claims));
  return "$h.$p." . b64u(hash_hmac('sha256', "$h.$p", app_config()['jwt_secret'], true));
}
function jwt_verify(string $t): ?array {
  $parts = explode('.', $t); if (count($parts) !== 3) return null;
  [$h, $p, $s] = $parts;
  $sig = b64u_dec($s); if ($sig === false) return null;
  if (!hash_equals(hash_hmac('sha256', "$h.$p", app_config()['jwt_secret'], true), $sig)) return null;
  $c = json_decode((string)b64u_dec($p), true);
  if (!is_array($c) || ($c['exp'] ?? 0) < time()) return null;
  return $c;
}
