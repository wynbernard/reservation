<?php
function requireAdminUser(): void {
    session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Login is required"]);
        exit();
    }

    if (strtolower(trim((string)($_SESSION['role'] ?? ''))) !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "Administrator access is required"]);
        exit();
    }
}
?>
