<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("CLI only\n"); }

require dirname(__DIR__) . '/api/v1/config/app.php';
require dirname(__DIR__) . '/api/v1/config/database.php';
require dirname(__DIR__) . '/api/v1/helpers/response.php';
require dirname(__DIR__) . '/api/v1/services/ledger.php';

$ids = db()->query("SELECT DISTINCT user_id FROM investments WHERE status = 'active' AND TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()) >= (days_credited + 1) * 86400")->fetchAll(PDO::FETCH_COLUMN);
$total = 0;
foreach ($ids as $uid) {
  $total += accrue_user_earnings((int)$uid);
}
echo 'Accrued ₹' . number_format($total / 100, 2) . ' across ' . count($ids) . " user(s).\n";

