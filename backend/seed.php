<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use App\Database\Database;
use App\Services\UserService;

$options = getopt('', ['email:', 'name:', 'password:']);

if (empty($options['email']) || empty($options['name']) || empty($options['password'])) {
    echo "Error: --email, --name, and --password are required.\n";
    echo "Usage: php seed.php --email admin@example.com --name \"Admin\" --password \"your-password-min-8-chars\"\n";
    exit(1);
}

$email = $options['email'];
$name = $options['name'];
$password = $options['password'];

if (strlen($password) < 8) {
    echo "Error: Password must be at least 8 characters long.\n";
    exit(1);
}

$db = Database::getConnection();
$userService = new UserService();

$existingUsers = $db->query('SELECT COUNT(*) FROM users')->fetchColumn();

if ($existingUsers > 0) {
    echo "Error: A user already exists. Seeding is only allowed on an empty database.\n";
    exit(1);
}

$user = $userService->createUser($name, $email, $password);

echo "Created admin user: {$user['email']} (ID: {$user['id']})\n";
