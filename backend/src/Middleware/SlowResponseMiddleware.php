<?php

declare(strict_types=1);

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class SlowResponseMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly int $delayMs = 0
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($this->delayMs > 0) {
            usleep($this->delayMs * 1000);
        }

        return $handler->handle($request);
    }
}
