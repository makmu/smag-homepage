<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\FileService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class MediaController
{
    private FileService $fileService;

    public function __construct()
    {
        $this->fileService = new FileService();
    }

    public function upload(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $contentType = $request->getHeaderLine('Content-Type');

        if (!str_contains($contentType, 'multipart/form-data')) {
            return $this->errorResponse($response, 400, 'Content-Type must be multipart/form-data');
        }

        $uploadedFiles = $request->getUploadedFiles();

        if (empty($uploadedFiles['file'])) {
            return $this->errorResponse($response, 400, 'No file uploaded');
        }

        $file = $uploadedFiles['file'];

        if ($file->getError() !== UPLOAD_ERR_OK) {
            return $this->errorResponse($response, 400, 'File upload failed');
        }

        $tmpPath = $file->getStream()->getMetadata('uri');
        $fileData = [
            'tmp_name' => $tmpPath,
            'name' => $file->getClientFilename(),
            'type' => $file->getClientMediaType(),
            'size' => $file->getSize(),
            'error' => $file->getError(),
        ];

        $result = $this->fileService->saveFile($fileData);

        if ($result === null) {
            return $this->errorResponse($response, 400, 'Failed to save file');
        }

        $data = [
            'id' => $result['id'],
            'url' => '/api/v1/media/' . $result['id'],
            'filename' => $result['filename'],
        ];

        return $this->successResponse($response, $data);
    }

    public function serve(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];

        $filePath = $this->fileService->getFilePath($id);

        if ($filePath === null) {
            return $response->withStatus(404);
        }

        $media = $this->fileService->getMediaById($id);

        if ($media === null) {
            return $response->withStatus(404);
        }

        $response = $response->withHeader('Content-Type', $media['mime_type']);
        $response = $response->withHeader('Cache-Control', 'public, max-age=31536000');

        $response->getBody()->write(file_get_contents($filePath));

        return $response;
    }

    private function successResponse(ResponseInterface $response, array $data): ResponseInterface
    {
        $response->getBody()->write(json_encode(['data' => $data, 'error' => null]));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function errorResponse(ResponseInterface $response, int $status, string $message): ResponseInterface
    {
        $response = $response->withStatus($status);
        $response->getBody()->write(json_encode(['data' => null, 'error' => $message]));
        return $response->withHeader('Content-Type', 'application/json');
    }
}