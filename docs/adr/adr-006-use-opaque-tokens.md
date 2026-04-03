# Use Opaque Access Tokens Instead of JWT

We will use **opaque token pairs** (access token + refresh token) for authentication instead of JWT.

Access tokens are short-lived (15 minutes) and stored in SQLite. Refresh tokens are long-lived (30 days) and rotated on each use. All tokens are revocable via the database.

## Context

We need to secure admin-only endpoints (create/edit/delete posts and events, manage users). The frontend is Angular, the backend is PHP with SQLite. Authentication must work across browsers and support token refresh without forcing users to re-login every 15 minutes.

## Considered Alternatives

*   **JWT (JSON Web Tokens)**: Rejected because tokens cannot be revoked individually without a blocklist. If a token is compromised, we cannot invalidate it without invalidating all tokens for that user or implementing complex additional infrastructure. JWTs also require careful handling of secrets and algorithm selection to avoid vulnerabilities.
*   **Session Cookies**: Rejected because they require server-side session storage and are less suitable for SPA architectures that need to make API calls from multiple contexts.
*   **API Keys**: Rejected because they lack built-in expiration and user association, making them unsuitable for user-specific access control.
