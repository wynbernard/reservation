<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

require_once __DIR__ . '/auth.php';
requireAdminUser();
require_once __DIR__ . '/../database/conn.php';
$input = json_decode(file_get_contents("php://input"), true);
$user_id = filter_var(
    is_array($input) ? ($input['user_id'] ?? null) : null,
    FILTER_VALIDATE_INT
);

if (!$user_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "A valid user ID is required"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
    $stmt->execute([$user_id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "User not found"]);
        exit();
    }
    echo json_encode(["success" => true, "message" => "User deleted successfully"]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to delete user"]);
}
?>
