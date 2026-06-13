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
            $user = $this->userService->createUser($name, $email, $data['password']);
        } catch (\Exception $e) {
            return $this->errorResponse($response, 500, 'Failed to create user');
        }

        if ($imageUrl !== null && $user !== null) {
            $this->updateImageUrl($user['id'], $imageUrl);
            $user = $this->userService->findById($user['id']);
        }

        return $this->successResponse($response->withStatus(201), $user);
    }

    public function getUser(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];

        $user = $this->userService->findById($id);
        if ($user === null) {
            return $this->errorResponse($response, 404, 'User not found');
        }

        return $this->successResponse($response, $user);
    }

    public function updateUser(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];

        $existing = $this->userService->findById($id);
        if ($existing === null) {
            return $this->errorResponse($response, 404, 'User not found');
        }

        $data = $request->getParsedBody();

        if (empty($data['name']) || empty($data['email'])) {
            return $this->errorResponse($response, 400, 'Missing required fields: name, email');
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->errorResponse($response, 400, 'Invalid email address');
        }

        $password = !empty($data['password']) ? $data['password'] : null;
        if ($password !== null && strlen($password) < 8) {
            return $this->errorResponse($response, 400, 'Password must be at least 8 characters');
        }

        if ($this->userService->findByEmailExcludingId($data['email'], $id) !== null) {
            return $this->errorResponse($response, 409, 'A user with this email address already exists');
        }

        $name = htmlspecialchars(strip_tags(trim($data['name'])), ENT_QUOTES, 'UTF-8');
        $email = trim($data['email']);
        $imageUrl = $data['image_url'] ?? $existing['image_url'] ?? null;

        try {
            $user = $this->userService->updateUser($id, $name, $email, $password, $imageUrl);
        } catch (\Exception $e) {
            return $this->errorResponse($response, 500, 'Failed to update user');
        }

        return $this->successResponse($response, $user);
    }

    public function deleteUser(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];

        $existing = $this->userService->findById($id);
        if ($existing === null) {
            return $this->errorResponse($response, 404, 'User not found');
        }

        $currentUserId = (int) $request->getAttribute('user_id');
        if ($currentUserId === $id) {
            return $this->errorResponse($response, 400, 'You cannot delete yourself');
        }

        try {
            $this->userService->deleteUser($id);
        } catch (\Exception $e) {
            return $this->errorResponse($response, 500, 'Failed to delete user');
        }

        return $this->successResponse($response, ['deleted' => true]);
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