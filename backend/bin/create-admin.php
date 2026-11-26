<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("CLI only\n"); }

require dirname(__DIR__) . '/api/v1/config/app.php';
require dirname(__DIR__) . '/api/v1/config/database.php';

if ($argc < 4) {
  fwrite(STDERR, "Usage: php bin/create-admin.php <username> <full_name> <password> [super_admin|admin|viewer]\n");
  exit(1);
}

$username = strtolower(trim($argv[1]));
$fullName = trim($argv[2]);
$password = $argv[3];
$role = $argv[4] ?? 'super_admin';

if (!preg_match('/^[a-z0-9_.-]{3,50}$/', $username)) { fwrite(STDERR, "Invalid username (3-50 chars: a-z, 0-9, _ . -)\n"); exit(1); }
if (mb_strlen($fullName) < 2 || mb_strlen($fullName) > 80) { fwrite(STDERR, "Full name must be 2-80 chars\n"); exit(1); }
if (strlen($password) < 8) { fwrite(STDERR, "Password must be at least 8 characters\n"); exit(1); }
if (!in_array($role, ['super_admin', 'admin', 'viewer'], true)) { fwrite(STDERR, "Role must be super_admin, admin, or viewer\n"); exit(1); }

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo = db();
$stmt = $pdo->prepare('SELECT id FROM admin_users WHERE username = ?');
$stmt->execute([$username]);
$existing = $stmt->fetch();

if ($existing) {
  $pdo->prepare("UPDATE admin_users SET full_name = ?, password_hash = ?, role = ?, status = 'active', deleted_at = NULL WHERE id = ?")
    ->execute([$fullName, $hash, $role, $existing['id']]);
  echo "Updated admin '$username' ($role).\n";
} else {
  $pdo->prepare("INSERT INTO admin_users (username, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, 'active')")
    ->execute([$username, $fullName, $hash, $role]);
  echo "Created admin '$username' ($role).\n";
}

