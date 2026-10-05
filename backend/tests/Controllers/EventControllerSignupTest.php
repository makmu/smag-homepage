<?php

declare(strict_types=1);

namespace App\Tests\Controllers;

use App\Controllers\EventController;
use App\Database\Database;
use PDO;
use PDOException;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

final class EventControllerSignupTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/smag-signup-' . uniqid('', true) . '.sqlite';
        $this->db = new PDO('sqlite:' . $this->dbPath);
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        Database::initializeSchema($this->db);
    }

    protected function tearDown(): void
    {
        unset($this->db);

        foreach (glob($this->dbPath . '*') ?: [] as $file) {
            unlink($file);
        }
    }

    public function testSignupStoresExactlyOneRow(): void
    {
        $eventId = $this->createEvent(1);

        $response = $this->signup($this->controller(), $eventId, [
            'name' => 'Ada',
            'email' => 'ada@example.com',
        ]);

        $body = $this->body($response);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(1, $this->signupCount($eventId));
        $this->assertArrayHasKey('id', $body['data']);
        $this->assertSame(1, $this->signupCountFromOtherConnection($eventId));
    }

    public function testSignupIsRejectedWithConflictWhenLimitIsReached(): void
    {
        $eventId = $this->createEvent(1);
        $this->insertSignup($eventId, 'ada@example.com');

        $response = $this->signup($this->controller(), $eventId, [
            'name' => 'Grace',
            'email' => 'grace@example.com',
        ]);

        $this->assertSame(409, $response->getStatusCode());
        $this->assertSame('Signup limit reached', $this->body($response)['error']);
        $this->assertSame(1, $this->signupCount($eventId));

        // A leftover transaction would make this retry throw instead of returning 409.
        $retry = $this->signup($this->controller(), $eventId, [
            'name' => 'Grace',
            'email' => 'grace@example.com',
        ]);
        $this->assertSame(409, $retry->getStatusCode());
    }

    public function testSignupIsRejectedWithConflictForDuplicateEmail(): void
    {
        $eventId = $this->createEvent(null);

        $first = $this->signup($this->controller(), $eventId, [
            'name' => 'Ada',
            'email' => 'ada@example.com',
        ]);
        $second = $this->signup($this->controller(), $eventId, [
            'name' => 'Ada',
            'email' => 'ada@example.com',
        ]);

        $this->assertSame(200, $first->getStatusCode());
        $this->assertSame(409, $second->getStatusCode());
        $this->assertSame('You are already signed up for this event', $this->body($second)['error']);
        $this->assertSame(1, $this->signupCount($eventId));
    }

    public function testConcurrentSignupsDoNotExceedTheLimit(): void
    {
        $eventId = $this->createEvent(2);

        $statuses = $this->runSignupWorkers($eventId, [
            'race1@example.com',
            'race2@example.com',
            'race3@example.com',
            'race4@example.com',
            'race5@example.com',
            'race6@example.com',
        ]);

        $this->assertSame(2, count(array_filter($statuses, static fn (int $status) => $status === 200)));
        $this->assertSame(2, $this->signupCount($eventId));
    }

    public function testSignupsTableRejectsDuplicateEmailForSameEvent(): void
    {
        $eventId = $this->createEvent(null);
        $this->insertSignup($eventId, 'ada@example.com');

        $otherConnection = new PDO('sqlite:' . $this->dbPath);
        $otherConnection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $stmt = $otherConnection->prepare(
            'INSERT INTO signups (event_id, name, email, comment, created_at) VALUES (:event_id, :name, :email, NULL, :created_at)'
        );

        $this->expectException(PDOException::class);
        $this->expectExceptionMessageMatches('/UNIQUE constraint failed/');

        $stmt->execute([
            'event_id' => $eventId,
            'name' => 'Ada',
            'email' => 'ada@example.com',
            'created_at' => '2030-06-01T00:00:00+00:00',
        ]);
    }

    private function controller(?callable $mailer = null): EventController
    {
        return new EventController(
            $this->db,
            ['TURNSTILE_ENABLED' => false, 'TIMEZONE' => 'Europe/Berlin'],
            $mailer ?? static fn (string $email, string $subject, string $body): bool => true
        );
    }

    private function signup(EventController $controller, int $eventId, array $data): ResponseInterface
    {
        $request = (new ServerRequestFactory())
            ->createServerRequest('POST', '/api/v1/events/' . $eventId . '/signups')
            ->withParsedBody($data);

        return $controller->signup($request, new Response(), ['id' => $eventId]);
    }

    private function createEvent(?int $signupLimit): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO events (title, teaser, location, date, signup_type, signup_deadline, signup_limit,
             signup_instructions, description, created_at, updated_at)
             VALUES (:title, :teaser, :location, :date, :signup_type, NULL, :signup_limit, NULL,
             :description, :created_at, :updated_at)'
        );
        $stmt->execute([
            'title' => 'Sommerfest',
            'teaser' => 'Ein Fest',
            'location' => 'PLZ 12345',
            'date' => '2030-06-01T18:00:00',
            'signup_type' => 'on_site',
            'signup_limit' => $signupLimit,
            'description' => 'Beschreibung',
            'created_at' => '2030-01-01T00:00:00',
            'updated_at' => '2030-01-01T00:00:00',
        ]);

        return (int) $this->db->lastInsertId();
    }

    private function insertSignup(int $eventId, string $email): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO signups (event_id, name, email, comment, created_at) VALUES (:event_id, :name, :email, NULL, :created_at)'
        );
        $stmt->execute([
            'event_id' => $eventId,
            'name' => 'Ada',
            'email' => $email,
            'created_at' => '2030-06-01T00:00:00+00:00',
        ]);
    }

    private function runSignupWorkers(int $eventId, array $emails): array
    {
        $worker = __DIR__ . '/../Fixtures/signup-worker.php';
        $running = [];

        foreach ($emails as $email) {
            $pipes = [];
            $process = proc_open(
                [PHP_BINARY, $worker, $this->dbPath, (string) $eventId, $email],
                [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
                $pipes
            );
            $this->assertIsResource($process);
            $running[] = [$process, $pipes];
        }

        $statuses = [];
        foreach ($running as [$process, $pipes]) {
            $output = stream_get_contents($pipes[1]);
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);

            $this->assertSame(0, proc_close($process), $errors);
            $statuses[] = (int) $output;
        }

        return $statuses;
    }

    private function signupCount(int $eventId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM signups WHERE event_id = :event_id');
        $stmt->execute(['event_id' => $eventId]);

        return (int) $stmt->fetchColumn();
    }

    private function signupCountFromOtherConnection(int $eventId): int
    {
        $otherConnection = new PDO('sqlite:' . $this->dbPath);
        $stmt = $otherConnection->prepare('SELECT COUNT(*) FROM signups WHERE event_id = :event_id');
        $stmt->execute(['event_id' => $eventId]);

        return (int) $stmt->fetchColumn();
    }

    private function body(ResponseInterface $response): array
    {
        return json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
    }
}
