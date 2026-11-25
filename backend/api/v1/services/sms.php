<?php
declare(strict_types=1);
/** Sends a one-time code. Our server generates, hashes and verifies the code; BlackSMS only delivers it. */
function send_otp_sms(string $mobile10, string $code): void {
  $sms = app_config()['sms'] ?? [];
  if (($sms['provider'] ?? 'log') === 'log') {
    @file_put_contents(dirname(__DIR__) . '/storage/logs/otp-' . gmdate('Y-m-d') . '.log', gmdate('c') . " +91$mobile10 $code\n", FILE_APPEND | LOCK_EX);
    return;
  }
  if ($sms['provider'] !== 'blacksms') throw new RuntimeException('Unknown SMS provider');
  $b = $sms['blacksms'] ?? [];
  $ch = curl_init('https://blacksms.in/sms');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 10,
    CURLOPT_POSTFIELDS => json_encode(['sender_id' => $b['sender_id'] ?? '', 'variables_values' => $code, 'numbers' => $mobile10, 'route' => (int)($b['route'] ?? 1)]),
    CURLOPT_HTTPHEADER => ['Authorization: ' . ($b['api_key'] ?? ''), 'Content-Type: application/json'],
  ]);
  $res = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
  $j = is_string($res) ? json_decode($res, true) : null;
  if (!is_array($j) || (int)($j['status'] ?? 0) !== 1) {
    log_error(new RuntimeException('BlackSMS failed: ' . ($err ?: (is_array($j) ? ($j['message'] ?? '') : 'bad response'))));
    fail(502, 'sms_failed', "We couldn't send the code. Please try again in a minute.");
  }
}
