import { Injectable } from '@angular/core';

/**
 * Owns the state that belongs to *all* open dialogs at once: the body scroll lock and
 * the `inert` flag on the page content behind the dialogs. Keeping it in one service
 * makes sure a second dialog can never unlock the page while the first one is still
 * open, and that closing one dialog does not make the background reachable again
 * while another dialog is still displayed.
 */
@Injectable({ providedIn: 'root' })
export class DialogLayerService {
    private readonly overlays = new Set<HTMLElement>();
    private readonly inertedElements = new Set<HTMLElement>();
    private previousBodyOverflow: string | null = null;

    /** Registers an open dialog overlay and applies the shared background state. */
    register(overlay: HTMLElement): void {
        this.overlays.add(overlay);

        if (this.overlays.size === 1) {
            this.previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }

        this.updateInertBackground();
    }

    /** Removes a closed dialog overlay and releases the shared background state. */
    unregister(overlay: HTMLElement): void {
        this.overlays.delete(overlay);

        if (this.overlays.size === 0) {
            document.body.style.overflow = this.previousBodyOverflow ?? '';
            this.previousBodyOverflow = null;
        }

        this.updateInertBackground();
    }

    /** Dialogs register in the order they open, so the last registered one is on top. */
    isTopmost(overlay: HTMLElement): boolean {
        return Array.from(this.overlays).at(-1) === overlay;
    }

    /**
     * Marks everything that is not part of an open dialog as `inert`, so screen reader
     * and keyboard users cannot reach the page behind the overlay. The ancestors of an
     * overlay stay interactive, otherwise the dialog itself would become unreachable.
     * Elements are recorded individually because `inert` is inherited by descendants.
     */
    private updateInertBackground(): void {
        for (const element of this.inertedElements) {
            element.inert = false;
        }
        this.inertedElements.clear();

        if (this.overlays.size === 0) {
            return;
        }

        const dialogAncestors = new Set<HTMLElement>();
        for (const overlay of this.overlays) {
            for (let node: HTMLElement | null = overlay; node && node !== document.body; node = node.parentElement) {
                dialogAncestors.add(node);
            }
        }

        const inertIfBackground = (element: Element): void => {
            const htmlElement = element as HTMLElement;
            if (dialogAncestors.has(htmlElement)) return;
            htmlElement.inert = true;
            this.inertedElements.add(htmlElement);
        };

        for (const child of Array.from(document.body.children)) {
            inertIfBackground(child);
        }

        for (const ancestor of dialogAncestors) {
            // The overlays themselves and their content stay interactive.
            if (this.overlays.has(ancestor)) continue;
            for (const child of Array.from(ancestor.children)) {
                inertIfBackground(child);
            }
        }
    }
}
