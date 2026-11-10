<?php
// api/get_reservations.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../database/conn.php';

try {
    $pdo = Database::getInstance();

    // Query joined with your exact customers and reservations table schema
    $sql = "SELECT 
                r.reservation_id, 
                r.reservation_code, 
                r.party_size, 
                r.start_at, 
                r.end_at, 
                r.occasion, 
                r.special_requests, 
                r.source, 
                r.deposit_amount, 
                r.deposit_paid,
                (SELECT GROUP_CONCAT(rt.table_id)
                 FROM reservation_tables rt
                 WHERE rt.reservation_id = r.reservation_id) AS table_ids,
                COALESCE(c.full_name, CONCAT('Customer #', r.customer_id)) AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                COALESCE(s.status_name, 'Confirmed') AS status_name
            FROM reservations r
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN reservation_statuses s ON r.status_id = s.status_id
            ORDER BY r.start_at ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $reservations = $stmt->fetchAll();

    // Format start_at into date (YYYY-MM-DD) and time (HH:MM) for the React calendar
    $formatted = array_map(function($res) {
        $dateTime = new DateTime($res['start_at']);
        return [
            "id" => $res['reservation_id'],
            "code" => $res['reservation_code'],
            "customer" => $res['customer_name'],
            "phone" => $res['customer_phone'],
            "email" => $res['customer_email'],
            "date" => $dateTime->format('Y-m-d'),
            "time" => $dateTime->format('H:i'),
            "startAt" => $dateTime->format('Y-m-d H:i:s'),
            "endAt" => (new DateTime($res['end_at']))->format('Y-m-d H:i:s'),
            "tableIds" => $res['table_ids']
                ? array_map('intval', explode(',', $res['table_ids']))
                : [],
            "guests" => (int)$res['party_size'],
            "status" => $res['status_name'],
            "occasion" => $res['occasion'],
            "source" => $res['source']
        ];
    }, $reservations);

    echo json_encode([
        "success" => true,
        "data" => $formatted
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>