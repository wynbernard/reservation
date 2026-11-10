<?php
// backend/Tables/update_table.php
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
$area_id = filter_var($input['area_id'] ?? null, FILTER_VALIDATE_INT);
$table_number = trim($input['table_number'] ?? '');
$table_name = trim($input['table_name'] ?? '');
$capacity = filter_var($input['capacity'] ?? null, FILTER_VALIDATE_INT);
$shape = $input['shape'] ?? '';
$is_active = filter_var($input['is_active'] ?? null, FILTER_VALIDATE_INT);
$notes = trim($input['notes'] ?? '');

if (!$table_id || !$area_id || $table_number === '' || !$capacity || $capacity < 1) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Table, area, number, and a positive capacity are required"]);
    exit();
}

if (!in_array($shape, ['round', 'square', 'rectangle'], true) || !in_array($is_active, [0, 1], true)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid table shape or status"]);
    exit();
}

try {
    $pdo = Database::getInstance();

    $stmt = $pdo->prepare("
        UPDATE restaurant_tables 
        SET area_id = ?, table_number = ?, table_name = ?, capacity = ?, shape = ?, is_active = ?, notes = ?, updated_at = NOW()
        WHERE table_id = ?
    ");
    
    $stmt->execute([
        $area_id,
        $table_number,
        $table_name === '' ? null : $table_name,
        $capacity,
        $shape,
        $is_active,
        $notes === '' ? null : $notes,
        $table_id
    ]);
    if ($stmt->rowCount() === 0) {
        $exists = $pdo->prepare("SELECT 1 FROM restaurant_tables WHERE table_id = ?");
        $exists->execute([$table_id]);
        if (!$exists->fetchColumn()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Table not found"]);
            exit();
        }
    }

    echo json_encode([
        "success" => true, 
        "message" => "Table updated successfully"
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That table number already exists or the selected area is invalid"]);
        exit();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "message" => "Failed to update table"
    ]);
}
?>