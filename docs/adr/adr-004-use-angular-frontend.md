# Use Angular for Frontend

We will build the frontend as a Single Page Application (SPA) using the latest version of the **Angular** framework.

## Context

The application requires a dynamic user interface for browsing blog entries and events.

The target hosting environment is resource-constrained, with PHP server-side rendering often taking 3 or more seconds to generate a page. This latency causes a poor user experience with full page reloads.

The development team needs a technology that is robust, "batteries-included," and easy to maintain long-term without constantly evaluating third-party libraries.

## Decision

*   **SPA Architecture**: We will use a Single Page Application approach. After the initial load, navigation will be handled client-side, bypassing the slow server and providing a snappy user experience.
*   **Angular Framework**: We will use the latest version of Angular.
*   **Minimal Dependencies**: We will strictly adhere to using Angular's built-in functionality (Router, Forms, HttpClient, Signals) and avoid external libraries unless absolutely necessary. This minimizes the risk of dependency abandonment and reduces maintenance overhead.
*   **SEO**: We will implement basic SEO optimizations in the static `index.html`, accepting that deep content indexing relies on modern crawlers' ability to execute JavaScript.

## Consequences

*   **Positive**:
    *   Drastically improved perceived performance after initial load.
    *   Reduced decision fatigue and maintenance burden by relying on Angular's standard ecosystem rather than a fragmented set of libraries (as is common with React).
    *   Leverages team familiarity and strong AI tooling support due to Angular's strict structure and typing.
*   **Negative**:
    *   Initial bundle size may be larger than a server-rendered page.
    *   Requires reliance on client-side JavaScript for all content rendering.

## Considered Alternatives

*   **PHP Server-Side Rendering**: Rejected because the hosting environment is too slow, resulting in unacceptable delays (3+ seconds) on every page navigation.
*   **React**: Rejected for several reasons:
    *   **Maintenance Overhead**: React requires assembling a stack from third-party libraries (routing, state, etc.), which are often abandoned or poorly maintained.
    *   **Team Familiarity**: The team is more proficient with Angular.
*   **Vue / Svelte**: Rejected to prioritize team familiarity with Angular.
