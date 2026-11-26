<?php
declare(strict_types=1);
/** MxPay payment collection and payout webhook handlers (CSRF-exempt, token-authenticated). */

function mxpay_webhook_input(): array {
  $raw = file_get_contents('php://input') ?: '';
  if (strlen($raw) > 65536) fail(413, 'too_large', 'Payload too large');
  $decoded = $raw !== '' ? json_decode($raw, true) : null;
  if (is_array($decoded)) return $decoded;
  if (!empty($_POST)) return $_POST;
  parse_str($raw, $parsed);
  return is_array($parsed) ? $parsed : [];
}

function mxpay_is_success(mixed $v): bool {
  return $v === true || $v === 1 || $v === '1' || $v === 'true' || (is_string($v) && in_array(strtolower(trim($v)), ['success', 'completed', 'paid'], true));
}

function webhook_mxpay_deposit(string $token): never {
  mxpay_verify_webhook_token($token);
  $in = mxpay_webhook_input();
  $orderId = is_string($in['order_id'] ?? null) ? trim($in['order_id']) : '';
  if ($orderId === '') fail(422, 'validation', 'order_id is required');

  $statusVal = $in['status'] ?? null;
  $paidPaise = isset($in['amount']) ? in_array(gettype($in['amount']), ['integer', 'double', 'string'], true) ? inr_to_paise($in['amount']) : 0 : 0;
  $platformId = is_string($in['platform_id'] ?? null) ? substr(trim($in['platform_id']), 0, 64) : null;

  $dup = (bool)tx(function (PDO $p) use ($orderId, $statusVal, $paidPaise, $platformId, $in): bool {
    $s = $p->prepare('SELECT * FROM deposits WHERE order_id = ? FOR UPDATE');
    $s->execute([$orderId]);
    $dep = $s->fetch();
    if (!$dep) fail(404, 'not_found', 'Deposit order not found');
    if ($dep['status'] === 'success') return true;

    $rawJson = json_encode($in, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (mxpay_is_success($statusVal) && $paidPaise >= (int)$dep['amount_paise']) {
      $uid = (int)$dep['user_id'];
      $amt = (int)$dep['amount_paise'];
      $p->prepare("UPDATE deposits SET status = 'success', platform_id = ?, raw_callback = ?, paid_at = UTC_TIMESTAMP() WHERE id = ?")
        ->execute([$platformId, $rawJson, (int)$dep['id']]);
      $w = lock_wallet($p, $uid);
      $newTotal = (int)$w['deposit_paise'] + (int)$w['withdrawable_paise'] + $amt;
      $p->prepare('UPDATE wallets SET deposit_paise = deposit_paise + ?, total_deposited_paise = total_deposited_paise + ? WHERE user_id = ?')
        ->execute([$amt, $amt, $uid]);
      record_wallet_tx($p, $uid, 'deposit', 'deposit', 'credit', $amt, $newTotal, $orderId, 'success', 'MxPay deposit confirmed');
      award_first_referral_bonus($p, $uid);
    } elseif ($statusVal !== null && !mxpay_is_success($statusVal)) {
      $p->prepare("UPDATE deposits SET status = 'failed', platform_id = ?, raw_callback = ? WHERE id = ?")
        ->execute([$platformId, $rawJson, (int)$dep['id']]);
    }
    return false;
  });

  ok(['received' => true, 'duplicate' => $dup]);
}

function webhook_mxpay_payout(string $token): never {
  mxpay_verify_webhook_token($token);
  $in = mxpay_webhook_input();
  $orderId = is_string($in['order_id'] ?? null) ? trim($in['order_id']) : '';
  if ($orderId === '') fail(422, 'validation', 'order_id is required');
  $statusVal = $in['status'] ?? null;

  $dup = (bool)tx(function (PDO $p) use ($orderId, $statusVal, $in): bool {
    $s = $p->prepare('SELECT * FROM withdrawals WHERE order_id = ? FOR UPDATE');
    $s->execute([$orderId]);
    $wdr = $s->fetch();
    if (!$wdr) fail(404, 'not_found', 'Withdrawal order not found');
    if (in_array($wdr['status'], ['success', 'rejected', 'failed'], true)) return true;

    $rawJson = json_encode($in, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $uid = (int)$wdr['user_id'];
    $amt = (int)$wdr['amount_paise'];

    if (mxpay_is_success($statusVal)) {
      $p->prepare("UPDATE withdrawals SET status = 'success', raw_callback = ?, completed_at = UTC_TIMESTAMP() WHERE id = ?")
        ->execute([$rawJson, (int)$wdr['id']]);
      lock_wallet($p, $uid);
      $p->prepare('UPDATE wallets SET total_withdrawn_paise = total_withdrawn_paise + ? WHERE user_id = ?')->execute([$amt, $uid]);
      $p->prepare("UPDATE wallet_transactions SET status = 'success' WHERE ref_id = ? AND type = 'withdrawal' AND status = 'pending'")->execute([$orderId]);
    } else {
      $p->prepare("UPDATE withdrawals SET status = 'failed', raw_callback = ?, completed_at = UTC_TIMESTAMP(), gateway_message = ? WHERE id = ?")
        ->execute([$rawJson, 'Payout failed at gateway', (int)$wdr['id']]);
      $w = lock_wallet($p, $uid);
      $newTotal = (int)$w['deposit_paise'] + (int)$w['withdrawable_paise'] + $amt;
      $p->prepare('UPDATE wallets SET withdrawable_paise = withdrawable_paise + ? WHERE user_id = ?')->execute([$amt, $uid]);
      $p->prepare("UPDATE wallet_transactions SET status = 'failed' WHERE ref_id = ? AND type = 'withdrawal' AND status = 'pending'")->execute([$orderId]);
      record_wallet_tx($p, $uid, 'refund', 'withdrawable', 'credit', $amt, $newTotal, $orderId, 'success', 'Withdrawal payout failed — refunded');
    }
    return false;
  });

  ok(['received' => true, 'duplicate' => $dup]);
}
