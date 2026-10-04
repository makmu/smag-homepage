import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    ViewChild,
    inject,
    input,
    output,
} from '@angular/core';
import { DialogLayerService } from './dialog-layer.service';

let dialogCount = 0;

/**
 * Everything inside a dialog that can receive keyboard focus. `iframe` matters for
 * embedded widgets such as Cloudflare Turnstile: they render their challenge in a
 * cross-frame document that is natively tabbable, and keyboard users must be able
 * to reach it (WCAG 2.1.1) — for example to tick an interactive challenge.
 */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Whether an element can currently take focus. Deliberately avoids layout
 * information (`getClientRects()`): the element must still be found in
 * environments without layout — like unit test runners — and an element that
 * is `display: none` or `hidden` is excluded either way.
 */
function isVisible(element: HTMLElement): boolean {
    for (let node: Element | null = element; node; node = node.parentElement) {
        if ((node as HTMLElement).hidden) return false;
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
            return false;
        }
    }
    return true;
}

/**
 * Shared shell for every modal dialog in the app. It provides the dialog semantics
 * (`role="dialog"`, `aria-modal`, `aria-labelledby`), a named close button, Escape and
 * backdrop closing, a focus trap with focus restoration, an inert background and a body
 * scroll lock — once, for all callers.
 */
@Component({
    selector: 'smag-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:keydown)': 'onKeydown($event)',
        '(document:focusout)': 'onFocusout($event)',
    },
    template: `
        <div
            #overlay
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            [attr.aria-labelledby]="headingId"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            (click)="onBackdropClick($event)"
        >
            <div
                class="max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
                [class.max-w-md]="maxWidth() === 'md'"
                [class.max-w-lg]="maxWidth() === 'lg'"
                [class.max-w-2xl]="maxWidth() === '2xl'"
            >
                <div class="mb-6 flex items-center justify-between gap-4">
                    <h2 [id]="headingId" class="text-xl font-bold text-gray-900">{{ heading() }}</h2>
                    <button
                        type="button"
                        class="text-gray-400 hover:text-gray-600 disabled:text-gray-300"
                        [disabled]="busy()"
                        aria-label="Schließen"
                        (click)="close.emit()"
                    >
                        <svg
                            aria-hidden="true"
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <ng-content />
            </div>
        </div>
    `,
})
export class SmagDialogComponent implements AfterViewInit, OnDestroy {
    /** Accessible name of the dialog, rendered as its heading. */
    heading = input.required<string>();

    /** While true, the backdrop and the close button refuse to close the dialog. */
    busy = input(false);

    /** Tailwind max-width variant of the dialog panel. */
    maxWidth = input<'md' | 'lg' | '2xl'>('lg');

    /** Emitted when the user asks to close the dialog (Escape, backdrop, close button). */
    readonly close = output<void>();

    readonly headingId = `smag-dialog-heading-${++dialogCount}`;

    @ViewChild('overlay') private overlay?: ElementRef<HTMLElement>;

    private readonly layer = inject(DialogLayerService);
    private opener: HTMLElement | null = null;
    private destroyed = false;

    ngAfterViewInit(): void {
        const overlay = this.overlay?.nativeElement;
        if (!overlay) return;

        this.opener =
            document.activeElement instanceof HTMLElement && document.activeElement !== document.body
                ? document.activeElement
                : null;

        this.layer.register(overlay);
        overlay.focus();
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        const overlay = this.overlay?.nativeElement;
        if (overlay) {
            this.layer.unregister(overlay);
        }
        this.restoreFocus();
    }

    /** Closes when the backdrop itself — and not the panel — is clicked. */
    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget && !this.busy()) {
            this.close.emit();
        }
    }

    onKeydown(event: KeyboardEvent): void {
        const overlay = this.overlay?.nativeElement;
        if (!overlay || !this.layer.isTopmost(overlay)) return;

        if (event.key === 'Escape') {
            // Escape is intentionally not blocked by `busy`: it must always be possible
            // to leave a dialog with the keyboard.
            this.close.emit();
        } else if (event.key === 'Tab') {
            this.trapFocus(event, overlay);
        }
    }

    /**
     * Owns Tab completely: the default action is always cancelled and focus is moved
     * explicitly. Native sequential navigation can be derailed by widgets that render
     * focusable content we cannot see (for example the Cloudflare Turnstile widget)
     * and drop focus to the `body`; moving focus ourselves keeps that from happening.
     */
    private trapFocus(event: KeyboardEvent, overlay: HTMLElement): void {
        event.preventDefault();

        const focusable = this.focusableWithin(overlay);
        if (focusable.length === 0) {
            overlay.focus();
            return;
        }

        const step = event.shiftKey ? -1 : 1;
        const active = document.activeElement as HTMLElement | null;
        const index = active ? focusable.indexOf(active) : -1;

        let next: HTMLElement;
        if (index !== -1) {
            next = focusable[(index + step + focusable.length) % focusable.length];
        } else if (active && overlay.contains(active)) {
            // Focus sits inside widget content we cannot enumerate (for example a
            // shadow tree): continue with the nearest focusable in travel direction.
            next = this.nearestFocusable(focusable, active, step) ?? focusable[step === 1 ? 0 : focusable.length - 1];
        } else {
            // Focus sits on the overlay itself or outside the dialog — enter at the
            // nearest edge.
            next = focusable[step === 1 ? 0 : focusable.length - 1];
        }

        next.focus();
    }

    /** The closest element of `focusable` before (`step === -1`) or after `from` in DOM order. */
    private nearestFocusable(focusable: HTMLElement[], from: HTMLElement, step: 1 | -1): HTMLElement | undefined {
        const candidates = focusable.filter((element) => {
            if (element === from) return false;
            const position = from.compareDocumentPosition(element);
            return step === 1
                ? (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
                : (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
        });
        return step === 1 ? candidates[0] : candidates[candidates.length - 1];
    }

    /**
     * Safety net for focus that leaves the dialog without a Tab key press — for
     * instance when a widget inside a shadow tree re-renders and the element that
     * held focus disappears. Focus is restored once the browser finished moving it.
     */
    onFocusout(event: FocusEvent): void {
        const overlay = this.overlay?.nativeElement;
        if (!overlay || this.destroyed || !this.layer.isTopmost(overlay)) return;

        const leaving = event.target;
        if (!(leaving instanceof Node) || !overlay.contains(leaving)) return;

        const next = event.relatedTarget;
        if (next instanceof Node && overlay.contains(next)) return;

        queueMicrotask(() => this.containFocus(overlay, leaving));
    }

    private containFocus(overlay: HTMLElement, leaving: Node): void {
        if (this.destroyed || !document.contains(overlay)) return;

        const active = document.activeElement;
        if (active && overlay.contains(active)) return;

        const [first] = this.focusableWithin(overlay);
        const target =
            leaving instanceof HTMLElement && document.contains(leaving) && isVisible(leaving)
                ? leaving
                : first;
        (target ?? overlay).focus();

        // `focus()` silently does nothing on elements that cannot take focus.
        if (!overlay.contains(document.activeElement)) {
            (first ?? overlay).focus();
        }
    }

    /** All elements inside the dialog that are currently able to take keyboard focus. */
    private focusableWithin(overlay: HTMLElement): HTMLElement[] {
        return Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
    }

    /** Returns focus to the element that opened the dialog, once the page is usable again. */
    private restoreFocus(): void {
        const opener = this.opener;
        if (opener && document.contains(opener)) {
            opener.focus();
        }
    }
}
