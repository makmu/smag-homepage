# Use PHP and Slim Framework for Backend

We will build the backend using **PHP 8.2+** with the **Slim 4 Microframework**.

This stack will handle:
*   RESTful API endpoints for blog entries and events.
*   Authentication for administrative actions (e.g., creating/editing content).

## Context

The hosting environment imposes a strict constraint: only PHP is available. We cannot deploy Node.js, Python, Go, or containerized applications.

The application scope is modest: a few endpoints to fetch public content (blog posts, events) and secure endpoints for content management. While the functionality is simple, security—especially authentication—is critical.

## Considered Alternatives

*   **Plain PHP**: Rejected because implementing routing, middleware, and secure authentication (CSRF protection, JWT handling, etc.) from scratch is error-prone, time-consuming, and harder to maintain.
*   **Full-Stack Frameworks (Laravel, Symfony)**: Rejected because they introduce significant overhead and complexity that is disproportionate to the small number of required endpoints. Their heavy dependencies and configuration requirements are unnecessary for this project's scope.
*   **Node.js / Python / Go**: Rejected because the current hosting provider does not support these runtimes.
