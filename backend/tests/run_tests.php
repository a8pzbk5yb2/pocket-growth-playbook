<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("CLI only\n"); }

/**
 * Integration & security test suite for PowerBank PHP + MySQL API.
 * Usage: php backend/tests/run_tests.php <base_url> <otp_log_dir>
 * Example:
 *   PB_CONFIG=... php -S 127.0.0.1:8787 -t backend/api/v1
 *   php backend/tests/run_tests.php http://127.0.0.1:8787/api/v1 backend/api/v1/storage/logs
 */
$base = rtrim($argv[1] ?? 'http://127.0.0.1:8787/api/v1', '/');
$logDir = $argv[2] ?? dirname(__DIR__) . '/api/v1/storage/logs';

final class Client {
  public array $cookies = [];
  public string $csrf = '';

  public function req(string $method, string $path, ?array $body = null, bool $sendCsrf = true): array {
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Accept: application/json'];
    if ($body !== null) $headers[] = 'Content-Type: application/json';
    if ($sendCsrf && $method !== 'GET' && $this->csrf !== '') $headers[] = 'X-CSRF-Token: ' . $this->csrf;
    if ($this->cookies) {
      $pairs = [];
      foreach ($this->cookies as $k => $v) $pairs[] = "$k=$v";
      $headers[] = 'Cookie: ' . implode('; ', $pairs);
    }
    $resHeaders = [];
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CUSTOMREQUEST => $method,
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_TIMEOUT => 10,
      CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$resHeaders) {
        $resHeaders[] = $line;
        if (stripos($line, 'Set-Cookie:') === 0) {
          $cookiePart = trim(substr($line, 11));
          $nv = explode(';', $cookiePart)[0] ?? '';
          if (str_contains($nv, '=')) {
            [$k, $v] = explode('=', $nv, 2);
            $k = trim($k); $v = trim($v);
            if ($v === '' || str_contains(strtolower($cookiePart), 'expires=thu, 01 jan 1970')) unset($this->cookies[$k]);
            else $this->cookies[$k] = $v;
          }
        }
        return strlen($line);
      },
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if (!is_string($raw)) throw new RuntimeException("HTTP error $method $path: $err");
    $json = json_decode($raw, true);
    return ['status' => $status, 'json' => $json, 'raw' => $raw, 'headers' => $resHeaders];
  }

  public function fetchCsrf(): void {
    $r = $this->req('GET', '/auth/csrf');
    assert_ok($r['status'] === 200 && ($r['json']['success'] ?? false), 'fetchCsrf failed: ' . $r['raw']);
    $this->csrf = $r['json']['data']['csrfToken'];
  }
}

$passed = 0;
function assert_ok(bool $cond, string $msg): void {
  global $passed;
  if (!$cond) { fwrite(STDERR, "FAIL: $msg\n"); exit(1); }
  $passed++;
}

function read_latest_otp(string $logDir, string $mobile): string {
  $file = $logDir . '/otp-' . gmdate('Y-m-d') . '.log';
  assert_ok(is_file($file), "OTP log missing at $file");
  $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
  for ($i = count($lines) - 1; $i >= 0; $i--) {
    if (preg_match('/\+91' . preg_quote($mobile, '/') . '\s+(\d{6})/', $lines[$i], $m)) return $m[1];
  }
  throw new RuntimeException("No OTP found for $mobile");
}

// 1. Health check confirms DB connected
$c = new Client();
$h = $c->req('GET', '/health');
assert_ok($h['status'] === 200 && ($h['json']['data']['db'] ?? '') === 'connected', 'health DB check: ' . $h['raw']);

// 2. CSRF enforcement
$noCsrf = $c->req('POST', '/auth/login', ['mobile' => '9876500001', 'password' => 'secret1'], false);
assert_ok($noCsrf['status'] === 403 && ($noCsrf['json']['error']['code'] ?? '') === 'csrf', 'CSRF guard');

$c->fetchCsrf();

// 3. Invalid invite rejected
$badInv = $c->req('POST', '/auth/register/start', [
  'name' => 'Asha Rao', 'mobile' => '9876500001', 'password' => 'secret1', 'confirm' => 'secret1', 'invite' => 'NOPE', 'agree' => true,
]);
assert_ok($badInv['status'] === 422 && isset($badInv['json']['error']['fields']['invite']), 'Reject invalid invite');

// 4. Register user 1 via OTP + verify wrong code attempt counting
$start1 = $c->req('POST', '/auth/register/start', [
  'name' => 'Asha Rao', 'mobile' => '9876500001', 'password' => 'secret1', 'confirm' => 'secret1', 'invite' => 'POWER100', 'agree' => true,
]);
assert_ok($start1['status'] === 200, 'register/start 1: ' . $start1['raw']);

$wrong = $c->req('POST', '/auth/register/verify', [
  'name' => 'Asha Rao', 'mobile' => '9876500001', 'password' => 'secret1', 'confirm' => 'secret1', 'invite' => 'POWER100', 'agree' => true, 'code' => '000000',
]);
assert_ok($wrong['status'] === 422, 'Wrong OTP rejected');

$otp1 = read_latest_otp($logDir, '9876500001');
$ver1 = $c->req('POST', '/auth/register/verify', [
  'name' => 'Asha Rao', 'mobile' => '9876500001', 'password' => 'secret1', 'confirm' => 'secret1', 'invite' => 'POWER100', 'agree' => true, 'code' => $otp1,
]);
assert_ok($ver1['status'] === 201 && !empty($c->cookies['pb_at']) && !empty($c->cookies['pb_rt']), 'register/verify 1: ' . $ver1['raw']);
$u1Id = $ver1['json']['data']['user']['id'];

// 5. Duplicate mobile rejected
$dup = $c->req('POST', '/auth/register/start', [
  'name' => 'Asha Two', 'mobile' => '9876500001', 'password' => 'secret1', 'confirm' => 'secret1', 'invite' => 'POWER100', 'agree' => true,
]);
assert_ok($dup['status'] === 422 && isset($dup['json']['error']['fields']['mobile']), 'Duplicate mobile rejected');

// 6. User dashboard, plans, profile, settings
$dash = $c->req('GET', '/me/dashboard');
assert_ok($dash['status'] === 200 && count($dash['json']['data']['plans'] ?? []) >= 4, 'User dashboard + seeded plans: ' . $dash['raw']);
$u1Invite = $dash['json']['data']['inviteCode'];

$profUp = $c->req('PUT', '/me/profile', ['name' => 'Asha Patel', 'displayName' => 'Asha P', 'city' => 'Pune']);
assert_ok($profUp['status'] === 200 && $profUp['json']['data']['user']['name'] === 'Asha Patel', 'Profile update');

$setUp = $c->req('PUT', '/me/settings', ['notifyPush' => false, 'notifySms' => true, 'language' => 'hi']);
assert_ok($setUp['status'] === 200 && $setUp['json']['data']['settings']['language'] === 'hi', 'Settings update');

// 7. Register user 2 with user 1 invite code -> user 1 sees referral
$c2 = new Client();
$c2->fetchCsrf();
$s2 = $c2->req('POST', '/auth/register/start', [
  'name' => 'Ravi Kumar', 'mobile' => '9876500002', 'password' => 'secret2', 'confirm' => 'secret2', 'invite' => $u1Invite, 'agree' => true,
]);
assert_ok($s2['status'] === 200, 'register/start 2');
$otp2 = read_latest_otp($logDir, '9876500002');
$v2 = $c2->req('POST', '/auth/register/verify', [
  'name' => 'Ravi Kumar', 'mobile' => '9876500002', 'password' => 'secret2', 'confirm' => 'secret2', 'invite' => $u1Invite, 'agree' => true, 'code' => $otp2,
]);
assert_ok($v2['status'] === 201, 'register/verify 2');

$refs1 = $c->req('GET', '/me/referrals');
assert_ok($refs1['status'] === 200 && count($refs1['json']['data']['referrals']) === 1, 'User 1 referral recorded');

// 8. Refresh token rotation + reuse detection
$oldRt = $c->cookies['pb_rt'];
$refOk = $c->req('POST', '/auth/refresh', []);
assert_ok($refOk['status'] === 200 && $c->cookies['pb_rt'] !== $oldRt, 'Refresh rotates token');
$cReuse = new Client();
$cReuse->cookies = $c->cookies;
$cReuse->cookies['pb_rt'] = $oldRt;
$cReuse->csrf = $c->csrf;
$refReuse = $cReuse->req('POST', '/auth/refresh', []);
assert_ok($refReuse['status'] === 401, 'Refresh token reuse rejected and family revoked');

// 9. Password reset by SMS
$rs = $c2->req('POST', '/auth/reset/start', ['mobile' => '9876500002']);
assert_ok($rs['status'] === 200, 'reset/start');
$rOtp = read_latest_otp($logDir, '9876500002');
$rv = $c2->req('POST', '/auth/reset/verify', ['mobile' => '9876500002', 'code' => $rOtp, 'password' => 'newpass1', 'confirm' => 'newpass1']);
assert_ok($rv['status'] === 200, 'reset/verify: ' . $rv['raw']);
$loginNew = $c2->req('POST', '/auth/login', ['mobile' => '9876500002', 'password' => 'newpass1', 'remember' => false]);
assert_ok($loginNew['status'] === 200, 'Login with reset password');

// 10. User cookie cannot access admin endpoints
$unauthAdmin = $c->req('GET', '/admin/users');
assert_ok($unauthAdmin['status'] === 401, 'User blocked from admin API');

// 11. Admin viewer vs super_admin RBAC, SQLi safety, CRUD, notifications, reports, logs
$av = new Client();
$av->fetchCsrf();
$avLogin = $av->req('POST', '/admin/auth/login', ['username' => 'viewer1', 'password' => 'ViewerPass123!', 'remember' => false]);
assert_ok($avLogin['status'] === 200 && $avLogin['json']['data']['admin']['role'] === 'viewer', 'Viewer login: ' . $avLogin['raw']);
$avRead = $av->req('GET', '/admin/users?q=' . urlencode("' OR 1=1 --"));
assert_ok($avRead['status'] === 200 && count($avRead['json']['data']['items']) === 0, 'SQLi search safe');
$avWrite = $av->req('POST', '/admin/users', ['name' => 'Blocked', 'mobile' => '9876500099']);
assert_ok($avWrite['status'] === 403, 'Viewer forbidden from admin write');

$adm = new Client();
$adm->fetchCsrf();
$admLogin = $adm->req('POST', '/admin/auth/login', ['username' => 'super1', 'password' => 'AdminPass123!', 'remember' => true]);
assert_ok($admLogin['status'] === 200 && $admLogin['json']['data']['admin']['role'] === 'super_admin', 'Super admin login');

$blockU1 = $adm->req('PUT', "/admin/users/$u1Id", ['status' => 'blocked']);
assert_ok($blockU1['status'] === 200 && $blockU1['json']['data']['user']['status'] === 'blocked', 'Admin blocked user');
$u1AfterBlock = $c2->req('GET', '/me/dashboard'); // c2 is user 2 (active)
assert_ok($u1AfterBlock['status'] === 200, 'Active user 2 still works');

$pCreate = $adm->req('POST', '/admin/plans', ['name' => 'Platinum', 'icon' => 'gem', 'price' => 5000, 'daily' => 600, 'duration' => 90, 'description' => 'Sample', 'status' => 'active']);
assert_ok($pCreate['status'] === 201, 'Admin created plan');
$pid = $pCreate['json']['data']['plan']['id'];
assert_ok($adm->req('PUT', "/admin/plans/$pid", ['status' => 'inactive'])['status'] === 200, 'Admin toggled plan');
assert_ok($adm->req('DELETE', "/admin/plans/$pid")['status'] === 200, 'Admin deleted plan');

$invCreate = $adm->req('POST', '/admin/invitation-codes', ['code' => 'VIP2026', 'maxUses' => 10]);
assert_ok($invCreate['status'] === 201, 'Admin created invite code');
$invId = $invCreate['json']['data']['id'];
assert_ok($adm->req('PUT', "/admin/invitation-codes/$invId", ['status' => 'disabled'])['status'] === 200, 'Admin disabled invite code');

$nSend = $adm->req('POST', '/admin/notifications', ['title' => 'Hello', 'body' => 'Welcome live', 'audience' => 'all']);
assert_ok($nSend['status'] === 201, 'Admin sent notification');
$u2Notes = $c2->req('GET', '/me/notifications');
assert_ok($u2Notes['status'] === 200 && count($u2Notes['json']['data']['notifications']) >= 1, 'User sees notification');
$nid = $u2Notes['json']['data']['notifications'][0]['id'];
assert_ok($c2->req('POST', "/me/notifications/$nid/read", [])['status'] === 200, 'User marked notification read');

$ov = $adm->req('GET', '/admin/overview');
assert_ok($ov['status'] === 200 && $ov['json']['data']['users']['total'] === 2, 'Admin overview user count');
$rep = $adm->req('GET', '/admin/reports?kind=Users');
assert_ok($rep['status'] === 200 && count($rep['json']['data']['records']) === 2, 'Admin Users report');
$logs = $adm->req('GET', '/admin/activity-logs');
assert_ok($logs['status'] === 200 && count($logs['json']['data']['items']) >= 5, 'Admin activity logs recorded');
$settPut = $adm->req('PUT', '/admin/settings', ['site_name' => 'PowerBank Live', 'registration_open' => true]);
assert_ok($settPut['status'] === 200 && ($settPut['json']['data']['settings']['site_name'] ?? '') === 'PowerBank Live', 'Admin settings updated');

echo "ALL $passed PHP + MYSQL ASSERTIONS PASSED\n";

