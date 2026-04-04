<?php

declare(strict_types=1);

namespace App\Services;

final class TurnstileService implements CaptchaService
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    private function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    public function verify(string $token, ?string $ip = null): bool
    {
        $config = $this->getConfig();

        if (!($config['TURNSTILE_ENABLED'] ?? false)) {
            return true;
        }

        $secretKey = $config['TURNSTILE_SECRET_KEY'] ?? '';

        if (empty($secretKey) || empty($token)) {
            return false;
        }

        if ($ip === null) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        }

        $data = [
            'secret' => $secretKey,
            'response' => $token,
        ];

        if ($ip !== null) {
            $data['remoteip'] = $ip;
        }

        $ch = curl_init(self::VERIFY_URL);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            return false;
        }

        $result = json_decode($response, true);

        return ($result['success'] ?? false) === true;
    }
}