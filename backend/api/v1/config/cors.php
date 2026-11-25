<?php
declare(strict_types=1);
function apply_cors(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin && in_array($origin, app_config()['allowed_origins'], true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 600');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}
