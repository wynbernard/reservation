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
$reservation_id = filter_var($input['reservation_id'] ?? null, FILTER_VALIDATE_INT);

if (!$reservation_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "A valid reservation ID is required"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    $pdo->beginTransaction();

    $reservation = $pdo->prepare(
        "SELECT reservation_id FROM reservations WHERE reservation_id = ? FOR UPDATE"
    );
    $reservation->execute([$reservation_id]);
    if (!$reservation->fetchColumn()) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Reservation not found"]);
        exit();
    }

    $deleteTables = $pdo->prepare(
        "DELETE FROM reservation_tables WHERE reservation_id = ?"
    );
    $deleteTables->execute([$reservation_id]);

    $deleteReservation = $pdo->prepare(
        "DELETE FROM reservations WHERE reservation_id = ?"
    );
    $deleteReservation->execute([$reservation_id]);
    $pdo->commit();

    echo json_encode(["success" => true, "message" => "Reservation deleted successfully"]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to delete reservation"]);
}
?>