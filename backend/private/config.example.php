<?php
// Copy to config.php OUTSIDE public_html (e.g. /home/USER/powerbank_private/config.php).
return [
  'db' => ['host' => 'localhost', 'name' => 'u000_powerbank', 'user' => 'u000_pbapi', 'pass' => 'CHANGE_ME'],
  'jwt_secret' => 'CHANGE_ME_64_RANDOM_CHARS',      // php -r "echo bin2hex(random_bytes(32));"
  'allowed_origins' => ['https://app.yourdomain.com'],
  'cookie_domain' => '.yourdomain.com',
  'sms' => ['provider' => 'log', 'msg91' => ['authkey' => '', 'template_id' => ''], 'twilio' => ['sid' => '', 'token' => '', 'from' => '']],
  'debug' => false,
];
