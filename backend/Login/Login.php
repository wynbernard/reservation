<?php
// api/login.php

// Enable CORS for local development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Restrict to POST requests only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

session_start();
require_once __DIR__ . '/../database/conn.php';

// Get JSON input from React
$input = json_decode(file_get_contents("php://input"), true);

$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

// Basic validation
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Enter a valid email address"]);
    exit();
}

if (empty($password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Password is required"]);
    exit();
}

try {
    $pdo = Database::getInstance();

    // Query matching your exact table columns
    $stmt = $pdo->prepare("SELECT user_id, full_name, username, email, password_hash, role, is_active FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Accept existing plaintext credentials once, then upgrade them to a password hash.
    $storedPassword = $user['password_hash'] ?? '';
    $storedPasswordInfo = password_get_info((string)$storedPassword);
    $isHashedPassword = $storedPasswordInfo['algo'] !== null;
    $passwordMatches = is_array($user) && (
        $isHashedPassword
            ? password_verify($password, (string)$storedPassword)
            : hash_equals((string)$storedPassword, $password)
    );
    if ($passwordMatches) {
        
        // Check if user is active
        if (!$user['is_active']) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "This account has been deactivated."]);
            exit();
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['user_id'];
        $_SESSION['role'] = (string)$user['role'];

        if (!$isHashedPassword) {
            $upgradePassword = $pdo->prepare(
                "UPDATE users SET password_hash = ? WHERE user_id = ?"
            );
            $upgradePassword->execute([
                password_hash($password, PASSWORD_DEFAULT),
                $user['user_id']
            ]);
        }

        // Update last_login timestamp
        $updateLogin = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
        $updateLogin->execute([$user['user_id']]);

        // Strip password_hash before sending user details back to frontend
        unset($user['password_hash']);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "user" => $user
        ]);

    } else {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Invalid email or password"]);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>