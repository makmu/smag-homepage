<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\TokenService;
use App\Services\UserService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuthController
{
    public function __construct(
        private readonly TokenService $tokenService,
        private readonly UserService $userService
    ) {}

    public function login(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($email) || empty($password)) {
            $payload = json_encode([
                'data' => null,
                'error' => 'Email and password are required',
            ]);
            $response->getBody()->write($payload);
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $user = $this->userService->verifyPassword($email, $password);

        if ($user === null) {
            $payload = json_encode([
                'data' => null,
                'error' => 'Invalid credentials',
            ]);
            $response->getBody()->write($payload);
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        $tokens = $this->tokenService->createTokenPair($user['id']);

        $payload = json_encode([
            'data' => $tokens,
            'error' => null,
        ]);

        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function refresh(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        $refreshToken = $data['refresh_token'] ?? '';

        if (empty($refreshToken)) {
            $payload = json_encode([
                'data' => null,
                'error' => 'Refresh token is required',
            ]);
            $response->getBody()->write($payload);
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $tokens = $this->tokenService->refreshTokenPair($refreshToken);

        if ($tokens === null) {
            $payload = json_encode([
                'data' => null,
                'error' => 'Invalid or expired refresh token',
            ]);
            $response->getBody()->write($payload);
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        $payload = json_encode([
            'data' => $tokens,
            'error' => null,
        ]);

        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function logout(Request $request, Response $response): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');
        
        if (!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $this->tokenService->invalidateToken($token);
        }

        $payload = json_encode([
            'data' => ['message' => 'Logged out successfully'],
            'error' => null,
        ]);

        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function logoutAll(Request $request, Response $response): Response
    {
        $userId = $request->getAttribute('user_id');
        
        if ($userId === null) {
            $payload = json_encode([
                'data' => null,
                'error' => 'Unauthorized',
            ]);
            $response->getBody()->write($payload);
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        $this->tokenService->invalidateAllUserTokens($userId);

        $payload = json_encode([
            'data' => ['message' => 'Logged out from all devices'],
            'error' => null,
        ]);

        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json');
    }
}
