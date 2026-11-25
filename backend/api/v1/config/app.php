<?php
declare(strict_types=1);
function app_config(): array {
  static $c = null;
  if ($c !== null) return $c;
  // Looks in the usual Hostinger spots so the file is found wherever it was uploaded.
  $here = __DIR__; $home = preg_match('#^(/home/[^/]+)#', $here, $m) ? $m[1] : null;
  $candidates = array_filter([
    getenv('PB_CONFIG') ?: null,
    dirname($here, 4) . '/powerbank_private/config.php',   // next to public_html
    dirname($here, 5) . '/powerbank_private/config.php',   // next to domains/
    $home ? "$home/powerbank_private/config.php" : null,   // home folder
    dirname($here, 4) . '/config.php',
  ]);
  $path = null; foreach ($candidates as $c2) if (is_file($c2)) { $path = $c2; break; }
  if ($path === null) { http_response_code(500); header('Content-Type: application/json'); echo '{"success":false,"error":{"code":"config_missing","message":"Server not configured. Put config.php in a folder named powerbank_private next to public_html."}}'; exit; }
  return $c = require $path;
}
const ACCESS_TTL = 900;              // 15 minutes
const REFRESH_TTL = 86400;           // 1 day
const REFRESH_TTL_REMEMBER = 2592000;// 30 days
const OTP_TTL = 300; const OTP_MAX_ATTEMPTS = 5; const OTP_RESEND_SECONDS = 60;
