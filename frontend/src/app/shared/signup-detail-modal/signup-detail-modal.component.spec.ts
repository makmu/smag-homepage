import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { SignupDetailModalComponent } from './signup-detail-modal.component';

const apiUrl = environment.apiUrl;

const detailUrl = `${apiUrl}/events/1/signups/5`;

const signupDetail = {
    id: 5,
    name: 'Erika Musterfrau',
    email: 'erika@example.com',
    comment: 'Kein Kommentar',
    created_at: '2026-01-01T10:00:00',
};

describe('SignupDetailModalComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SignupDetailModalComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify({ ignoreCancelled: true });
    });

    async function openModal(): Promise<ComponentFixture<SignupDetailModalComponent>> {
        const fixture = TestBed.createComponent(SignupDetailModalComponent);
        fixture.componentRef.setInput('eventId', 1);
        fixture.componentRef.setInput('signupId', 5);
        fixture.detectChanges();
        await fixture.whenStable();

        httpMock.expectOne(detailUrl).flush({ data: signupDetail, error: null });
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture;
    }

    function flushDelete(fixture: ComponentFixture<SignupDetailModalComponent>): void {
        httpMock
            .expectOne((request) => request.method === 'DELETE' && request.url === detailUrl)
            .flush({ data: { deleted: true }, error: null });
        fixture.detectChanges();
    }

    it('aborts the pending detail request when the component is destroyed', async () => {
        const fixture = TestBed.createComponent(SignupDetailModalComponent);
        fixture.componentRef.setInput('eventId', 1);
        fixture.componentRef.setInput('signupId', 5);
        fixture.detectChanges();
        await fixture.whenStable();

        const pending = httpMock.expectOne(detailUrl);
        fixture.destroy();

        expect(pending.cancelled).toBe(true);
    });

    it('aborts an in-flight delete when the component is destroyed', async () => {
        const fixture = await openModal();

        fixture.componentInstance.onDeleteClick();
        fixture.componentInstance.onDeleteClick();
        fixture.detectChanges();

        const pending = httpMock.expectOne(
            (request) => request.method === 'DELETE' && request.url === detailUrl,
        );
        fixture.destroy();

        expect(pending.cancelled).toBe(true);
    });

    it('emits deleted — and not close — once the delete succeeded', async () => {
        const fixture = await openModal();
        const component = fixture.componentInstance;
        const close = vi.fn();
        const deleted = vi.fn();
        component.close.subscribe(close);
        component.deleted.subscribe(deleted);

        component.onDeleteClick();
        component.onDeleteClick();
        flushDelete(fixture);
        await fixture.whenStable();

        expect(deleted).toHaveBeenCalledTimes(1);
        expect(close).not.toHaveBeenCalled();
    });

    it('emits close without deleted when the dialog is dismissed', async () => {
        const fixture = await openModal();
        const component = fixture.componentInstance;
        const close = vi.fn();
        const deleted = vi.fn();
        component.close.subscribe(close);
        component.deleted.subscribe(deleted);

        const headerClose = fixture.nativeElement.querySelector('button[aria-label="Schließen"]');
        headerClose.click();
        fixture.detectChanges();

        expect(close).toHaveBeenCalledTimes(1);
        expect(deleted).not.toHaveBeenCalled();
    });

    it('does not run the delete confirmation timer after the component is destroyed', async () => {
        const fixture = await openModal();
        const component = fixture.componentInstance;

        vi.useFakeTimers();
        try {
            component.onDeleteClick();
            expect(component.deleteConfirm()).toBe(true);

            fixture.destroy();
            vi.advanceTimersByTime(5000);

            expect(component.deleteConfirm()).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });
});
