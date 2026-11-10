<?php
// backend/Tables/get_tables.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../database/conn.php'; // Adjust relative path to your Database.php file

try {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare("SELECT * FROM restaurant_tables ORDER BY table_number ASC");
    $stmt->execute();
    $tables = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "data" => $tables
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "message" => $e->getMessage()
    ]);
}
?>