<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database\Database;
use App\Services\MailService;
use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class EventController
{
    private const VALID_SIGNUP_TYPES = ['none', 'on_site', 'special'];
    private const REQUIRED_FIELDS = ['title', 'teaser', 'location', 'date', 'description', 'signup_type'];
    private const REQUIRED_SIGNUP_FIELDS = ['name', 'email'];

    private function getDb(): PDO
    {
        return Database::getConnection();
    }

    private function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    private function formatDateInLocalTime(string $isoDate, array $config): string
    {
        $timezone = new \DateTimeZone($config['TIMEZONE'] ?? 'UTC');
        $dateTime = new \DateTime($isoDate, new \DateTimeZone('UTC'));
        $dateTime->setTimezone($timezone);
        return $dateTime->format('d.m.Y H:i');
    }

    public function signup(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $eventId = (int) $args['id'];
        $data = $request->getParsedBody();

        $event = $this->getEventById($eventId);

        if ($event === null) {
            return $this->errorResponse($response, 404, 'Event not found');
        }

        if (($event['signup_type'] ?? 'none') !== 'on_site') {
            return $this->errorResponse($response, 400, 'Signup not available for this event');
        }

        if (!empty($event['signup_deadline'])) {
            $deadline = new \DateTime($event['signup_deadline']);
            $now = new \DateTime();
            if ($now > $deadline) {
                return $this->errorResponse($response, 400, 'Signup deadline has passed');
            }
        }

        $signupCount = $this->getSignupCount($eventId);

        if (!empty($event['signup_limit'])) {
            if ($signupCount >= $event['signup_limit']) {
                return $this->errorResponse($response, 400, 'Signup limit reached');
            }
        }

        $missingFields = [];
        foreach (self::REQUIRED_SIGNUP_FIELDS as $field) {
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

        if ($this->hasSignupByEmail($eventId, $data['email'])) {
            return $this->errorResponse($response, 400, 'You are already signed up for this event');
        }

        $name = htmlspecialchars(strip_tags(trim($data['name'])));
        $email = htmlspecialchars(strip_tags(trim($data['email'])));
        $comment = isset($data['comment']) ? htmlspecialchars(strip_tags(trim($data['comment']))) : null;
        $createdAt = (new \DateTime())->format(\DateTime::ATOM);

        $stmt = $this->getDb()->prepare(
            'INSERT INTO signups (event_id, name, email, comment, created_at) VALUES (:event_id, :name, :email, :comment, :created_at)'
        );
        $stmt->execute([
            'event_id' => $eventId,
            'name' => $name,
            'email' => $email,
            'comment' => $comment,
            'created_at' => $createdAt,
        ]);

        $signupId = (int) $this->getDb()->lastInsertId();

        $mailService = new MailService();
        $config = $this->getConfig();
        $subject = 'Anmeldung für ' . $event['title'];
        $body = 'Hallo ' . $name . ',' . PHP_EOL . PHP_EOL;
        $body .= 'Du hast dich erfolgreich für "' . $event['title'] . '" angemeldet.' . PHP_EOL;
        $body .= 'Datum: ' . $this->formatDateInLocalTime($event['date'], $config) . PHP_EOL;
        $body .= 'Ort: ' . $event['location'] . PHP_EOL . PHP_EOL;
        $body .= 'Wir freuen uns auf dich!';
        $mailService->send($email, $subject, $body);

        return $this->successResponse($response, [
            'id' => $signupId,
            'event_id' => $eventId,
            'name' => $name,
            'comment' => $comment,
            'created_at' => $createdAt,
        ]);
    }

    public function getEvents(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $stmt = $this->getDb()->query(
            'SELECT id, title, teaser, location, date, signup_deadline, signup_limit FROM events ORDER BY date ASC'
        );
        $events = $stmt->fetchAll();

        $items = array_map(function($e) {
            $item = [
                'id' => (int) $e['id'],
                'title' => $e['title'],
                'teaser' => $e['teaser'],
                'location' => $e['location'],
                'date' => $e['date'],
            ];
            if ($e['signup_deadline'] !== null) {
                $item['signup_deadline'] = $e['signup_deadline'];
            }
            if ($e['signup_limit'] !== null) {
                $item['signup_limit'] = (int) $e['signup_limit'];
            }
            return $item;
        }, $events);

        $data = ['data' => ['items' => $items]];
        $response->getBody()->write(json_encode($data));
        return $response;
    }

    public function getEvent(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $event = $this->getEventById($id);

        if ($event === null) {
            $data = ['data' => null, 'error' => 'Event not found'];
            $response = $response->withStatus(404);
        } else {
            $signups = $this->getSignupsByEventId($id);

            $event['signups'] = array_map(fn($s) => [
                'id' => $s['id'],
                'name' => $s['name'],
                'comment' => $s['comment'],
            ], $signups);

            $data = ['data' => $event];
        }

        $response->getBody()->write(json_encode($data));
        return $response;
    }

    public function createEvent(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        $validationError = $this->validateEventData($data);
        if ($validationError !== null) {
            return $this->errorResponse($response, 400, $validationError);
        }

        $signupFields = $this->processSignupFields($data);
        $now = (new \DateTime())->format(\DateTime::ATOM);

        $stmt = $this->getDb()->prepare(
            'INSERT INTO events (title, teaser, location, date, signup_type, signup_deadline, signup_limit, signup_instructions, description, created_at, updated_at)
             VALUES (:title, :teaser, :location, :date, :signup_type, :signup_deadline, :signup_limit, :signup_instructions, :description, :created_at, :updated_at)'
        );

        $stmt->execute([
            'title' => $data['title'],
            'teaser' => $data['teaser'],
            'location' => $data['location'],
            'date' => $data['date'],
            'signup_type' => $data['signup_type'],
            'signup_deadline' => $signupFields['signup_deadline'],
            'signup_limit' => $signupFields['signup_limit'],
            'signup_instructions' => $signupFields['signup_instructions'],
            'description' => $data['description'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $eventId = (int) $this->getDb()->lastInsertId();
        $event = $this->getEventById($eventId);

        return $this->successResponse($response, $event);
    }

    public function updateEvent(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $data = $request->getParsedBody();

        $event = $this->getEventById($id);

        if ($event === null) {
            return $this->errorResponse($response, 404, 'Event not found');
        }

        $validationError = $this->validateEventData($data);
        if ($validationError !== null) {
            return $this->errorResponse($response, 400, $validationError);
        }

        $signupFields = $this->processSignupFields($data);
        $now = (new \DateTime())->format(\DateTime::ATOM);

        $stmt = $this->getDb()->prepare(
            'UPDATE events SET title = :title, teaser = :teaser, location = :location, date = :date,
             signup_type = :signup_type, signup_deadline = :signup_deadline, signup_limit = :signup_limit,
             signup_instructions = :signup_instructions, description = :description, updated_at = :updated_at
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $id,
            'title' => $data['title'],
            'teaser' => $data['teaser'],
            'location' => $data['location'],
            'date' => $data['date'],
            'signup_type' => $data['signup_type'],
            'signup_deadline' => $signupFields['signup_deadline'],
            'signup_limit' => $signupFields['signup_limit'],
            'signup_instructions' => $signupFields['signup_instructions'],
            'description' => $data['description'],
            'updated_at' => $now,
        ]);

        $event = $this->getEventById($id);

        return $this->successResponse($response, $event);
    }

    private function getEventById(int $id): ?array
    {
        $stmt = $this->getDb()->prepare('SELECT * FROM events WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $event = $stmt->fetch();

        if ($event === false) {
            return null;
        }

        $event['id'] = (int) $event['id'];
        if ($event['signup_limit'] !== null) {
            $event['signup_limit'] = (int) $event['signup_limit'];
        }

        return $event;
    }

    private function getSignupsByEventId(int $eventId): array
    {
        $stmt = $this->getDb()->prepare('SELECT id, name, comment FROM signups WHERE event_id = :event_id');
        $stmt->execute(['event_id' => $eventId]);
        $signups = $stmt->fetchAll();

        return array_map(function($s) {
            $s['id'] = (int) $s['id'];
            return $s;
        }, $signups);
    }

    private function getSignupCount(int $eventId): int
    {
        $stmt = $this->getDb()->prepare('SELECT COUNT(*) as count FROM signups WHERE event_id = :event_id');
        $stmt->execute(['event_id' => $eventId]);
        $result = $stmt->fetch();
        return (int) $result['count'];
    }

    private function hasSignupByEmail(int $eventId, string $email): bool
    {
        $stmt = $this->getDb()->prepare('SELECT COUNT(*) as count FROM signups WHERE event_id = :event_id AND email = :email');
        $stmt->execute(['event_id' => $eventId, 'email' => $email]);
        $result = $stmt->fetch();
        return (int) $result['count'] > 0;
    }

    private function validateEventData(array $data): ?string
    {
        $missingFields = [];
        foreach (self::REQUIRED_FIELDS as $field) {
            if (empty($data[$field])) {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return 'Missing required fields: ' . implode(', ', $missingFields);
        }

        if (!in_array($data['signup_type'], self::VALID_SIGNUP_TYPES, true)) {
            return 'Invalid signup_type';
        }

        return null;
    }

    private function processSignupFields(array $data): array
    {
        $signupDeadline = null;
        if ($data['signup_type'] === 'on_site' && !empty($data['signup_deadline'])) {
            $signupDeadline = $data['signup_deadline'];
        }

        $signupLimit = null;
        if ($data['signup_type'] === 'on_site' && isset($data['signup_limit']) && is_numeric($data['signup_limit'])) {
            $signupLimit = (int) $data['signup_limit'];
        }

        $signupInstructions = null;
        if ($data['signup_type'] === 'special' && !empty($data['signup_instructions'])) {
            $signupInstructions = $data['signup_instructions'];
        }

        return [
            'signup_deadline' => $signupDeadline,
            'signup_limit' => $signupLimit,
            'signup_instructions' => $signupInstructions,
        ];
    }

    private function successResponse(ResponseInterface $response, array $data): ResponseInterface
    {
        $response->getBody()->write(json_encode(['data' => $data, 'error' => null]));
        return $response;
    }

    private function errorResponse(ResponseInterface $response, int $status, string $message): ResponseInterface
    {
        $response = $response->withStatus($status);
        $response->getBody()->write(json_encode(['data' => null, 'error' => $message]));
        return $response;
    }

    public function getSignupDetail(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $eventId = (int) $args['eventId'];
        $signupId = (int) $args['signupId'];

        $event = $this->getEventById($eventId);
        if ($event === null) {
            return $this->errorResponse($response, 404, 'Event not found');
        }

        $signup = $this->getSignupById($signupId, $eventId);
        if ($signup === null) {
            return $this->errorResponse($response, 404, 'Signup not found');
        }

        return $this->successResponse($response, $signup);
    }

    public function deleteSignup(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $eventId = (int) $args['eventId'];
        $signupId = (int) $args['signupId'];

        $event = $this->getEventById($eventId);
        if ($event === null) {
            return $this->errorResponse($response, 404, 'Event not found');
        }

        $signup = $this->getSignupById($signupId, $eventId);
        if ($signup === null) {
            return $this->errorResponse($response, 404, 'Signup not found');
        }

        $stmt = $this->getDb()->prepare('DELETE FROM signups WHERE id = :id AND event_id = :event_id');
        $stmt->execute(['id' => $signupId, 'event_id' => $eventId]);

        return $this->successResponse($response, ['deleted' => true]);
    }

    private function getSignupById(int $signupId, int $eventId): ?array
    {
        $stmt = $this->getDb()->prepare('SELECT id, name, email, comment, created_at FROM signups WHERE id = :id AND event_id = :event_id');
        $stmt->execute(['id' => $signupId, 'event_id' => $eventId]);
        $signup = $stmt->fetch();

        if ($signup === false) {
            return null;
        }

        return [
            'id' => (int) $signup['id'],
            'name' => $signup['name'],
            'email' => $signup['email'],
            'comment' => $signup['comment'],
            'created_at' => $signup['created_at'],
        ];
    }

    public function downloadSignupsCsv(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {

        $eventId = (int) $args['id'];
        $event = $this->getEventById($eventId);

        if ($event === null) {
            return $this->errorResponse($response, 404, 'Event not found');
        }

        $signups = $this->getSignupsForCsv($eventId);

        if (empty($signups)) {
            return $this->errorResponse($response, 404, 'No signups found for this event');
        }

        $csvData = $this->buildCsvData($signups);
        
        $filename = 'anmeldungen_event_' . $eventId . '_' . date('Y-m-d') . '.csv';
        
        $response = $response
            ->withHeader('Content-Type', 'text/csv; charset=utf-8')
            ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"');
        
        $response->getBody()->write($csvData);
        return $response;
    }

    private function getSignupsForCsv(int $eventId): array
    {
        $stmt = $this->getDb()->prepare('SELECT name, email, comment, created_at FROM signups WHERE event_id = :event_id ORDER BY created_at ASC');
        $stmt->execute(['event_id' => $eventId]);
        return $stmt->fetchAll();
    }

    private function validateToken(string $authHeader): bool
    {
        if (!str_starts_with($authHeader, 'Bearer ')) {
            return false;
        }
        
        $token = substr($authHeader, 7);
        
        try {
            $decoded = base64_decode($token);
            if ($decoded === false) {
                return false;
            }
            $parts = explode(':', $decoded);
            if (count($parts) !== 2) {
                return false;
            }
            $username = $parts[0];
            
            $users = [
                'admin' => 'password123',
                'smag' => 'fliederlich',
            ];
            
            return isset($users[$username]);
        } catch (\Exception $e) {
            return false;
        }
    }

    private function buildCsvData(array $signups): string
    {
        $headers = ['Name', 'E-Mail', 'Kommentar', 'Anmeldezeitpunkt'];
        $rows = [];
        
        foreach ($signups as $signup) {
            $rows[] = [
                $signup['name'],
                $signup['email'],
                $signup['comment'] ?? '',
                $signup['created_at'],
            ];
        }
        
        $output = fopen('php://temp', 'r+');
        
        fputcsv($output, $headers, ';');
        
        foreach ($rows as $row) {
            fputcsv($output, $row, ';');
        }
        
        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);
        
        return "\xEF\xBB\xBF" . $content;
    }
}
