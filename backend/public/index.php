<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Middleware\ApiResponseMiddleware;
use App\Middleware\CorsMiddleware;
use App\Middleware\SlowResponseMiddleware;
use Slim\Factory\AppFactory;

$config = require_once __DIR__ . '/../config.php';

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->add(new CorsMiddleware());
$app->add(new ApiResponseMiddleware());

if (($config['SLOW_MODE_DELAY'] ?? 0) > 0) {
    $app->add(new SlowResponseMiddleware((int) $config['SLOW_MODE_DELAY']));
}

$routes = require_once __DIR__ . '/../src/routes.php';
$routes($app);

$app->run(); // <-- replaces all the manual request/response code