<?php

declare(strict_types=1);

namespace App\Database;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $pdo = null;

    private static function getConfig(): array
    {
        return require __DIR__ . '/../../config.php';
    }

    public static function getConnection(): PDO
    {
        if (self::$pdo === null) {
            self::$pdo = self::createConnection();
        }

        return self::$pdo;
    }

    private static function createConnection(): PDO
    {
        $config = self::getConfig();
        $dbPath = $config['DB_PATH'];

        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        self::initializeSchema($pdo);

        return $pdo;
    }

    private static function initializeSchema(PDO $pdo): void
    {
        $pdo->exec('
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                teaser TEXT NOT NULL,
                location TEXT NOT NULL,
                date TEXT NOT NULL,
                signup_type TEXT NOT NULL DEFAULT \'none\',
                signup_deadline TEXT,
                signup_limit INTEGER,
                signup_instructions TEXT,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ');

        $pdo->exec('
            CREATE TABLE IF NOT EXISTS signups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                comment TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )
        ');

        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_signups_event_id ON signups(event_id)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)');

        $pdo->exec('
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT \'admin\',
                image_url TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),
                updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))
            )
        ');

        try {
            $pdo->exec('ALTER TABLE users ADD COLUMN image_url TEXT');
        } catch (PDOException $e) {
        }

        $pdo->exec('
            CREATE TABLE IF NOT EXISTS tokens (
                token CHAR(64) NOT NULL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                role VARCHAR(50) NOT NULL,
                type TEXT NOT NULL CHECK(type IN (\'access\', \'refresh\')),
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ');

        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_tokens_expires ON tokens(expires_at)');

        $pdo->exec('
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thumbnail_url TEXT NOT NULL,
                title TEXT NOT NULL,
                caption TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ');

        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date)');

        $pdo->exec('
            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ');
    }

    public static function resetConnection(): void
    {
        self::$pdo = null;
    }
}
