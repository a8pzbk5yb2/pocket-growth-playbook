<?php
declare(strict_types=1);
final class ApiError extends Exception {
  public function __construct(public int $status, public string $errCode, string $message, public array $fields = []) { parent::__construct($message); }
}
function json_out(int $status, array $payload): never {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function ok($data = null, int $status = 200, ?array $meta = null): never { json_out($status, ['success' => true, 'data' => $data] + ($meta ? ['meta' => $meta] : [])); }
function fail(int $status, string $code, string $message, array $fields = []): never { throw new ApiError($status, $code, $message, $fields); }
function body(): array {
  static $b = null; if ($b !== null) return $b;
  $raw = file_get_contents('php://input') ?: '';
  if (strlen($raw) > 65536) fail(413, 'too_large', 'Request too large');
  $b = $raw === '' ? [] : json_decode($raw, true);
  if (!is_array($b)) fail(400, 'bad_json', 'Invalid JSON body');
  return $b;
}
function client_ip(): ?string { $ip = $_SERVER['REMOTE_ADDR'] ?? ''; return $ip ? (inet_pton($ip) ?: null) : null; }
function iso_utc(?string $dt): ?string { return $dt ? gmdate('c', strtotime($dt . ' UTC')) : null; }
function like_esc(string $q): string { return '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%'; }
function log_error(Throwable $e): void {
  @file_put_contents(dirname(__DIR__) . '/storage/logs/error-' . gmdate('Y-m-d') . '.log', gmdate('c') . ' ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine() . "\n", FILE_APPEND | LOCK_EX);
}
