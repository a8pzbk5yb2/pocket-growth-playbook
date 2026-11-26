<?php
return [
  'POST /admin/auth/login' => fn() => admin_login(),
  'POST /admin/auth/refresh' => fn() => auth_refresh('admin'),
  'POST /admin/auth/logout' => fn() => auth_logout('admin'),
  'GET /admin/me' => fn() => ok(['admin' => admin_out(require_admin('viewer'))]),
  'POST /admin/auth/change-password' => fn() => admin_change_password(),

  'GET /admin/overview' => fn() => admin_overview(),
  'GET /admin/reports' => fn() => admin_reports(),
  'GET /admin/activity-logs' => fn() => admin_activity_logs(),
  'GET /admin/settings' => fn() => admin_settings_get(),
  'PUT /admin/settings' => fn() => admin_settings_update(),

  'GET /admin/users' => fn() => admin_users_list(),
  'POST /admin/users' => fn() => admin_user_create(),
  'GET /admin/users/{id}' => fn(array $p) => admin_user_get($p['id'] ?? ''),
  'PUT /admin/users/{id}' => fn(array $p) => admin_user_update($p['id'] ?? ''),

  'GET /admin/plans' => fn() => admin_plans_list(),
  'POST /admin/plans' => fn() => admin_plan_create(),
  'PUT /admin/plans/{id}' => fn(array $p) => admin_plan_update($p['id'] ?? ''),
  'DELETE /admin/plans/{id}' => fn(array $p) => admin_plan_delete($p['id'] ?? ''),

  'GET /admin/referrals' => fn() => admin_referrals(),
  'POST /admin/invitation-codes' => fn() => admin_invite_create(),
  'PUT /admin/invitation-codes/{id}' => fn(array $p) => admin_invite_update($p['id'] ?? ''),

  'GET /admin/notifications' => fn() => admin_notifications_list(),
  'POST /admin/notifications' => fn() => admin_notifications_send(),
];

