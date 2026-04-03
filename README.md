# SMAG Homepage

This repository contains the source code for the SMAG Homepage, a web application featuring an Angular frontend and a PHP Slim framework backend.

## Quick Start

Follow these instructions to get the application running locally on your machine.

### Prerequisites

Ensure you have the following installed:
-   **Node.js** (v18 or higher recommended)
-   **npm** (comes with Node.js)
-   **PHP** (8.2 or higher)
-   **Composer** (Dependency Manager for PHP)
-   **Docker** (optional, for running MailHog to capture emails locally)

### 1. Frontend Setup

The frontend is an Angular application located in the `frontend` directory.

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm start
    ```
    The application will be available at `http://localhost:4200/`.

### 2. Backend Setup

The backend is a PHP API using the Slim framework, located in the `backend` directory.

1.  Open a new terminal and navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    composer install
    ```

3.  Copy and edit the configuration:
    ```bash
    cp backend/config.php.template backend/config.php
    vi backend/config.php
    ```
    Update the SMTP settings in `config.php` for your local environment. See below for how to set up testing mails locally.

4.  Start the PHP built-in development server:
    ```bash
    php -S localhost:8080 -t public
    ```
    The API will be accessible at `http://localhost:8080`.

#### Seeding the Database (Optional)

To create your first admin user, run the seed script:

```bash
cd backend
php seed.php --email admin@example.com --name "Admin" --password "your-password-min-8-chars"
```

The database schema is created automatically on first API call.

#### Testing Emails Locally (Optional)

To test email sending locally, use MailHog:

```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```
-   SMTP server: `localhost:1025`
-   Web UI: `http://localhost:8025`

## Architecture

For a detailed overview of the system's architecture, please refer to the [Architectural Documentation](docs/architecture.md).
