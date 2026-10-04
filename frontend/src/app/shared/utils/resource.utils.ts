import { WritableResource, effect, signal } from '@angular/core';

/**
 * Returns a function that reloads the given resource after a mutation.
 *
 * `Resource.reload()` is a no-op while a request is already in flight, and that pending response
 * may have been requested *before* the mutation landed. The returned function therefore queues
 * the reload and performs it as soon as the pending request settles, so a refetch is never lost.
 *
 * Must be called from an injection context, e.g. a component field initializer.
 */
export function reloadWhenIdle<T>(resource: WritableResource<T>): () => void {
    const queued = signal(false);

    effect(() => {
        if (queued() && !resource.isLoading()) {
            queued.set(false);
            resource.reload();
        }
    });

    return () => {
        if (!resource.reload()) {
            queued.set(true);
        }
    };
}
