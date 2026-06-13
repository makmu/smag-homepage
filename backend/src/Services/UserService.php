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
        
        $stmt = $pdo->prepare('SELECT id, name, email, image_url, created_at, updated_at FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row !== false ? [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'image_url' => $row['image_url'] ?? null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ] : null;
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
        ];
    }

    public function createUser(string $name, string $email, string $password): array
    {
        $pdo = Database::getConnection();
        
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        
        $stmt = $pdo->prepare('
            INSERT INTO users (name, email, password)
            VALUES (:name, :email, :password)
        ');
        
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'password' => $hashedPassword,
        ]);

        return $this->findById((int) $pdo->lastInsertId());
    }

    public function findAll(): array
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('SELECT id, name, image_url FROM users ORDER BY name ASC');
        $stmt->execute();
        $users = $stmt->fetchAll();

        return array_map(function($user) {
            return [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'image_url' => $user['image_url'] ?? null,
            ];
        }, $users);
    }

    public function updateUser(int $id, string $name, string $email, ?string $password, ?string $imageUrl): ?array
    {
        $pdo = Database::getConnection();
        $now = (new \DateTime())->format('Y-m-d H:i:s');

        $sets = ['name = :name', 'email = :email', 'image_url = :image_url', 'updated_at = :updated_at'];
        $params = [
            'name' => $name,
            'email' => $email,
            'image_url' => $imageUrl,
            'updated_at' => $now,
            'id' => $id,
        ];

        if ($password !== null && $password !== '') {
            $sets[] = 'password = :password';
            $params['password'] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        }

        $sql = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $this->findById($id);
    }

    public function findByEmailExcludingId(string $email, int $excludeId): ?array
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id');
        $stmt->execute(['email' => $email, 'id' => $excludeId]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function deleteUser(int $id): bool
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
