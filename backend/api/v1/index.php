<?php
declare(strict_types=1);
require __DIR__ . '/config/app.php';
require __DIR__ . '/config/database.php';
require __DIR__ . '/config/cors.php';
foreach (['response', 'validator', 'jwt'] as $f) require __DIR__ . "/helpers/$f.php";
foreach (['rate_limit', 'auth', 'admin'] as $f) require __DIR__ . "/middleware/$f.php";
foreach (glob(__DIR__ . '/services/*.php') ?: [] as $f) require $f;
foreach (glob(__DIR__ . '/controllers/*Controller.php') ?: [] as $f) require $f;

set_exception_handler(function (Throwable $e) {
  if ($e instanceof ApiError) json_out($e->status, ['success' => false, 'error' => ['code' => $e->errCode, 'message' => $e->getMessage()] + ($e->fields ? ['fields' => $e->fields] : [])]);
  log_error($e);
  json_out(500, ['success' => false, 'error' => ['code' => 'server_error', 'message' => 'Something went wrong. Please try again.']]);
});

apply_cors();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = '/' . trim(preg_replace('#^.*/api/v1#', '', parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'), '/');
require_csrf();

/** Route table: "METHOD /path/{id}" => handler. Filled in by each phase. */
$routes = [
  'GET /health' => function () { db()->query('SELECT 1')->fetchColumn(); ok(['status' => 'ok', 'db' => 'connected', 'time' => gmdate('c')]); },
  'GET /auth/csrf' => function () { $t = bin2hex(random_bytes(16)); set_cookie('pb_csrf', $t, 0, false); ok(['csrfToken' => $t]); },
];
foreach (glob(__DIR__ . '/controllers/*.routes.php') ?: [] as $f) $routes += require $f;

foreach ($routes as $sig => $handler) {
  [$m, $pattern] = explode(' ', $sig, 2);
  $re = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[A-Za-z0-9_-]+)', $pattern) . '$#';
  if ($m === $method && preg_match($re, $path, $mm)) { $handler(array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY)); return; }
}
fail(404, 'not_found', 'Endpoint not found');
