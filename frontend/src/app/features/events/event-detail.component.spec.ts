import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { EventDetailComponent } from './event-detail.component';
import { SignupDetailModalComponent } from '../../shared/signup-detail-modal/signup-detail-modal.component';

const apiUrl = environment.apiUrl;

function apiEvent(id: number) {
    return {
        id,
        title: `Titel ${id}`,
        teaser: 'Teaser',
        location: 'Treffpunkt',
        date: '2026-06-01T18:00:00',
        description: 'Beschreibung',
        signup_type: 'none',
        signup_deadline: null,
        signup_limit: null,
        signup_instructions: null,
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
        signups: [],
    };
}

describe('EventDetailComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        await TestBed.configureTestingModule({
            imports: [EventDetailComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify({ ignoreCancelled: true });
    });

    it('aborts the pending request when the route id changes', async () => {
        const fixture = TestBed.createComponent(EventDetailComponent);
        fixture.componentRef.setInput('id', 1);
        TestBed.tick();

        const stale = httpMock.expectOne(`${apiUrl}/events/1`);

        fixture.componentRef.setInput('id', 2);
        TestBed.tick();

        expect(stale.cancelled).toBe(true);

        httpMock.expectOne(`${apiUrl}/events/2`).flush({ data: apiEvent(2), error: null });
        await fixture.whenStable();
        TestBed.tick();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Titel 2');
        expect(text).not.toContain('Titel 1');
    });

    it('aborts the pending request when the component is destroyed', () => {
        const fixture = TestBed.createComponent(EventDetailComponent);
        fixture.componentRef.setInput('id', 1);
        TestBed.tick();

        const pending = httpMock.expectOne(`${apiUrl}/events/1`);
        fixture.destroy();

        expect(pending.cancelled).toBe(true);
    });

    it('renders the not-found state instead of loading forever without an id', () => {
        const fixture = TestBed.createComponent(EventDetailComponent);
        TestBed.tick();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Veranstaltung nicht gefunden.');
        httpMock.expectNone(() => true);
    });

    describe('signup detail dialog', () => {
        const signupDetail = {
            id: 5,
            name: 'Erika Musterfrau',
            email: 'erika@example.com',
            comment: null,
            created_at: '2026-01-01T10:00:00',
        };

        const eventUrl = `${apiUrl}/events/1`;
        const detailUrl = `${apiUrl}/events/1/signups/5`;

        beforeEach(() => {
            localStorage.setItem('smag_user', JSON.stringify({ email: 'editor@example.com' }));
        });

        afterEach(() => {
            localStorage.removeItem('smag_user');
        });

        async function openDetailDialog(fixture: ComponentFixture<EventDetailComponent>): Promise<void> {
            httpMock.expectOne(eventUrl).flush({
                data: {
                    ...apiEvent(1),
                    signups: [{ id: 5, name: signupDetail.name, comment: null }],
                },
                error: null,
            });
            await fixture.whenStable();
            fixture.detectChanges();

            const opener = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
                'button[aria-label="Anmeldung ansehen"]',
            );
            expect(opener).not.toBeNull();
            opener!.click();
            await fixture.whenStable();
            fixture.detectChanges();

            httpMock.expectOne(detailUrl).flush({ data: signupDetail, error: null });
            await fixture.whenStable();
            fixture.detectChanges();
        }

        function dialog(): HTMLElement | null {
            return document.querySelector('[role="dialog"]');
        }

        it('does not refetch the event when the dialog is closed without deleting', async () => {
            const fixture = TestBed.createComponent(EventDetailComponent);
            fixture.componentRef.setInput('id', 1);
            TestBed.tick();
            await openDetailDialog(fixture);

            expect(dialog()).not.toBeNull();

            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
            );
            await fixture.whenStable();
            fixture.detectChanges();

            expect(dialog()).toBeNull();
            httpMock.expectNone((request) => request.method === 'GET' && request.url === eventUrl);
        });

        it('refetches the event after the signup was deleted', async () => {
            const fixture = TestBed.createComponent(EventDetailComponent);
            fixture.componentRef.setInput('id', 1);
            TestBed.tick();
            await openDetailDialog(fixture);

            const modal = fixture.debugElement.query(By.directive(SignupDetailModalComponent))
                .componentInstance as SignupDetailModalComponent;
            modal.onDeleteClick();
            modal.onDeleteClick();
            fixture.detectChanges();

            httpMock
                .expectOne((request) => request.method === 'DELETE' && request.url === detailUrl)
                .flush({ data: { deleted: true }, error: null });
            fixture.detectChanges();

            httpMock.expectOne(eventUrl).flush({ data: apiEvent(1), error: null });
            await fixture.whenStable();
            fixture.detectChanges();

            expect(dialog()).toBeNull();
            expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(signupDetail.name);
        });
    });
});
