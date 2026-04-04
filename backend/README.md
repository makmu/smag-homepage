# Server Setup Guide

This guide describes how to configure and manage the backend on the server after deployment.

## Configuration

The backend is configured via `backend/config.php`. This file is created from `config.php.template` on first deployment and preserved between deployments.

### Editing Configuration

```bash
cd ~/smag/.deployments-X/backend
vi config.php
```

### Available Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `DB_PATH` | `__DIR__ . '/../data/database.sqlite'` | Absolute path to SQLite database (derived from config.php location) |
| `ACCESS_TOKEN_TTL` | `900` | Access token lifetime in seconds (15 minutes) |
| `REFRESH_TOKEN_TTL` | `2592000` | Refresh token lifetime in seconds (30 days) |
| `SLOW_MODE_DELAY` | `0` | Artificial delay in seconds for testing |
| `TIMEZONE` | `Europe/Berlin` | PHP timezone for date handling |
| `SMTP_FROM_EMAIL` | `noreply@smag.example` | From email for outgoing mail |
| `SMTP_FROM_NAME` | `SMAG Anmeldung` | From name for outgoing mail |
| `SMTP_HOST` | `smtp.example.com` | SMTP server hostname |
| `SMTP_USERNAME` | `your-smtp-username` | SMTP authentication username |
| `SMTP_PASSWORD` | `your-smtp-password` | SMTP authentication password |
| `SMTP_PORT` | `587` | SMTP server port |
| `TURNSTILE_ENABLED` | `false` | Enable Cloudflare Turnstile captcha for event signups |
| `TURNSTILE_SITE_KEY` | `''` | Cloudflare Turnstile site key (get from Cloudflare dashboard) |
| `TURNSTILE_SECRET_KEY` | `''` | Cloudflare Turnstile secret key (get from Cloudflare dashboard) |

## Seeding the Database

After your first deployment, create an admin user:

```bash
cd ~/smag/.deployments-X/backend
php seed.php --email admin@example.com --name "Your Name" --password "your-password-min-8-chars"
```

If the default `php` command doesn't work (some hosts have separate CGI/CLI binaries), try:

```bash
php8.5-cli seed.php --email admin@example.com --name "Your Name" --password "your-password-min-8-chars"
```

The database schema is created automatically on first API call. This seed script only creates a user if no users exist yet.

## Troubleshooting

### SQLite File Permissions

The database file and its parent directory must be writable by the PHP process:

```bash
chown -R www-data:www-data ~/smag/.deployments-*/data/
chmod 750 ~/smag/.deployments-*/data/
chmod 640 ~/smag/.deployments-*/data/database.sqlite
```

---

*Last updated: March 2026*
