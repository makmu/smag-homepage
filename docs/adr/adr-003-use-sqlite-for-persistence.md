# Use SQLite for Persistence

We will use **SQLite 3** as the primary persistence mechanism for the application.

## Context

The application requires a relational database to store blog posts, events, and user credentials.

The target hosting environment supports MySQL, but setting it up involves additional complexity (authentication, maintenance, backups). The project aims for simplicity in deployment and maintenance.

Keeping the database as a single file simplifies backups (just copy the file) and local development. Direct file access simplifies debugging and data inspection. The scale of the application (a personal homepage/blog) does not require the concurrency or scalability features of a client-server database like MySQL or PostgreSQL.

## Considered Alternatives

*   **MySQL**: Rejected because it introduces unnecessary operational complexity (user management, network configuration, separate backup procedures) for the project's scale. While available on the host, the overhead of maintaining a separate service outweighs the benefits for this specific use case.
*   **MariaDB / PostgreSQL**: Rejected because the current hosting provider does not support these databases.
*   **Flat Files (JSON/Markdown)**: Rejected because structured data queries (e.g., filtering events by date, searching blog posts) and data integrity (relationships between entities) are better handled by a relational database. SQLite offers SQL capabilities without the server overhead.
*   **NoSQL / Document Stores**: Rejected because the data model is inherently relational (Posts have Authors, Events have Locations, etc.), and SQL is a well-understood standard for querying this type of data.
