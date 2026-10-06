<?php

declare(strict_types=1);

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class CorsMiddleware implements MiddlewareInterface
{
    /**
     * @param array<string> $allowedOrigins
     */
    public function __construct(private readonly array $allowedOrigins)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return $this->createPreflightResponse($request);
        }

        $response = $handler->handle($request);
        return $this->addCorsHeaders($response, $request);
    }

    private function createPreflightResponse(ServerRequestInterface $request): ResponseInterface
    {
        $response = new \Slim\Psr7\Response();
        return $this->addCorsHeaders($response, $request);
    }

    private function addCorsHeaders(ResponseInterface $response, ServerRequestInterface $request): ResponseInterface
    {
        $origin = $request->getHeaderLine('Origin');
        $allowedOrigin = $this->getAllowedOrigin($origin);

        if ($allowedOrigin !== null) {
            $response = $response->withHeader('Access-Control-Allow-Origin', $allowedOrigin);
            $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
        }

        $response = $response->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response = $response->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $response = $response->withHeader('Access-Control-Max-Age', '86400');
        return $response;
    }

    private function getAllowedOrigin(string $origin): ?string
    {
        if ($origin === '') {
            return null;
        }

        foreach ($this->allowedOrigins as $allowedOrigin) {
            if ($this->originMatches($origin, $allowedOrigin)) {
                return $allowedOrigin;
            }
        }

        return null;
    }

    private function originMatches(string $origin, string $allowedOrigin): bool
    {
        if ($allowedOrigin === '*') {
            return true;
        }

        return $origin === $allowedOrigin;
    }
}