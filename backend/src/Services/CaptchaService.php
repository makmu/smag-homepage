<?php

declare(strict_types=1);

namespace App\Services;

interface CaptchaService
{
    public function verify(string $token): bool;
}