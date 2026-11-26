<?php
declare(strict_types=1);
/** Phase 3: user dashboard, profile, settings, plans, referrals and notifications. */

function plan_out(array $p): array {
  $days = (int)$p['duration_days'];
  return [
    'id' => (string)$p['id'],
    'name' => $p['name'],
    'icon' => $p['icon'],
    'price' => (int)$p['display_price'],
    'daily' => (int)$p['display_daily'],
    'duration' => $days,
    'validity' => "$days days",
    'description' => $p['description'],
    'status' => $p['status'],
    'sortOrder' => (int)$p['sort_order'],
  ];
}

function notification_out(array $n): array {
  return [
    'id' => (string)$n['id'],
    'title' => $n['title'],
    'body' => $n['body'],
    'audience' => $n['audience'],
    'date' => iso_utc($n['created_at']),
    'read' => (bool)($n['is_read'] ?? 0),
  ];
}

function user_invite_code(int $userId, string $fallback): string {
  $s = db()->prepare('SELECT code FROM invitation_codes WHERE owner_user_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 1');
  $s->execute([$userId]);
  $code = $s->fetchColumn();
  return is_string($code) && $code !== '' ? $code : $fallback;
}

function user_plans(): never {
  $rows = db()->query("SELECT * FROM plans WHERE status = 'active' AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC")->fetchAll();
  ok(['plans' => array_map('plan_out', $rows)]);
}

function user_dashboard(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  accrue_user_earnings($uid);
  $p = db();
  ensure_wallet($p, $uid);

  $ws = $p->prepare('SELECT * FROM wallets WHERE user_id = ?');
  $ws->execute([$uid]);
  $wallet = $ws->fetch();

  $ps = $p->prepare('SELECT display_name, city, avatar_url FROM user_profiles WHERE user_id = ?');
  $ps->execute([$uid]);
  $prof = $ps->fetch() ?: [];

  $ss = $p->prepare('SELECT notify_push, notify_sms, language FROM user_settings WHERE user_id = ?');
  $ss->execute([$uid]);
  $sett = $ss->fetch() ?: ['notify_push' => 1, 'notify_sms' => 0, 'language' => 'en'];

  $rc = $p->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ?');
  $rc->execute([$uid]);
  $refCount = (int)$rc->fetchColumn();

  $uc = $p->prepare("SELECT COUNT(*) FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? WHERE n.deleted_at IS NULL AND (n.audience = 'all' OR n.user_id = ?) AND nr.notification_id IS NULL");
  $uc->execute([$uid, $uid]);
  $unread = (int)$uc->fetchColumn();

  $ns = $p->prepare("SELECT n.*, IF(nr.notification_id IS NULL, 0, 1) AS is_read FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? WHERE n.deleted_at IS NULL AND (n.audience = 'all' OR n.user_id = ?) ORDER BY n.created_at DESC, n.id DESC LIMIT 5");
  $ns->execute([$uid, $uid]);
  $recentNotes = array_map('notification_out', $ns->fetchAll());

  $is = $p->prepare('SELECT i.*, pl.name AS plan_name FROM investments i JOIN plans pl ON pl.id = i.plan_id WHERE i.user_id = ? ORDER BY i.id DESC LIMIT 10');
  $is->execute([$uid]);
  $investments = array_map('investment_out', $is->fetchAll());

  $invSum = $p->prepare('SELECT COALESCE(SUM(amount_paise), 0) FROM investments WHERE user_id = ?');
  $invSum->execute([$uid]);
  $totalInvested = paise_to_inr((int)$invSum->fetchColumn());

  $ts = $p->prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 5');
  $ts->execute([$uid]);
  $recentTx = array_map('tx_out', $ts->fetchAll());

  $plans = array_map('plan_out', $p->query("SELECT * FROM plans WHERE status = 'active' AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC")->fetchAll());

  ok([
    'user' => user_out($u),
    'wallet' => wallet_out($wallet),
    'totalInvested' => $totalInvested,
    'investments' => $investments,
    'recentTransactions' => $recentTx,
    'profile' => [
      'displayName' => $prof['display_name'] ?? $u['full_name'],
      'city' => $prof['city'] ?? '',
      'avatarUrl' => $prof['avatar_url'] ?? '',
    ],
    'settings' => [
      'notifyPush' => (bool)$sett['notify_push'],
      'notifySms' => (bool)$sett['notify_sms'],
      'language' => $sett['language'],
    ],
    'inviteCode' => user_invite_code($uid, $u['public_id']),
    'referralCount' => $refCount,
    'unreadNotifications' => $unread,
    'plans' => $plans,
    'recentNotifications' => $recentNotes,
  ]);
}

function user_profile_update(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $b = body();
  $v = new V($b);
  $name = $v->str('name', 2, 60, RE_NAME, 'Enter your full name (letters only)');
  $display = $v->optStr('displayName', 80, null, 'Display name must be under 80 characters');
  $city = $v->optStr('city', 80, null, 'City must be under 80 characters');
  $newPw = $v->optStr('newPassword', 72, null, 'Password must be 6–72 characters');
  if ($newPw !== null && mb_strlen($newPw) < 6) $v->error('newPassword', 'Password must be at least 6 characters');
  $v->done();

  if ($newPw !== null) {
    $cur = is_string($b['currentPassword'] ?? null) ? $b['currentPassword'] : '';
    $hs = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
    $hs->execute([$uid]);
    $hash = (string)$hs->fetchColumn();
    if ($cur === '' || !password_verify($cur, $hash)) fail(422, 'validation', 'Current password is incorrect', ['currentPassword' => 'Current password is incorrect']);
  }

  tx(function (PDO $p) use ($uid, $name, $display, $city, $newPw) {
    if ($newPw !== null) {
      $p->prepare('UPDATE users SET full_name = ?, password_hash = ? WHERE id = ?')->execute([$name, password_hash($newPw, PASSWORD_DEFAULT), $uid]);
    } else {
      $p->prepare('UPDATE users SET full_name = ? WHERE id = ?')->execute([$name, $uid]);
    }
    $p->prepare('INSERT INTO user_profiles (user_id, display_name, city) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), city = VALUES(city)')
      ->execute([$uid, $display ?? $name, $city]);
  });

  $s = db()->prepare('SELECT id, public_id, full_name, country_code, mobile, status, created_at FROM users WHERE id = ?');
  $s->execute([$uid]);
  ok(['user' => user_out($s->fetch()), 'profile' => ['displayName' => $display ?? $name, 'city' => $city ?? '']]);
}

function user_settings_get(): never {
  $u = require_user();
  $s = db()->prepare('SELECT notify_push, notify_sms, language FROM user_settings WHERE user_id = ?');
  $s->execute([(int)$u['id']]);
  $r = $s->fetch() ?: ['notify_push' => 1, 'notify_sms' => 0, 'language' => 'en'];
  ok(['settings' => ['notifyPush' => (bool)$r['notify_push'], 'notifySms' => (bool)$r['notify_sms'], 'language' => $r['language']]]);
}

function user_settings_update(): never {
  $u = require_user();
  $b = body();
  $v = new V($b);
  $lang = isset($b['language']) ? $v->oneOf('language', ['en', 'hi']) : 'en';
  $v->done();
  $push = ($b['notifyPush'] ?? true) ? 1 : 0;
  $sms = ($b['notifySms'] ?? false) ? 1 : 0;
  db()->prepare('INSERT INTO user_settings (user_id, notify_push, notify_sms, language) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE notify_push = VALUES(notify_push), notify_sms = VALUES(notify_sms), language = VALUES(language)')
    ->execute([(int)$u['id'], $push, $sms, $lang]);
  ok(['settings' => ['notifyPush' => (bool)$push, 'notifySms' => (bool)$sms, 'language' => $lang]]);
}

function user_referrals(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $p = db();
  $inviteCode = user_invite_code($uid, $u['public_id']);

  $by = $p->prepare('SELECT ic.code, ru.full_name AS referrer_name FROM referrals r JOIN invitation_codes ic ON ic.id = r.invitation_code_id LEFT JOIN users ru ON ru.id = r.referrer_user_id WHERE r.referred_user_id = ?');
  $by->execute([$uid]);
  $invRow = $by->fetch();

  $rows = $p->prepare('SELECT u.public_id, u.full_name, u.status, r.created_at, r.reward_paise FROM referrals r JOIN users u ON u.id = r.referred_user_id WHERE r.referrer_user_id = ? AND u.deleted_at IS NULL ORDER BY r.created_at DESC, r.id DESC');
  $rows->execute([$uid]);
  $raw = $rows->fetchAll();
  $bonusPaise = 0;
  $list = array_map(function ($r) use (&$bonusPaise) {
    $bonusPaise += (int)$r['reward_paise'];
    return [
      'id' => $r['public_id'],
      'name' => $r['full_name'],
      'status' => $r['status'],
      'reward' => paise_to_inr((int)$r['reward_paise']),
      'joined' => iso_utc($r['created_at']),
    ];
  }, $raw);

  ok([
    'inviteCode' => $inviteCode,
    'invitedBy' => $invRow ? ['code' => $invRow['code'], 'name' => $invRow['referrer_name'] ?? 'PowerBank'] : null,
    'bonusEarned' => paise_to_inr($bonusPaise),
    'referrals' => $list,
  ]);
}

function user_notifications(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  $s = db()->prepare("SELECT n.*, IF(nr.notification_id IS NULL, 0, 1) AS is_read FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? WHERE n.deleted_at IS NULL AND (n.audience = 'all' OR n.user_id = ?) ORDER BY n.created_at DESC, n.id DESC LIMIT 100");
  $s->execute([$uid, $uid]);
  ok(['notifications' => array_map('notification_out', $s->fetchAll())]);
}

function user_notification_read(string $id): never {
  $u = require_user();
  $uid = (int)$u['id'];
  if (!ctype_digit($id)) fail(404, 'not_found', 'Notification not found');
  $nid = (int)$id;
  $s = db()->prepare("SELECT id FROM notifications WHERE id = ? AND deleted_at IS NULL AND (audience = 'all' OR user_id = ?)");
  $s->execute([$nid, $uid]);
  if (!$s->fetch()) fail(404, 'not_found', 'Notification not found');
  db()->prepare('INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)')->execute([$nid, $uid]);
  ok(['read' => true]);
}

function user_notifications_read_all(): never {
  $u = require_user();
  $uid = (int)$u['id'];
  db()->prepare("INSERT IGNORE INTO notification_reads (notification_id, user_id) SELECT n.id, ? FROM notifications n WHERE n.deleted_at IS NULL AND (n.audience = 'all' OR n.user_id = ?)")->execute([$uid, $uid]);
  ok(['readAll' => true]);
}

