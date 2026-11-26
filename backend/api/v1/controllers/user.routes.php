<?php
return [
  'GET /plans' => fn() => user_plans(),
  'GET /me/dashboard' => fn() => user_dashboard(),
  'PUT /me/profile' => fn() => user_profile_update(),
  'GET /me/settings' => fn() => user_settings_get(),
  'PUT /me/settings' => fn() => user_settings_update(),
  'GET /me/referrals' => fn() => user_referrals(),
  'GET /me/notifications' => fn() => user_notifications(),
  'POST /me/notifications/read-all' => fn() => user_notifications_read_all(),
  'POST /me/notifications/{id}/read' => fn(array $p) => user_notification_read($p['id'] ?? ''),
];

