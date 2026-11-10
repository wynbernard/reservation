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
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid request data"]);
    exit();
}

$full_name = trim($input['full_name'] ?? '');
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$role = trim($input['role'] ?? '');
$is_active = filter_var($input['is_active'] ?? null, FILTER_VALIDATE_INT);

if (
    $full_name === '' ||
    $username === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    !is_string($password) ||
    strlen($password) < 6 ||
    $role === '' ||
    !in_array($is_active, [0, 1], true)
) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Enter a name, username, valid email, role, status, and a password of at least 6 characters"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare(
        "INSERT INTO users (full_name, username, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $full_name,
        $username,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
        $role,
        $is_active,
    ]);

    echo json_encode(["success" => true, "message" => "User created successfully"]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That username or email is already in use"]);
        exit();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to create user"]);
}
?>
