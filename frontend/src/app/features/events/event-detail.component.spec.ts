import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { EventDetailComponent } from './event-detail.component';

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
});
