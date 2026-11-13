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
$customer_name = trim($input['customer_name'] ?? '');
$customer_phone = trim($input['customer_phone'] ?? '');
$party_size = filter_var($input['party_size'] ?? null, FILTER_VALIDATE_INT);
$raw_table_ids = $input['table_ids'] ?? [];
$start_at = $input['start_at'] ?? null;
$end_at = $input['end_at'] ?? null;
$occasion = $input['occasion'] ?? '';
$source = trim($input['source'] ?? 'Walk-in');
if ($source === '') {
    $source = 'Walk-in';
}

$table_ids = [];
if (is_array($raw_table_ids)) {
    foreach ($raw_table_ids as $raw_table_id) {
        $table_id = filter_var($raw_table_id, FILTER_VALIDATE_INT);
        if (!$table_id || in_array($table_id, $table_ids, true)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Select one or more different valid tables"]);
            exit();
        }
        $table_ids[] = $table_id;
    }
}

if (!$reservation_id || $customer_name === '' || !$party_size || count($table_ids) < 1 || !$start_at || !$end_at) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Reservation ID, customer name, party size, tables, and reservation times are required"]);
    exit();
}

try {
    $start = DateTime::createFromFormat('Y-m-d H:i:s', $start_at);
    $end = DateTime::createFromFormat('Y-m-d H:i:s', $end_at);
    if (!$start || !$end || $end <= $start) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid reservation time range"]);
        exit();
    }

    $pdo = Database::getInstance();
    $pdo->beginTransaction();

    $reservationStmt = $pdo->prepare(
        "SELECT customer_id FROM reservations WHERE reservation_id = ? FOR UPDATE"
    );
    $reservationStmt->execute([$reservation_id]);
    $reservation = $reservationStmt->fetch();
    if (!$reservation) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Reservation not found"]);
        exit();
    }

    $tablePlaceholders = implode(',', array_fill(0, count($table_ids), '?'));
    $tableStmt = $pdo->prepare(
        "SELECT table_id, capacity
         FROM restaurant_tables
         WHERE table_id IN ($tablePlaceholders) AND is_active = 1
         ORDER BY table_id
         FOR UPDATE"
    );
    $tableStmt->execute($table_ids);
    $selectedTables = $tableStmt->fetchAll();
    if (count($selectedTables) !== count($table_ids)) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "One or more selected tables are not available"]);
        exit();
    }

    $totalCapacity = array_sum(array_map(
        fn($table) => (int)$table['capacity'],
        $selectedTables
    ));
    if ($totalCapacity < $party_size) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Selected tables cannot seat this party size"]);
        exit();
    }

    $conflictStmt = $pdo->prepare(
        "SELECT r.reservation_id
         FROM reservation_tables rt
         JOIN reservations r ON r.reservation_id = rt.reservation_id
         WHERE rt.table_id IN ($tablePlaceholders)
           AND r.reservation_id <> ?
           AND r.status_id NOT IN (4, 5, 6)
           AND r.start_at < ?
           AND r.end_at > ?
         LIMIT 1
         FOR UPDATE"
    );
    $conflictStmt->execute(array_merge(
        $table_ids,
        [
            $reservation_id,
            $end->format('Y-m-d H:i:s'),
            $start->format('Y-m-d H:i:s')
        ]
    ));
    if ($conflictStmt->fetch()) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That table is already booked for the selected time"]);
        exit();
    }

    $customer_id = (int)$reservation['customer_id'];
    $sharedCustomerStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM reservations WHERE customer_id = ? AND reservation_id <> ?"
    );
    $sharedCustomerStmt->execute([$customer_id, $reservation_id]);
    if ($sharedCustomerStmt->fetchColumn() > 0) {
        $customerStmt = $pdo->prepare(
            "INSERT INTO customers (full_name, phone) VALUES (?, ?)"
        );
        $customerStmt->execute([$customer_name, $customer_phone]);
        $customer_id = (int)$pdo->lastInsertId();
    } else {
        $customerStmt = $pdo->prepare(
            "UPDATE customers SET full_name = ?, phone = ? WHERE customer_id = ?"
        );
        $customerStmt->execute([$customer_name, $customer_phone, $customer_id]);
    }

    $updateReservation = $pdo->prepare(
        "UPDATE reservations
         SET customer_id = ?, party_size = ?, start_at = ?, end_at = ?, occasion = ?, source = ?
         WHERE reservation_id = ?"
    );
    $updateReservation->execute([
        $customer_id,
        $party_size,
        $start->format('Y-m-d H:i:s'),
        $end->format('Y-m-d H:i:s'),
        $occasion,
        $source,
        $reservation_id
    ]);

    $deleteTables = $pdo->prepare(
        "DELETE FROM reservation_tables WHERE reservation_id = ?"
    );
    $deleteTables->execute([$reservation_id]);
    $assignTable = $pdo->prepare(
        "INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)"
    );
    foreach ($table_ids as $table_id) {
        $assignTable->execute([$reservation_id, $table_id]);
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Reservation updated successfully"]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to update reservation"]);
}
?>
