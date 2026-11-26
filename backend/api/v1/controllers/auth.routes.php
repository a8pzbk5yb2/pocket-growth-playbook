<?php
return [
  'POST /auth/register/start' => fn() => auth_register_start(),
  'POST /auth/register/verify' => fn() => auth_register_verify(),
  'POST /auth/login' => fn() => auth_login(),
  'POST /auth/reset/start' => fn() => auth_reset_start(),
  'POST /auth/reset/verify' => fn() => auth_reset_verify(),
  'POST /auth/refresh' => fn() => auth_refresh('user'),
  'POST /auth/logout' => fn() => auth_logout('user'),
  'GET /me' => function () { $u = require_user(); $s = db()->prepare('SELECT * FROM users WHERE id = ?'); $s->execute([$u['id']]); ok(['user' => user_out($s->fetch())]); },
];
