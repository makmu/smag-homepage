<?php

declare(strict_types=1);

namespace App\Services;

use App\Database\Database;
use PDO;
use InvalidArgumentException;

final class TokenService
{
    private function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    public function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public function createTokenPair(int $userId, string $role): array
    {
        $config = $this->getConfig();
        $pdo = Database::getConnection();
        
        $accessToken = $this->generateToken();
        $refreshToken = $this->generateToken();
        
        $accessExpires = date('Y-m-d H:i:s', time() + $config['ACCESS_TOKEN_TTL']);
        $refreshExpires = date('Y-m-d H:i:s', time() + $config['REFRESH_TOKEN_TTL']);

        $stmt = $pdo->prepare('
            INSERT INTO tokens (token, user_id, role, type, expires_at)
            VALUES (:token, :user_id, :role, :type, :expires_at)
        ');

        $stmt->execute([
            'token' => $accessToken,
            'user_id' => $userId,
            'role' => $role,
            'type' => 'access',
            'expires_at' => $accessExpires,
        ]);

        $stmt->execute([
            'token' => $refreshToken,
            'user_id' => $userId,
            'role' => $role,
            'type' => 'refresh',
            'expires_at' => $refreshExpires,
        ]);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => $config['ACCESS_TOKEN_TTL'],
        ];
    }

    public function validateAccessToken(string $token): ?array
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('
            SELECT user_id, role, expires_at
            FROM tokens
            WHERE token = :token AND type = \'access\'
        ');
        
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();

        if ($row === false) {
            return null;
        }

        if (new \DateTime($row['expires_at']) < new \DateTime()) {
            return null;
        }

        return [
            'user_id' => (int) $row['user_id'],
            'role' => $row['role'],
        ];
    }

    public function refreshTokenPair(string $refreshToken): ?array
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('
            SELECT user_id, role, expires_at
            FROM tokens
            WHERE token = :token AND type = \'refresh\'
        ');
        
        $stmt->execute(['token' => $refreshToken]);
        $row = $stmt->fetch();

        if ($row === false) {
            return null;
        }

        if (new \DateTime($row['expires_at']) < new \DateTime()) {
            return null;
        }

        $this->invalidateToken($refreshToken);

        return $this->createTokenPair((int) $row['user_id'], $row['role']);
    }

    public function invalidateToken(string $token): bool
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('DELETE FROM tokens WHERE token = :token');
        return $stmt->execute(['token' => $token]);
    }

    public function invalidateAllUserTokens(int $userId): int
    {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare('DELETE FROM tokens WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);
        return $stmt->rowCount();
    }

    public function getUserIdFromToken(string $token): ?int
    {
        $data = $this->validateAccessToken($token);
        return $data !== null ? $data['user_id'] : null;
    }
}
