<?php

declare(strict_types=1);

// Issues a single signup request against a shared database file, so tests can
// run several of these processes in parallel to exercise the signup race.

require __DIR__ . '/../../vendor/autoload.php';

use App\Controllers\EventController;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

if ($argc < 4) {
    fwrite(STDERR, "usage: signup-worker.php <db-path> <event-id> <email>\n");
    exit(2);
}

[, $dbPath, $eventId, $email] = $argv;

$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$controller = new EventController(
    $db,
    ['TURNSTILE_ENABLED' => false, 'TIMEZONE' => 'Europe/Berlin'],
    static fn (string $to, string $subject, string $body): bool => true
);

$request = (new ServerRequestFactory())
    ->createServerRequest('POST', '/api/v1/events/' . $eventId . '/signups')
    ->withParsedBody(['name' => 'Race', 'email' => $email]);

$response = $controller->signup($request, new Response(), ['id' => (int) $eventId]);

echo $response->getStatusCode();
