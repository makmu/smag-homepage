<?php

declare(strict_types=1);

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

final class MailService
{
    private function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    public function send(string $toEmail, string $subject, string $body): bool
    {
        $config = $this->getConfig();

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = $config['SMTP_HOST'];
            $mail->Username = $config['SMTP_USERNAME'];
            $mail->Password = $config['SMTP_PASSWORD'];
            $mail->SMTPAuth = true;
            $mail->SMTPSecure = $config['SMTP_ENCRYPTION'];
            $mail->Port = $config['SMTP_PORT'];
            $mail->setFrom($config['SMTP_FROM_EMAIL'], $config['SMTP_FROM_NAME']);
            $mail->addAddress($toEmail);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->isHTML(false);
            $mail->CharSet = 'UTF-8';

            $mail->send();
            return true;
        } catch (Exception) {
            return false;
        }
    }
}
