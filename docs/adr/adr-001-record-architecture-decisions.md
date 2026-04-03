# Record Architecture Decisions

We will record architectural decisions in the repository using Architecture Decision Records (ADRs).

Each ADR will be a Markdown file stored in `docs/adr/` with the naming convention `adr-XXX-short-title.md`, where `XXX` is a monotonically increasing integer.

The format of an ADR will be:
1.  **Title and Decision**: A concise, affirmative statement of what we will do (directly following the title, no section header).
2.  **Context**: The forces at play, including technological, political, social, and project local context.
3.  **Considered Alternatives**: A list of options that were considered and a brief explanation of why they were not chosen.
5.  **Optional Sections**: Additional specific details if required.

**Lifecycle Management:**
*   **Approved**: If an ADR file exists in the `main` branch, it is considered approved and active.
*   **Pending/Proposed**: If an ADR exists only in a feature branch or pull request, it is under review.
*   **Obsolete/Rejected**: If a decision is overturned or becomes irrelevant, the ADR file is deleted from the file system. The history remains accessible via Git.

## Context

We need a way to document the "why" behind the software architecture to help current and future developers understand the system's evolution. Without a record, the context of decisions is lost, leading to repetitive discussions or fear of changing "chesterton's fence" legacy code.

## Considered Alternatives

*   **Wiki / External Documentation**: Rejected because external documentation often drifts out of sync with the codebase and requires separate access management.
*   **Issue Tracker / PR Descriptions**: Rejected because searching for architectural context in closed issues or merged PRs is inefficient and lacks a cohesive narrative.
*   **Code Comments**: Rejected because comments are best for explaining "how" specific blocks work, not the high-level "why" of architectural patterns.
