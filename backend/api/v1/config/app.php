<?php
declare(strict_types=1);
function app_config(): array {
  static $c = null;
  if ($c !== null) return $c;
  $path = getenv('PB_CONFIG') ?: dirname(__DIR__, 4) . '/powerbank_private/config.php';
  if (!is_file($path)) { http_response_code(500); echo '{"success":false,"error":{"code":"config_missing","message":"Server not configured"}}'; exit; }
  return $c = require $path;
}
const ACCESS_TTL = 900;              // 15 minutes
const REFRESH_TTL = 86400;           // 1 day
const REFRESH_TTL_REMEMBER = 2592000;// 30 days
const OTP_TTL = 300; const OTP_MAX_ATTEMPTS = 5; const OTP_RESEND_SECONDS = 60;
