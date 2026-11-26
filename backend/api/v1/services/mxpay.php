<?php
declare(strict_types=1);
/** MxPay payment collection (/api/web) and payout (/api/payout) client (https://docs.mxpay.one/). */

function mxpay_cfg(): array {
  $m = app_config()['mxpay'] ?? [];
  $key = (string)($m['api_key'] ?? '');
  if ($key === '' || $key === 'CHANGE_ME') {
    fail(500, 'gateway_not_configured', 'MxPay API key is not configured on the server.');
  }
  return $m;
}

function mxpay_post(string $path, array $params): array {
  $cfg = mxpay_cfg();
  $url = rtrim((string)($cfg['base_url'] ?? 'https://mxpay.one'), '/') . $path;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($params),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
  ]);
  $raw = curl_exec($ch);
  $err = curl_error($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  $json = is_string($raw) ? json_decode($raw, true) : null;
  if (!is_array($json)) {
    log_error(new RuntimeException("MxPay $path HTTP $http failed: " . ($err ?: substr((string)$raw, 0, 200))));
    fail(502, 'gateway_error', 'Payment gateway returned an invalid response. Please try again.');
  }
  return $json;
}

function mxpay_urls(): array {
  $cfg = mxpay_cfg();
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $apiBase = rtrim((string)($cfg['public_base_url'] ?? "$scheme://$host/api/v1"), '/');
  $origins = app_config()['allowed_origins'] ?? [];
  $appUrl = rtrim((string)($cfg['app_url'] ?? ($origins[0] ?? "$scheme://$host")), '/');
  $token = (string)($cfg['webhook_token'] ?? '');
  if ($token === '' || $token === 'CHANGE_ME_RANDOM_HEX') {
    fail(500, 'gateway_not_configured', 'MxPay webhook token is not configured on the server.');
  }
  return [$apiBase, $appUrl, $token];
}

function mxpay_create_order(string $orderId, float $amountInr, string $callbackUrl, string $pageUrl): array {
  $cfg = mxpay_cfg();
  $chid = (string)($cfg['chid'] ?? '');
  if ($chid === '' || $chid === 'CHANGE_ME') {
    fail(500, 'gateway_not_configured', 'MxPay channel ID (chid) is not configured on the server.');
  }
  return mxpay_post('/api/web', [
    'api_key' => $cfg['api_key'],
    'chid' => $chid,
    'amount' => $amountInr,
    'order_id' => $orderId,
    'callback' => $callbackUrl,
    'page_url' => $pageUrl,
  ]);
}

function mxpay_create_payout(string $orderId, float $amountInr, array $bank, string $callbackUrl): array {
  $cfg = mxpay_cfg();
  return mxpay_post('/api/payout', [
    'api_key' => $cfg['api_key'],
    'amount' => $amountInr,
    'order_id' => $orderId,
    'bank_name' => $bank['bank_name'],
    'account_number' => $bank['account_number'],
    'account_name' => $bank['account_name'],
    'ifsc' => $bank['ifsc'],
    'callback' => $callbackUrl,
  ]);
}

function mxpay_verify_webhook_token(string $token): void {
  $cfg = app_config()['mxpay'] ?? [];
  $expected = (string)($cfg['webhook_token'] ?? '');
  if ($expected === '' || $expected === 'CHANGE_ME_RANDOM_HEX' || !hash_equals($expected, $token)) {
    fail(403, 'forbidden', 'Invalid webhook token');
  }
  $ips = $cfg['allowed_ips'] ?? [];
  if (is_array($ips) && $ips && !in_array($_SERVER['REMOTE_ADDR'] ?? '', $ips, true)) {
    fail(403, 'forbidden', 'Forbidden webhook IP');
  }
}

