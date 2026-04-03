# DEPLOYMENT.md

> **⚠️ PHP-only server.** There is no Node.js runtime on the production server. The Angular application is compiled to a static shell on the developer's machine and uploaded to the server. The PHP process only runs the API backend. No API calls are made at build time.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Usage](#2-usage)
3. [Rollback](#3-rollback)
4. [Troubleshooting](#4-troubleshooting)
5. [Configuration](#5-configuration)
6. [Details](#6-details)

---

## 1. Prerequisites

- **Node.js** (build time only): 20+
- **npm**: Latest
- **PHP**: 8.2+
- **Composer**: Latest (for installing PHP dependencies locally before deploy)
- **SSH access** to the server with `scp` configured
- **ZIP** utility installed locally

The server requires no Node.js or special build tools.

### Initial Setup

Before the first deployment, copy and configure the template files:

```bash
cp deploy/dev.conf.template deploy/dev.conf
cp deploy/prod.conf.template deploy/prod.conf
```

Edit `deploy/dev.conf` and `deploy/prod.conf` to set your server details (host, deployment folder name, symlink name, Angular build configuration).

---

## 2. Usage

```bash
# Deploy to dev (prepares new deployment, doesn't switch live yet)
./deploy.sh --dev

# Deploy to dev and switch to new deployment
./deploy.sh --dev --commit

# Deploy to prod
./deploy.sh --prod

# Deploy to prod and switch to new deployment
./deploy.sh --prod --commit
```

The script **requires** either `--dev` or `--prod` flag. Use `--commit` to switch the symlink to the new deployment.

A README.md is deployed to the server with each deployment, containing server-side setup instructions (configuration, database seeding, troubleshooting).

Configuration options are described in the [Configuration](#5-configuration) section. For more details on how deployments work, see [Details](#6-details).

---

## 3. Rollback

The script provides a built-in rollback command:

```bash
# Rollback to previous version
./deploy.sh --dev --rollback
./deploy.sh --prod --rollback
```

This switches the symlink (configured via `LIVE_SYMLINK` in your config) to point to the previous deployment number. For manual rollback, you can also SSH in and update the symlink directly:

```bash
ssh user@server.com
cd ~/smag
ln -sfn .deployments-live/X/public live
```

Replace `X` with the deployment number you want to revert to. Replace `live` with the symlink name configured in your `prod.conf` (or `dev.conf` for dev).

---

## 4. Troubleshooting

## 5. Configuration

Configuration files are in `deploy/`:
- `deploy/dev.conf` - Dev environment settings
- `deploy/prod.conf` - Prod environment settings

### Options

| Variable | Description |
|----------|-------------|
| `DEPLOY_HOST` | SSH destination (e.g., `user@server.com`) |
| `DEPLOYMENTS_FOLDER` | Deployment folder name (`.deployments-dev` or `.deployments-live`) |
| `LIVE_SYMLINK` | Symlink name (`dev` or `live`) |
| `ANGULAR_CONFIG` | Angular build configuration (`production` or `dev`) |

---


## 6. Details

### What It Does

1. **Builds** the Angular frontend (`npm install && ng build --configuration production`)
2. **Packages** a deployment zip containing:
   - `public/` - Frontend static files + API forwarder
   - `backend/` - PHP backend source files
   - `data/` - Empty directory (SQLite database)
3. **Installs** PHP dependencies locally with `composer install --no-dev` (removes dev dependencies like phpunit)
4. **Uploads** the zip to the server via `scp`
5. **Deploys** via SSH:
   - Creates new deployment folder (`{n+1}`)
   - Extracts zip
   - Copies SQLite database from current live deployment (if exists)
   - Updates symlink (only with `--commit` flag)

Without `--commit`, the new deployment is prepared but the symlink stays pointing to the old deployment. This allows you to verify the new deployment before switching.

### Server Structure

The deployed system lives in `~/smag/`:

```
~/smag/
├── .deployments-live/          # Deployment folders (1, 2, 3, ...)
│   ├── 1/
│   │   ├── public/        ← Current active frontend
│   │   ├── api/           ← PHP API forwarder
│   │   ├── backend/       ← Full PHP backend (src/, vendor/)
│   │   └── data/          ← SQLite database
│   ├── 2/
│   └── ...
└── live → ~/smag/.deployments-live/n/public  ← Symlink (name from LIVE_SYMLINK)
```

Each deployment folder contains:

| Folder | Description |
|--------|-------------|
| `public/` | Angular static files (index.html, JS, CSS, assets) |
| `public/api/` | Forwarder that routes to `backend/public/index.php` |
| `backend/` | Full PHP backend with vendor dependencies |
| `data/` | SQLite database (copied from previous deployment on deploy) |

> **Note:** For dev deployments, the folder is named `.deployments-dev` and the symlink is `dev` instead of `live`. This is configured in `deploy/dev.conf` and `deploy/prod.conf`.

---

*Last updated: March 2026*
