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

$user_id = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT);
$full_name = trim($input['full_name'] ?? '');
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$role = trim($input['role'] ?? '');
$is_active = filter_var($input['is_active'] ?? null, FILTER_VALIDATE_INT);

if (
    !$user_id ||
    $full_name === '' ||
    $username === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    !is_string($password) ||
    ($password !== '' && strlen($password) < 6) ||
    $role === '' ||
    !in_array($is_active, [0, 1], true)
) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Enter valid user details; passwords must be at least 6 characters"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    if ($password === '') {
        $stmt = $pdo->prepare(
            "UPDATE users
             SET full_name = ?, username = ?, email = ?, role = ?, is_active = ?
             WHERE user_id = ?"
        );
        $stmt->execute([$full_name, $username, $email, $role, $is_active, $user_id]);
    } else {
        $stmt = $pdo->prepare(
            "UPDATE users
             SET full_name = ?, username = ?, email = ?, password_hash = ?, role = ?, is_active = ?
             WHERE user_id = ?"
        );
        $stmt->execute([
            $full_name,
            $username,
            $email,
            password_hash($password, PASSWORD_DEFAULT),
            $role,
            $is_active,
            $user_id,
        ]);
    }

    if ($stmt->rowCount() === 0) {
        $exists = $pdo->prepare("SELECT 1 FROM users WHERE user_id = ?");
        $exists->execute([$user_id]);
        if (!$exists->fetchColumn()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "User not found"]);
            exit();
        }
    }
    echo json_encode(["success" => true, "message" => "User updated successfully"]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That username or email is already in use"]);
        exit();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to update user"]);
}
?>
