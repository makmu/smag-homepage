<?php

declare(strict_types=1);

namespace App\Services;

use App\Database\Database;
use PDO;
use InvalidArgumentException;

final class UserService
{
    public function findByEmail(string $email): ?array
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function findById(int $id): ?array
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function verifyPassword(string $email, string $password): ?array
    {
        $user = $this->findByEmail($email);

        if ($user === null) {
            return null;
        }

        if (!password_verify($password, $user['password'])) {
            return null;
        }

        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ];
    }

    public function createUser(string $name, string $email, string $password, string $role = 'admin'): array
    {
        $pdo = Database::getConnection();
        
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        
        $stmt = $pdo->prepare('
            INSERT INTO users (name, email, password, role)
            VALUES (:name, :email, :password, :role)
        ');
        
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'password' => $hashedPassword,
            'role' => $role,
        ]);

        return $this->findById((int) $pdo->lastInsertId());
    }
}
