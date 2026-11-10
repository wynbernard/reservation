<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../database/conn.php';

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->query("SELECT area_id, area_name FROM floor_areas ORDER BY area_id");
    echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to load table areas"]);
}
?>
