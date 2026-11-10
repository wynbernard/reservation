<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

require_once __DIR__ . '/auth.php';
requireAdminUser();
require_once __DIR__ . '/../database/conn.php';

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->query(
        "SELECT user_id, full_name, username, email, role, is_active, last_login
         FROM users
         ORDER BY full_name, user_id"
    );
    echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to load users"]);
}
?>
