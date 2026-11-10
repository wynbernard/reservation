<?php
// Database.php

class Database {
    private static ?PDO $instance = null;

    // Private constructor prevents direct object creation
    private function __construct() {}

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $host = 'localhost';
            $db   = 'restaurant_reservation';
            $user = 'root';
            $pass = ''; // Leave blank for default local XAMPP setup
            $charset = 'utf8mb4';

            $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Return associative arrays by default
                PDO::ATTR_EMULATE_PREPARES   => false,                  // Use native prepared statements for security
                PDO::ATTR_PERSISTENT         => true,                   // Reuse connections for better performance locally
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (\PDOException $e) {
                // In production, log this error to a file instead of displaying raw passwords/paths
                error_log($e->getMessage());
                throw new \PDOException("Database connection failed. Please check your local server settings.");
            }
        }

        return self::$instance;
    }
}
?>