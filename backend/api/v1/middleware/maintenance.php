<?php
declare(strict_types=1);

/** Operational endpoints remain available; their own auth/CSRF checks still apply. */
function maintenance_exempt(string $path): bool {
  return $path === '/admin' || str_starts_with($path, '/admin/')
    || in_array($path, ['/health', '/status', '/auth/csrf', '/auth/logout'], true)
    || (bool)preg_match('#^/webhooks/mxpay/(deposit|payout)/[A-Za-z0-9_-]+$#', $path);
}

function maintenance_enabled(): bool {
  $s = db()->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?');
  $s->execute(['maintenance_mode']);
  return $s->fetchColumn() === '1';
}

function require_not_maintenance(string $path): void {
  if (!maintenance_exempt($path) && maintenance_enabled()) {
    header('Retry-After: 60');
    header('Cache-Control: no-store');
    fail(503, 'maintenance', 'PowerBank is temporarily under maintenance. Please try again later.');
  }
}