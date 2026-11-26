<?php
declare(strict_types=1);
/** Atomic wallet, ledger, daily earnings accrual, and referral bonus helpers. */

const REFERRAL_BONUS_PAISE = 5000; // ₹50.00

function paise_to_inr(int $paise): float {
  return round($paise / 100, 2);
}

function inr_to_paise(int|float|string $inr): int {
  return (int)round(((float)$inr) * 100);
}

function make_ref(string $prefix): string {
  return $prefix . gmdate('ymdHis') . strtoupper(bin2hex(random_bytes(3)));
}

function ensure_wallet(PDO $p, int $userId): void {
  $p->prepare('INSERT IGNORE INTO wallets (user_id) VALUES (?)')->execute([$userId]);
}

function lock_wallet(PDO $p, int $userId): array {
  ensure_wallet($p, $userId);
  $s = $p->prepare('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE');
  $s->execute([$userId]);
  return $s->fetch();
}

function wallet_out(array $w): array {
  $dep = (int)$w['deposit_paise'];
  $wdr = (int)$w['withdrawable_paise'];
  return [
    'depositBalance' => paise_to_inr($dep),
    'withdrawableBalance' => paise_to_inr($wdr),
    'availableBalance' => paise_to_inr($dep + $wdr),
    'totalDeposited' => paise_to_inr((int)$w['total_deposited_paise']),
    'totalEarned' => paise_to_inr((int)$w['total_earned_paise']),
    'totalWithdrawn' => paise_to_inr((int)$w['total_withdrawn_paise']),
  ];
}

function record_wallet_tx(
  PDO $p,
  int $userId,
  string $type,
  string $bucket,
  string $dir,
  int $amountPaise,
  int $balAfterPaise,
  ?string $refId,
  string $status = 'success',
  string $note = ''
): string {
  $txRef = make_ref('TXN');
  $p->prepare('INSERT INTO wallet_transactions (tx_ref, user_id, type, bucket, direction, amount_paise, balance_after_paise, ref_id, status, note) VALUES (?,?,?,?,?,?,?,?,?,?)')
    ->execute([$txRef, $userId, $type, $bucket, $dir, $amountPaise, $balAfterPaise, $refId, $status, substr($note, 0, 255)]);
  return $txRef;
}

/** Credits ₹50 to referrer once on referred user's first confirmed deposit or investment. */
function award_first_referral_bonus(PDO $p, int $userId): void {
  $rs = $p->prepare('SELECT id, referrer_user_id, reward_credited_at FROM referrals WHERE referred_user_id = ? FOR UPDATE');
  $rs->execute([$userId]);
  $ref = $rs->fetch();
  if (!$ref || $ref['referrer_user_id'] === null || $ref['reward_credited_at'] !== null) return;

  $referrerId = (int)$ref['referrer_user_id'];
  $us = $p->prepare("SELECT id FROM users WHERE id = ? AND status = 'active' AND deleted_at IS NULL");
  $us->execute([$referrerId]);
  if (!$us->fetch()) return;

  $w = lock_wallet($p, $referrerId);
  $newTotal = (int)$w['deposit_paise'] + (int)$w['withdrawable_paise'] + REFERRAL_BONUS_PAISE;
  $p->prepare('UPDATE wallets SET withdrawable_paise = withdrawable_paise + ?, total_earned_paise = total_earned_paise + ? WHERE user_id = ?')
    ->execute([REFERRAL_BONUS_PAISE, REFERRAL_BONUS_PAISE, $referrerId]);
  $p->prepare('UPDATE referrals SET reward_paise = ?, reward_credited_at = UTC_TIMESTAMP() WHERE id = ?')
    ->execute([REFERRAL_BONUS_PAISE, (int)$ref['id']]);
  record_wallet_tx($p, $referrerId, 'referral', 'withdrawable', 'credit', REFERRAL_BONUS_PAISE, $newTotal, 'REF-' . $userId, 'success', 'Referral bonus for member first deposit/investment');
}

/** Idempotently credits any due daily plan returns for a user. Returns credited paise. */
function accrue_user_earnings(int $userId): int {
  $p = db();
  $chk = $p->prepare("SELECT 1 FROM investments WHERE user_id = ? AND status = 'active' AND TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()) >= (days_credited + 1) * 86400 LIMIT 1");
  $chk->execute([$userId]);
  if (!$chk->fetch()) return 0;

  return tx(function (PDO $txp) use ($userId) {
    $is = $txp->prepare("SELECT * FROM investments WHERE user_id = ? AND status = 'active' ORDER BY id ASC FOR UPDATE");
    $is->execute([$userId]);
    $invs = $is->fetchAll();
    if (!$invs) return 0;

    $nowTs = (int)$txp->query('SELECT UNIX_TIMESTAMP(UTC_TIMESTAMP())')->fetchColumn();
    $w = lock_wallet($txp, $userId);
    $dep = (int)$w['deposit_paise'];
    $wdr = (int)$w['withdrawable_paise'];
    $credited = 0;

    foreach ($invs as $inv) {
      $startTs = strtotime($inv['started_at'] . ' UTC');
      $elapsedDays = (int)floor(max(0, $nowTs - $startTs) / 86400);
      $targetDays = min((int)$inv['duration_days'], $elapsedDays);
      $dueDays = $targetDays - (int)$inv['days_credited'];
      if ($dueDays <= 0) continue;

      $amt = $dueDays * (int)$inv['daily_paise'];
      $wdr += $amt;
      $credited += $amt;
      $nextStatus = $targetDays >= (int)$inv['duration_days'] ? 'completed' : 'active';
      $txp->prepare('UPDATE investments SET days_credited = ?, last_credited_at = UTC_TIMESTAMP(), status = ? WHERE id = ?')
        ->execute([$targetDays, $nextStatus, (int)$inv['id']]);
      if ($amt > 0) {
        record_wallet_tx($txp, $userId, 'earning', 'withdrawable', 'credit', $amt, $dep + $wdr, $inv['public_id'], 'success', "Daily plan return ($dueDays day(s))");
      }
    }

    if ($credited > 0) {
      $txp->prepare('UPDATE wallets SET withdrawable_paise = withdrawable_paise + ?, total_earned_paise = total_earned_paise + ? WHERE user_id = ?')
        ->execute([$credited, $credited, $userId]);
    }
    return $credited;
  });
}

