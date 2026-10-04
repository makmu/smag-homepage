import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';

import { SmagDialogComponent } from './dialog.component';

@Component({
    imports: [SmagDialogComponent],
    template: `
        <button type="button" (click)="open.set(true)">Dialog öffnen</button>
        <p id="background-content">Inhalt hinter dem Dialog</p>

        @if (open()) {
            <smag-dialog [heading]="'Dialogtitel'" [busy]="busy()" (close)="open.set(false)">
                <button type="button" class="first-action">Erste Aktion</button>
                <button type="button" class="last-action">Letzte Aktion</button>
            </smag-dialog>
        }
    `,
})
class DialogHost {
    readonly open = signal(false);
    readonly busy = signal(false);
}

describe('SmagDialogComponent', () => {
    let fixture: ComponentFixture<DialogHost>;

    const dialog = (): HTMLElement => fixture.nativeElement.querySelector('[role="dialog"]');
    const closeButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[aria-label="Schließen"]');
    const backgroundContent = (): HTMLElement => fixture.nativeElement.querySelector('#background-content');

    function press(key: string, shiftKey = false): void {
        document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
        fixture.detectChanges();
    }

    async function openDialog(): Promise<HTMLElement> {
        fixture.componentInstance.open.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return dialog();
    }

    beforeEach(async () => {
        document.body.style.overflow = '';

        await TestBed.configureTestingModule({
            imports: [SmagDialogComponent, DialogHost],
        }).compileComponents();

        fixture = TestBed.createComponent(DialogHost);
        fixture.detectChanges();
    });

    afterEach(() => {
        document.body.style.overflow = '';
    });

    describe('dialog semantics', () => {
        it('exposes the dialog role, modal flag and an accessible name', async () => {
            const overlay = await openDialog();

            expect(overlay.getAttribute('role')).toBe('dialog');
            expect(overlay.getAttribute('aria-modal')).toBe('true');

            const labelId = overlay.getAttribute('aria-labelledby');
            expect(labelId).toBeTruthy();
            const heading = overlay.querySelector(`#${labelId!}`);
            expect(heading?.textContent).toContain('Dialogtitel');
        });

        it('renders a close button with an accessible name', async () => {
            await openDialog();

            expect(closeButton()).not.toBeNull();
            expect(closeButton().disabled).toBe(false);
        });
    });

    describe('closing', () => {
        it('closes on Escape', async () => {
            await openDialog();

            press('Escape');

            expect(fixture.componentInstance.open()).toBe(false);
        });

        it('closes on Escape even while busy, so the keyboard never gets trapped', async () => {
            await openDialog();
            fixture.componentInstance.busy.set(true);
            fixture.detectChanges();

            press('Escape');

            expect(fixture.componentInstance.open()).toBe(false);
        });

        it('closes when the backdrop itself is clicked', async () => {
            const overlay = await openDialog();

            overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            fixture.detectChanges();

            expect(fixture.componentInstance.open()).toBe(false);
        });

        it('keeps the dialog open when the panel is clicked', async () => {
            const overlay = await openDialog();

            overlay.querySelector('.first-action')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            fixture.detectChanges();

            expect(fixture.componentInstance.open()).toBe(true);
        });

        it('ignores backdrop clicks and disables the close button while busy', async () => {
            const overlay = await openDialog();
            fixture.componentInstance.busy.set(true);
            fixture.detectChanges();

            overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            fixture.detectChanges();

            expect(fixture.componentInstance.open()).toBe(true);
            expect(closeButton().disabled).toBe(true);
        });
    });

    describe('focus management', () => {
        it('moves focus into the dialog and back to the opener when it closes', async () => {
            const opener: HTMLButtonElement = fixture.nativeElement.querySelector('button');
            opener.focus();
            expect(document.activeElement).toBe(opener);

            const overlay = await openDialog();
            expect(document.activeElement).toBe(overlay);

            fixture.componentInstance.open.set(false);
            fixture.detectChanges();

            expect(document.activeElement).toBe(opener);
        });

        it('wraps Tab from the last to the first focusable element', async () => {
            const overlay = await openDialog();

            overlay.querySelector<HTMLButtonElement>('.last-action')!.focus();
            press('Tab');

            expect(document.activeElement).toBe(closeButton());
        });

        it('wraps Shift+Tab from the first to the last focusable element', async () => {
            const overlay = await openDialog();

            closeButton().focus();
            press('Tab', true);

            expect(document.activeElement).toBe(overlay.querySelector('.last-action'));
        });

        it('moves focus to the first element when it sits on the overlay', async () => {
            const overlay = await openDialog();

            expect(document.activeElement).toBe(overlay);
            press('Tab');

            expect(document.activeElement).toBe(closeButton());
        });

        it('pulls focus back when it leaves the dialog outside of Tab', async () => {
            const overlay = await openDialog();
            const opener: HTMLButtonElement = fixture.nativeElement.querySelector('button');
            opener.inert = false;

            overlay.querySelector<HTMLButtonElement>('.first-action')!.focus();
            opener.focus();
            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            expect(overlay.contains(document.activeElement)).toBe(true);
        });
    });

    describe('background state', () => {
        it('locks the body scroll while open and releases it on close', async () => {
            await openDialog();
            expect(document.body.style.overflow).toBe('hidden');

            fixture.componentInstance.open.set(false);
            fixture.detectChanges();

            expect(document.body.style.overflow).toBe('');
        });

        it('makes the background inert while open and restores it on close', async () => {
            await openDialog();
            expect(backgroundContent().inert).toBe(true);

            fixture.componentInstance.open.set(false);
            fixture.detectChanges();

            expect(backgroundContent().inert).toBe(false);
        });
    });
});
