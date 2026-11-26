<?php
declare(strict_types=1);
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $d = app_config()['db'];
  $port = isset($d['port']) ? ';port=' . (int)$d['port'] : '';
  $pdo = new PDO("mysql:host={$d['host']}{$port};dbname={$d['name']};charset=utf8mb4", $d['user'], $d['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  $pdo->exec("SET time_zone = '+00:00'");
  return $pdo;
}
function tx(callable $fn) { $p = db(); $p->beginTransaction(); try { $r = $fn($p); $p->commit(); return $r; } catch (Throwable $e) { $p->rollBack(); throw $e; } }
