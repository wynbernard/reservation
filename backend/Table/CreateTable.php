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

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid request data"]);
    exit();
}

$area_id = filter_var($input['area_id'] ?? null, FILTER_VALIDATE_INT);
$table_number = trim($input['table_number'] ?? '');
$table_name = trim($input['table_name'] ?? '');
$capacity = filter_var($input['capacity'] ?? null, FILTER_VALIDATE_INT);
$shape = $input['shape'] ?? 'square';
$is_active = filter_var($input['is_active'] ?? 1, FILTER_VALIDATE_INT);
$notes = trim($input['notes'] ?? '');
$valid_shapes = ['round', 'square', 'rectangle'];

if (!$area_id || $table_number === '' || !$capacity || $capacity < 1) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Area, table number, and a positive capacity are required"]);
    exit();
}

if (!in_array($shape, $valid_shapes, true) || !in_array($is_active, [0, 1], true)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid table shape or status"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare(
        "INSERT INTO restaurant_tables (area_id, table_number, table_name, capacity, shape, is_active, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $area_id,
        $table_number,
        $table_name === '' ? null : $table_name,
        $capacity,
        $shape,
        $is_active,
        $notes === '' ? null : $notes
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Table created successfully",
        "table_id" => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That table number already exists or the selected area is invalid"]);
        exit();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to create table"]);
}
?>
