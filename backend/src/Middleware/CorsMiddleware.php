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
            if ($allowedOrigin !== '*') {
                $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
            }
            $response = $response->withHeader('Vary', 'Origin');
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

        $normalizedOrigin = $this->normalizeOrigin($origin);

        foreach ($this->allowedOrigins as $allowedOrigin) {
            if ($this->originMatches($normalizedOrigin, $allowedOrigin)) {
                return $allowedOrigin;
            }
        }

        return null;
    }

    private function originMatches(string $normalizedOrigin, string $allowedOrigin): bool
    {
        if ($allowedOrigin === '*') {
            return true;
        }

        return $normalizedOrigin === $this->normalizeOrigin($allowedOrigin);
    }

    private function normalizeOrigin(string $origin): string
    {
        $parsed = parse_url($origin);
        if ($parsed === false) {
            return $origin;
        }

        $scheme = strtolower($parsed['scheme'] ?? '');
        $host = strtolower($parsed['host'] ?? '');
        $port = $parsed['port'] ?? null;

        $normalized = $scheme . '://' . $host;
        if ($port !== null) {
            $normalized .= ':' . $port;
        }

        return $normalized;
    }
}