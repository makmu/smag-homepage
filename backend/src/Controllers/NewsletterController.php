<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\TurnstileService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class NewsletterController
{
    private const REQUIRED_FIELDS = ['email', 'action'];

    private function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    public function subscribe(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return $this->handleSubscription($request, $response, 'subscribe');
    }

    public function unsubscribe(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return $this->handleSubscription($request, $response, 'unsubscribe');
    }

    private function handleSubscription(ServerRequestInterface $request, ResponseInterface $response, string $action): ResponseInterface
    {
        $data = $request->getParsedBody();
        $config = $this->getConfig();

        if ($config['TURNSTILE_ENABLED'] ?? false) {
            $turnstileService = new TurnstileService();
            $token = $data['cf_turnstile_token'] ?? '';
            if (!$turnstileService->verify($token)) {
                return $this->errorResponse($response, 400, 'Ein Fehler ist aufgetreten. Bitte wende dich an smag@fliederlich.de.');
            }
        }

        $missingFields = [];
        foreach (self::REQUIRED_FIELDS as $field) {
            if (empty($data[$field])) {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return $this->errorResponse($response, 400, 'Missing required fields: ' . implode(', ', $missingFields));
        }

        $email = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
        if (!$email) {
            return $this->errorResponse($response, 400, 'Ungültige E-Mail-Adresse');
        }

        $emailConfirmation = trim($data['email_confirmation'] ?? '');
        if (!filter_var($emailConfirmation, FILTER_VALIDATE_EMAIL) || $email !== $emailConfirmation) {
            return $this->errorResponse($response, 400, 'E-Mail-Adressen stimmen nicht überein');
        }

        $listEmail = $config['IONOS_MAILING_LIST_EMAIL'] ?? '';
        $endpoint = $config['IONOS_MAILING_LIST_ENDPOINT'] ?? '';

        if (empty($listEmail) || empty($endpoint)) {
            return $this->errorResponse($response, 500, 'Newsletter-Dienst ist nicht konfiguriert.');
        }

        $subscriptionAction = $action === 'subscribe' ? 'subscribe' : 'unsubscribe';

        $result = $this->callIonosApi($endpoint, $email, $email, $subscriptionAction, $listEmail);

        if ($result['success']) {
            if ($action === 'subscribe') {
                return $this->successResponse($response, ['message' => 'Du hast dich erfolgreich für den Newsletter angemeldet. Bitte bestätige die Anmeldung über den Link in der Bestätigungs-E-Mail, die wir dir gerade gesendet haben.']);
            } else {
                return $this->successResponse($response, ['message' => 'Du wurdest erfolgreich vom Newsletter abgemeldet.']);
            }
        }

        return $this->errorResponse($response, 400, $result['error'] ?? 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
    }

    private function callIonosApi(string $endpoint, string $email, string $emailConfirmation, string $action, string $listEmail): array
    {
        $postFields = [
            'mailaccount_r' => $email,
            'mailaccount2_r' => $emailConfirmation,
            'subscribe_r' => $action,
            'FBMLNAME' => $listEmail,
            'FBLANG' => 'de',
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            return ['success' => false, 'error' => 'Verbindung zum Newsletter-Dienst fehlgeschlagen.'];
        }

        if ($httpCode >= 200 && $httpCode < 400) {
            if (strpos($response, 'error') !== false || strpos($response, 'Error') !== false) {
                if (strpos($response, 'bereits') !== false || strpos($response, 'already') !== false) {
                    return ['success' => false, 'error' => 'Diese E-Mail-Adresse ist bereits für den Newsletter registriert.'];
                }
                return ['success' => false, 'error' => 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.'];
            }
            return ['success' => true];
        }

        return ['success' => false, 'error' => 'Der Newsletter-Dienst antwortet nicht.'];
    }

    private function successResponse(ResponseInterface $response, array $data): ResponseInterface
    {
        $response = $response->withHeader('Content-Type', 'application/json');
        $response->getBody()->write(json_encode(['data' => $data, 'error' => null]));
        return $response;
    }

    private function errorResponse(ResponseInterface $response, int $status, string $message): ResponseInterface
    {
        $response = $response->withStatus($status)->withHeader('Content-Type', 'application/json');
        $response->getBody()->write(json_encode(['data' => null, 'error' => $message]));
        return $response;
    }
}