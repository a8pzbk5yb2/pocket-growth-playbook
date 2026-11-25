<?php
// Copy to config.php OUTSIDE public_html in a folder named powerbank_private next to public_html.
return [
  'db' => ['host' => 'localhost', 'name' => 'u000_powerbank', 'user' => 'u000_pbapi', 'pass' => 'CHANGE_ME'],
  'jwt_secret' => 'CHANGE_ME_64_RANDOM_CHARS',      // php -r "echo bin2hex(random_bytes(32));"
  'allowed_origins' => ['https://app.yourdomain.com'],
  'cookie_domain' => '.yourdomain.com',
  // provider: 'log' (test mode, codes go to storage/logs/otp-*.log) or 'blacksms'
  'sms' => ['provider' => 'log', 'blacksms' => ['api_key' => 'CHANGE_ME', 'sender_id' => 'YOUR_SENDER_ID', 'route' => 1]],
  'debug' => false,
];
