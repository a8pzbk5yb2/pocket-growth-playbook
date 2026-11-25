<?php
declare(strict_types=1);
const ADMIN_ROLE_RANK = ['viewer' => 1, 'admin' => 2, 'super_admin' => 3];
/** Role is re-read from admin_users on every request. */
function require_admin(string $minRole = 'viewer'): array {
  $c = jwt_verify($_COOKIE['pb_admin_at'] ?? '');
  if (!$c || ($c['typ'] ?? '') !== 'admin') fail(401, 'unauthenticated', 'Admin login required');
  $s = db()->prepare("SELECT id, username, full_name, role FROM admin_users WHERE id = ? AND status = 'active' AND deleted_at IS NULL");
  $s->execute([(int)$c['sub']]); $a = $s->fetch();
  if (!$a) fail(401, 'unauthenticated', 'Admin login required');
  if (ADMIN_ROLE_RANK[$a['role']] < ADMIN_ROLE_RANK[$minRole]) fail(403, 'forbidden', 'You do not have permission for this action');
  return $a;
}
function admin_log(array $admin, string $action, ?string $type = null, $id = null, array $details = []): void {
  db()->prepare('INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, ip) VALUES (?,?,?,?,?,?)')
    ->execute([$admin['id'] ?? null, $action, $type, $id === null ? null : (string)$id, $details ? json_encode($details) : null, client_ip()]);
}
