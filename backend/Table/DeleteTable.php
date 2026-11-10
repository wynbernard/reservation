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

require_once __DIR__ . '/../database/conn.php';
$input = json_decode(file_get_contents("php://input"), true);
$table_id = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);

if (!$table_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "A valid table ID is required"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    $pdo->beginTransaction();

    $table = $pdo->prepare("SELECT table_id FROM restaurant_tables WHERE table_id = ? FOR UPDATE");
    $table->execute([$table_id]);
    if (!$table->fetchColumn()) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Table not found"]);
        exit();
    }

    $check = $pdo->prepare("SELECT 1 FROM reservation_tables WHERE table_id = ? LIMIT 1");
    $check->execute([$table_id]);
    if ($check->fetchColumn()) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "This table is assigned to a reservation and cannot be deleted"]);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM restaurant_tables WHERE table_id = ?");
    $stmt->execute([$table_id]);
    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Table not found"]);
        exit();
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Table deleted successfully"]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "This table is assigned to a reservation and cannot be deleted"]);
        exit();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to delete table"]);
}
?>
