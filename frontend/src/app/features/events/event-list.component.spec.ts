import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { EventListComponent } from './event-list.component';

const apiUrl = environment.apiUrl;
const USER_KEY = 'smag_user';

describe('EventListComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        localStorage.removeItem(USER_KEY);

        await TestBed.configureTestingModule({
            imports: [EventListComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        localStorage.removeItem(USER_KEY);
        httpMock.verify({ ignoreCancelled: true });
    });

    function flushEvents(includePast: boolean): void {
        httpMock
            .expectOne(`${apiUrl}/events?include_past=${includePast}`)
            .flush({ data: { items: [] }, error: null });
    }

    it('asks for past events while logged in and refetches after logout', async () => {
        localStorage.setItem(USER_KEY, JSON.stringify({ email: 'editor@example.com' }));

        const fixture = TestBed.createComponent(EventListComponent);
        TestBed.tick();
        flushEvents(true);
        await fixture.whenStable();
        TestBed.tick();

        TestBed.inject(AuthService).logout();
        TestBed.tick();
        flushEvents(false);
        await fixture.whenStable();
        TestBed.tick();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain(
            'Aktuell sind keine Veranstaltungen geplant.'
        );
    });
});
