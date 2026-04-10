<?php

declare(strict_types=1);

namespace App\Services;

use App\Database\Database;
use PDO;

final class FileService
{
    private const ALLOWED_MIMES = ['image/jpeg', 'image/png'];
    private const MAX_SIZE = 1048576;

    public function getUploadPath(): string
    {
        return dirname(__DIR__, 2) . '/data/uploads';
    }

    public function ensureUploadDir(): void
    {
        $path = $this->getUploadPath();
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
    }

    public function validateFile(array $file): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return 'File upload failed with error code: ' . $file['error'];
        }

        if ($file['size'] > self::MAX_SIZE) {
            return 'File size exceeds 1 MiB limit';
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, self::ALLOWED_MIMES, true)) {
            return 'Only JPEG and PNG images are allowed';
        }

        return null;
    }

    public function saveFile(array $file): ?array
    {
        $this->ensureUploadDir();

        $error = $this->validateFile($file);
        if ($error !== null) {
            return null;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        $extension = $mimeType === 'image/jpeg' ? 'jpg' : 'png';
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        $targetPath = $this->getUploadPath() . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return null;
        }

        $db = $this->getDb();
        $now = (new \DateTime())->format(\DateTime::ATOM);

        $stmt = $db->prepare(
            'INSERT INTO media (filename, mime_type, created_at) VALUES (:filename, :mime_type, :created_at)'
        );
        $stmt->execute([
            'filename' => $filename,
            'mime_type' => $mimeType,
            'created_at' => $now,
        ]);

        $mediaId = (int) $db->lastInsertId();

        return [
            'id' => $mediaId,
            'filename' => $filename,
            'mime_type' => $mimeType,
        ];
    }

    public function getMediaById(int $id): ?array
    {
        $stmt = $this->getDb()->prepare('SELECT id, filename, mime_type, created_at FROM media WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $media = $stmt->fetch();

        if ($media === false) {
            return null;
        }

        return [
            'id' => (int) $media['id'],
            'filename' => $media['filename'],
            'mime_type' => $media['mime_type'],
            'created_at' => $media['created_at'],
        ];
    }

    public function getFilePath(int $id): ?string
    {
        $media = $this->getMediaById($id);
        if ($media === null) {
            return null;
        }

        $path = $this->getUploadPath() . '/' . $media['filename'];
        if (!file_exists($path)) {
            return null;
        }

        return $path;
    }

    private function getDb(): PDO
    {
        return Database::getConnection();
    }
}