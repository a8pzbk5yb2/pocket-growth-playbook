<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/api/v1/middleware/maintenance.php';

class TestSettingsStatement {
  public function execute(array $args): void {}
  public function fetchColumn(): string { return $GLOBALS['mode']; }
}
class TestSettingsDb {
  public function prepare(string $sql): TestSettingsStatement { return new TestSettingsStatement(); }
}
function db(): TestSettingsDb { return new TestSettingsDb(); }
function fail(int $status, string $code, string $message): never { throw new RuntimeException($code, $status); }
function check(bool $condition, string $rule): void {
  if (!$condition) throw new RuntimeException($rule);
}
$GLOBALS['mode'] = '1';
foreach (['/auth/login', '/auth/register/start', '/me/dashboard', '/me/deposits', '/me/investments', '/plans'] as $path) {
  try { require_not_maintenance($path); throw new LogicException("Not blocked: $path"); }
  catch (RuntimeException $e) { check($e->getCode() === 503 && $e->getMessage() === 'maintenance', "Block $path"); }
}
foreach (['/admin/settings', '/admin/auth/login', '/status', '/auth/csrf', '/auth/logout', '/health', '/webhooks/mxpay/deposit/validtoken', '/webhooks/mxpay/payout/validtoken'] as $path) {
  require_not_maintenance($path);
}
check(!maintenance_exempt('/administrator'), 'No admin prefix bypass');
check(!maintenance_exempt('/webhooks/mxpay/deposit/token/extra'), 'No webhook prefix bypass');
$GLOBALS['mode'] = '0';
require_not_maintenance('/me/deposits');
check(!maintenance_enabled(), 'Off restores user access');
echo "Maintenance rules passed\n";