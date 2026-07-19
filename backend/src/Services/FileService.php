<?php

declare(strict_types=1);

namespace App\Services;

use App\Database\Database;
use PDO;

final class FileService
{
    private const ALLOWED_MIMES = ['image/jpeg', 'image/png'];
    private const MAX_SIZE = 1048576;

    private static function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    public function getUploadPath(): string
    {
        $config = self::getConfig();
        return $config['UPLOAD_PATH'];
    }

    public function ensureUploadDir(): void
    {
        $path = $this->getUploadPath();
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
    }

    public function ensureThumbsDir(): void
    {
        $path = $this->getUploadPath() . '/thumbs';
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

        $config = self::getConfig();
        $this->ensureThumbsDir();
        $thumbPath = $this->getUploadPath() . '/thumbs/' . $filename;
        $this->generateThumbnail($targetPath, $thumbPath, $config['THUMBNAIL_WIDTH'], $config['THUMBNAIL_QUALITY']);

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

        return $this->getFilePathForMedia($media);
    }

    public function getFilePathForMedia(array $media): ?string
    {
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

    public function getThumbnailPath(int $id): ?string
    {
        $media = $this->getMediaById($id);
        if ($media === null) {
            return null;
        }

        return $this->getThumbnailPathForMedia($media);
    }

    public function getThumbnailPathForMedia(array $media): ?string
    {
        $path = $this->getUploadPath() . '/thumbs/' . $media['filename'];
        if (!file_exists($path)) {
            return null;
        }

        return $path;
    }

    private function generateThumbnail(string $sourcePath, string $targetPath, int $width, int $quality): void
    {
        $imageInfo = @getimagesize($sourcePath);
        if ($imageInfo === false) {
            return;
        }

        [$origWidth, $origHeight, $type] = $imageInfo;

        if ($origWidth <= $width) {
            copy($sourcePath, $targetPath);
            return;
        }

        $ratio = $width / $origWidth;
        $height = (int) ($origHeight * $ratio);

        $source = match ($type) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($sourcePath),
            IMAGETYPE_PNG => imagecreatefrompng($sourcePath),
            default => null,
        };

        if ($source === null) {
            return;
        }

        $thumb = imagecreatetruecolor($width, $height);

        if ($type === IMAGETYPE_PNG) {
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
        }

        imagecopyresampled($thumb, $source, 0, 0, 0, 0, $width, $height, $origWidth, $origHeight);

        match ($type) {
            IMAGETYPE_JPEG => imagejpeg($thumb, $targetPath, $quality),
            IMAGETYPE_PNG => imagepng($thumb, $targetPath),
        };

        imagedestroy($source);
        imagedestroy($thumb);
    }
}