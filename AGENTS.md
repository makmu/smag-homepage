This repository is hosted on github https://github.com/makmu/smag-homepage

Any commit related to a github issue must contain the number of the github issue at the start of the message followed by a colon an the actual message, e.g. "#18: Hide past events from unauthenticated users"

## Issue Management

- Issues should never be closed without explicit confirmation from the user
- When creating a PR, always add a closing keyword (e.g., "Closes #32", "Fixes #32", "Resolves #32") in the PR description to auto-close the linked issue when merged
- Only omit the closing keyword if the user explicitly tells you otherwise

## Architecture Documentation

This project maintains architecture documentation in the `docs/` folder. If you need specific information about the intended architecture, consult `docs/architecture.md` which provides an overview of all architecture-related documentation (ADRs, decisions, conventions). Only read these files on demand when the task requires it.

## UX Guidelines

This project maintains UX guidelines in `docs/ux-guideline.md`. Consult it for UX-related rules and conventions when working on the frontend or user-facing features. Only read this file on demand when the task requires it.