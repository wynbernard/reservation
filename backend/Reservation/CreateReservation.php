<?php
// api/create_reservation.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

require_once __DIR__ . '/../database/conn.php';
$input = json_decode(file_get_contents("php://input"), true);

$customer_name = trim($input['customer_name'] ?? '');
$customer_phone = trim($input['customer_phone'] ?? '');
$party_size = filter_var($input['party_size'] ?? null, FILTER_VALIDATE_INT);
$raw_table_ids = $input['table_ids'] ?? (isset($input['table_id']) ? [$input['table_id']] : []);
$start_at = $input['start_at'] ?? null;
$end_at = $input['end_at'] ?? null;
$occasion = $input['occasion'] ?? '';
$source = trim($input['source'] ?? 'Walk-in');
if ($source === '') {
    $source = 'Walk-in';
}
$status_id = 1;

$table_ids = [];
if (is_array($raw_table_ids)) {
    foreach ($raw_table_ids as $raw_table_id) {
        $validated_table_id = filter_var($raw_table_id, FILTER_VALIDATE_INT);
        if (!$validated_table_id || in_array($validated_table_id, $table_ids, true)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Select one or more different valid tables"]);
            exit();
        }
        $table_ids[] = $validated_table_id;
    }
}

if ($customer_name === '' || !$party_size || count($table_ids) < 1 || !$start_at) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Customer name, party size, one or more tables, and reservation time are required"]);
    exit();
}

try {
    $pdo = Database::getInstance();
    $start = DateTime::createFromFormat('Y-m-d H:i:s', $start_at);
    if (!$start) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid reservation time"]);
        exit();
    }
    if ($end_at !== null && $end_at !== '') {
        $end = DateTime::createFromFormat('Y-m-d H:i:s', $end_at);
        if (!$end || $end <= $start) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "End time must be later than start time"]);
            exit();
        }
    } else {
        $end = clone $start;
        $end->modify('+90 minutes');
    }

    $pdo->beginTransaction();
    $customerStmt = $pdo->prepare(
        "SELECT customer_id FROM customers WHERE full_name = ? AND phone = ? LIMIT 1 FOR UPDATE"
    );
    $customerStmt->execute([$customer_name, $customer_phone]);
    $customer_id = $customerStmt->fetchColumn();
    if (!$customer_id) {
        $createCustomer = $pdo->prepare(
            "INSERT INTO customers (full_name, phone) VALUES (?, ?)"
        );
        $createCustomer->execute([$customer_name, $customer_phone]);
        $customer_id = $pdo->lastInsertId();
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
           AND r.status_id NOT IN (4, 5, 6)
           AND r.start_at < ?
           AND r.end_at > ?
         LIMIT 1
         FOR UPDATE"
    );
    $conflictStmt->execute(array_merge(
        $table_ids,
        [$end->format('Y-m-d H:i:s'), $start->format('Y-m-d H:i:s')]
    ));
    if ($conflictStmt->fetch()) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That table is already booked for the selected time"]);
        exit();
    }

    $reservation_code = 'RES-' . strtoupper(substr(uniqid(), -6));

    $stmt = $pdo->prepare(
        "INSERT INTO reservations
         (reservation_code, customer_id, status_id, party_size, start_at, end_at, occasion, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $reservation_code,
        $customer_id,
        $status_id,
        $party_size,
        $start->format('Y-m-d H:i:s'),
        $end->format('Y-m-d H:i:s'),
        $occasion,
        $source
    ]);

    $reservation_id = $pdo->lastInsertId();
    $assignTable = $pdo->prepare(
        "INSERT INTO reservation_tables (reservation_id, table_id) VALUES (?, ?)"
    );
    foreach ($table_ids as $table_id) {
        $assignTable->execute([$reservation_id, $table_id]);
    }
    $pdo->commit();

    echo json_encode(["success" => true, "message" => "Reservation created successfully", "reservation_id" => $reservation_id]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>