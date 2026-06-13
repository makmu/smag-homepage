<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\UserService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class UserController
{
    public function __construct(
        private readonly UserService $userService
    ) {}

    public function getUsers(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $users = $this->userService->findAll();

        $payload = json_encode([
            'data' => ['items' => $users],
            'error' => null,
        ]);

        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function createUser(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $role = $request->getAttribute('user_role');
        if ($role !== 'admin') {
            return $this->errorResponse($response, 403, 'Forbidden');
        }

        $data = $request->getParsedBody();

        $requiredFields = ['name', 'email', 'password'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return $this->errorResponse($response, 400, 'Missing required fields: ' . implode(', ', $missingFields));
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->errorResponse($response, 400, 'Invalid email address');
        }

        if (strlen($data['password']) < 8) {
            return $this->errorResponse($response, 400, 'Password must be at least 8 characters');
        }

        if ($this->userService->findByEmail($data['email']) !== null) {
            return $this->errorResponse($response, 409, 'A user with this email address already exists');
        }

        $name = htmlspecialchars(strip_tags(trim($data['name'])), ENT_QUOTES, 'UTF-8');
        $email = trim($data['email']);
        $imageUrl = !empty($data['image_url']) ? $data['image_url'] : null;

        try {
            $user = $this->userService->createUser($name, $email, $data['password'], 'admin');
        } catch (\Exception $e) {
            return $this->errorResponse($response, 500, 'Failed to create user');
        }

        if ($imageUrl !== null && $user !== null) {
            $this->updateImageUrl($user['id'], $imageUrl);
            $user = $this->userService->findById($user['id']);
        }

        return $this->successResponse($response->withStatus(201), $user);
    }

    private function updateImageUrl(int $userId, string $imageUrl): void
    {
        $pdo = \App\Database\Database::getConnection();
        $stmt = $pdo->prepare('UPDATE users SET image_url = :image_url WHERE id = :id');
        $stmt->execute(['image_url' => $imageUrl, 'id' => $userId]);
    }

    private function successResponse(ResponseInterface $response, array $data): ResponseInterface
    {
        $response->getBody()->write(json_encode(['data' => $data, 'error' => null]));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function errorResponse(ResponseInterface $response, int $status, string $message): ResponseInterface
    {
        $response = $response->withStatus($status);
        $response->getBody()->write(json_encode(['data' => null, 'error' => $message]));
        return $response->withHeader('Content-Type', 'application/json');
    }
}