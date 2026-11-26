<?php
declare(strict_types=1);
final class V {
  private array $errors = [];
  public function __construct(private array $in) {}
  public function str(string $k, int $min, int $max, ?string $re = null, string $msg = 'Invalid value'): string {
    $v = $this->in[$k] ?? ''; $v = is_string($v) ? trim($v) : '';
    $len = mb_strlen($v);
    if ($len < $min || $len > $max || ($re && !preg_match($re, $v))) $this->errors[$k] = $msg;
    return $v;
  }
  public function optStr(string $k, int $max, ?string $re = null, string $msg = 'Invalid value'): ?string {
    $raw = $this->in[$k] ?? null;
    if ($raw === null || (is_string($raw) && trim($raw) === '')) return null;
    return $this->str($k, 1, $max, $re, $msg);
  }
  public function bool(string $k): bool { return ($this->in[$k] ?? false) === true; }
  public function int(string $k, int $min, int $max): int {
    $v = $this->in[$k] ?? null;
    if (!is_int($v) || $v < $min || $v > $max) { $this->errors[$k] = "Must be a number from $min to $max"; return $min; }
    return $v;
  }
  public function optInt(string $k, int $min, int $max): ?int {
    $v = $this->in[$k] ?? null;
    if ($v === null || $v === '') return null;
    return $this->int($k, $min, $max);
  }
  public function oneOf(string $k, array $opts): string { $v = $this->in[$k] ?? ''; if (!in_array($v, $opts, true)) $this->errors[$k] = 'Invalid option'; return (string)$v; }
  public function error(string $k, string $msg): void { $this->errors[$k] = $msg; }
  public function done(): void { if ($this->errors) fail(422, 'validation', 'Please fix the highlighted fields', $this->errors); }
}
const RE_MOBILE = '/^[6-9]\d{9}$/';
const RE_NAME = "/^[\p{L} .'-]+$/u";
