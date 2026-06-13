<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Services\TokenService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class TokenAuthenticationMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly TokenService $tokenService
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return $this->unauthorizedResponse($request);
        }

        $token = substr($authHeader, 7);
        $userData = $this->tokenService->validateAccessToken($token);

        if ($userData === null) {
            return $this->unauthorizedResponse($request);
        }

        $request = $request->withAttribute('user_id', $userData['user_id']);

        return $handler->handle($request);
    }

    private function unauthorizedResponse(ServerRequestInterface $request): ResponseInterface
    {
        $response = new \Slim\Psr7\Response(401);
        $response->getBody()->write(json_encode([
            'data' => null,
            'error' => 'Unauthorized',
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    }
}
