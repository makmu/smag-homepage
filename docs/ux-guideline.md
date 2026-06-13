# UX Guidelines

## Micro-Interactions for Backend Operations

When users kick off any operation involving the backend (e.g. saving data, loading content, submitting forms), a micro-interaction such as a loading spinner should immediately appear and indicate to the user that an operation is in progress. This rule must always be observed.

### Button Loading States

When the operation is triggered by a button click, the button itself must show a loading indicator (e.g. an inline spinner) and become disabled during the operation. Use a signal (e.g. `saving`) to track the operation state. See `frontend/src/app/shared/event-modal/event-modal.component.ts` for a reference implementation.

### In-Place Loading for Lists and Entities

When loading lists or entities, the loading indicator should appear in place where the result will be shown in the end — not as a full-page overlay. Use a signal (e.g. `loading`) and conditionally render the loader inside the target container. See `frontend/src/app/features/events/event-list.component.ts` for a reference implementation.

### Two-Click Delete Confirmation

When an entity/item is to be deleted, the delete button must be clicked twice within 5 seconds to confirm the action. The first click changes the button to a confirmation state (e.g. "Erneut klicken zum Bestätigen"). If the second click does not happen within the time window, the confirmation resets. See `frontend/src/app/shared/post-modal/post-modal.component.ts` for a reference implementation.
