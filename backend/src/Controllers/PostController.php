<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database\Database;
use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class PostController
{
    private const REQUIRED_FIELDS = ['thumbnail_url', 'title', 'caption', 'date'];

    private function getDb(): PDO
    {
        return Database::getConnection();
    }

    public function getPosts(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $page = isset($queryParams['page']) ? (int) $queryParams['page'] : 1;
        $limit = isset($queryParams['limit']) ? (int) $queryParams['limit'] : 20;

        $page = max(1, $page);
        $limit = max(1, min(100, $limit));

        $offset = ($page - 1) * $limit;

        $countStmt = $this->getDb()->prepare('SELECT COUNT(*) as total FROM posts');
        $countStmt->execute();
        $total = (int) $countStmt->fetch()['total'];

        $stmt = $this->getDb()->prepare(
            'SELECT id, thumbnail_url, title, caption, date FROM posts ORDER BY date DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $posts = $stmt->fetchAll();

        $items = array_map(function($p) {
            return [
                'id' => (int) $p['id'],
                'thumbnail_url' => $p['thumbnail_url'],
                'title' => $p['title'],
                'caption' => $p['caption'],
                'date' => $p['date'],
            ];
        }, $posts);

        $data = [
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ]
        ];

        return $this->successResponse($response, $data);
    }

    public function createPost(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        $validationError = $this->validatePostData($data);
        if ($validationError !== null) {
            return $this->errorResponse($response, 400, $validationError);
        }

        $now = (new \DateTime())->format(\DateTime::ATOM);

        $stmt = $this->getDb()->prepare(
            'INSERT INTO posts (thumbnail_url, title, caption, date, created_at, updated_at)
             VALUES (:thumbnail_url, :title, :caption, :date, :created_at, :updated_at)'
        );

        $stmt->execute([
            'thumbnail_url' => $data['thumbnail_url'],
            'title' => $data['title'],
            'caption' => $data['caption'],
            'date' => $data['date'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $postId = (int) $this->getDb()->lastInsertId();
        $post = $this->getPostById($postId);

        return $this->successResponse($response, $post);
    }

    public function updatePost(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $data = $request->getParsedBody();

        $post = $this->getPostById($id);

        if ($post === null) {
            return $this->errorResponse($response, 404, 'Post not found');
        }

        $validationError = $this->validatePostData($data);
        if ($validationError !== null) {
            return $this->errorResponse($response, 400, $validationError);
        }

        $now = (new \DateTime())->format(\DateTime::ATOM);

        $stmt = $this->getDb()->prepare(
            'UPDATE posts SET thumbnail_url = :thumbnail_url, title = :title, caption = :caption, date = :date, updated_at = :updated_at WHERE id = :id'
        );

        $stmt->execute([
            'id' => $id,
            'thumbnail_url' => $data['thumbnail_url'],
            'title' => $data['title'],
            'caption' => $data['caption'],
            'date' => $data['date'],
            'updated_at' => $now,
        ]);

        $post = $this->getPostById($id);

        return $this->successResponse($response, $post);
    }

    private function getPostById(int $id): ?array
    {
        $stmt = $this->getDb()->prepare('SELECT id, thumbnail_url, title, caption, date, created_at, updated_at FROM posts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch();

        if ($post === false) {
            return null;
        }

        return [
            'id' => (int) $post['id'],
            'thumbnail_url' => $post['thumbnail_url'],
            'title' => $post['title'],
            'caption' => $post['caption'],
            'date' => $post['date'],
            'created_at' => $post['created_at'],
            'updated_at' => $post['updated_at'],
        ];
    }

    private function validatePostData(array $data): ?string
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

        return null;
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
}