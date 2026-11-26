<?php
declare(strict_types=1);
/** Local mock MxPay API server (https://docs.mxpay.one/) for PHP integration tests. */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
header('Content-Type: application/json');

$apiKey = $_POST['api_key'] ?? '';
if ($apiKey !== 'test_mxpay_key') {
  echo json_encode(['status' => false, 'message' => 'Invalid API key']);
  exit;
}

if ($path === '/api/web') {
  $orderId = (string)($_POST['order_id'] ?? '');
  echo json_encode([
    'status' => true,
    'message' => 'Payment link created',
    'payment_link' => 'http://127.0.0.1:8788/checkout/' . $orderId,
    'orderNo' => 'MX' . substr($orderId, 3),
  ]);
  exit;
}

if ($path === '/api/payout') {
  $orderId = (string)($_POST['order_id'] ?? '');
  $ifsc = (string)($_POST['ifsc'] ?? '');
  if ($ifsc === 'FAIL0000000') {
    echo json_encode(['status' => false, 'message' => 'Simulated payout rejection']);
    exit;
  }
  echo json_encode([
    'status' => true,
    'message' => 'Payout initiated',
    'order_id' => $orderId,
    'bank_name' => $_POST['bank_name'] ?? '',
    'acc_number' => $_POST['account_number'] ?? '',
    'acc_name' => $_POST['account_name'] ?? '',
    'ifsc' => $ifsc,
  ]);
  exit;
}

http_response_code(404);
echo json_encode(['status' => false, 'message' => 'Not found']);

