<?php
declare(strict_types=1);
/** Fixed-window limiter stored in MySQL. */
function rate_limit(string $name, string $key, int $max, int $windowSec): void {
  $bucket = hash('sha256', "$name|$key");
  $p = db();
  $p->prepare("INSERT INTO rate_limits (bucket, hits, window_start) VALUES (?, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE hits = IF(window_start < UTC_TIMESTAMP() - INTERVAL ? SECOND, 1, hits + 1),
    window_start = IF(window_start < UTC_TIMESTAMP() - INTERVAL ? SECOND, UTC_TIMESTAMP(), window_start)")->execute([$bucket, $windowSec, $windowSec]);
  $s = $p->prepare('SELECT hits FROM rate_limits WHERE bucket = ?'); $s->execute([$bucket]);
  if ((int)$s->fetchColumn() > $max) { header("Retry-After: $windowSec"); fail(429, 'rate_limited', 'Too many attempts. Please try again later.'); }
}
function ip_key(): string { return $_SERVER['REMOTE_ADDR'] ?? 'unknown'; }
