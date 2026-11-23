<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../database/conn.php';

try {
    $pdo = Database::getInstance();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS blocked_reservation_dates (
            blocked_date DATE NOT NULL PRIMARY KEY,
            reason VARCHAR(255) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB"
    );

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query(
            "SELECT blocked_date, reason
             FROM blocked_reservation_dates
             ORDER BY blocked_date"
        );
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
        exit();
    }

    $input = json_decode(file_get_contents("php://input"), true);
    $date = trim($input['date'] ?? '');
    $action = trim($input['action'] ?? 'block');
    $reason = trim($input['reason'] ?? '');
    $parsed = DateTime::createFromFormat('Y-m-d', $date);

    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "A valid date is required"]);
        exit();
    }

    if ($action === 'unblock') {
        $stmt = $pdo->prepare(
            "DELETE FROM blocked_reservation_dates WHERE blocked_date = ?"
        );
        $stmt->execute([$date]);
    } else {
        $stmt = $pdo->prepare(
            "INSERT INTO blocked_reservation_dates (blocked_date, reason)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason)"
        );
        $stmt->execute([$date, $reason]);
    }

    echo json_encode([
        "success" => true,
        "message" => $action === 'unblock' ? "Day unblocked" : "Day blocked",
        "data" => ["date" => $date, "blocked" => $action !== 'unblock']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
