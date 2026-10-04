import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { PostDetailComponent } from './post-detail.component';

const apiUrl = environment.apiUrl;

function apiPost(id: number) {
    return {
        data: {
            id,
            thumbnail_url: '/media/thumb.jpg',
            title: `Titel ${id}`,
            caption: 'Caption',
            date: '2026-06-01',
            created_at: '2026-01-01T00:00:00',
            updated_at: '2026-01-01T00:00:00',
            prev_post_id: null,
            next_post_id: null,
        },
        error: null,
    };
}

describe('PostDetailComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        await TestBed.configureTestingModule({
            imports: [PostDetailComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify({ ignoreCancelled: true });
    });

    it('aborts the pending request when the route id changes', async () => {
        const fixture = TestBed.createComponent(PostDetailComponent);
        fixture.componentRef.setInput('id', 1);
        TestBed.tick();

        const stale = httpMock.expectOne(`${apiUrl}/posts/1`);

        fixture.componentRef.setInput('id', 2);
        TestBed.tick();

        expect(stale.cancelled).toBe(true);

        httpMock.expectOne(`${apiUrl}/posts/2`).flush(apiPost(2));
        await fixture.whenStable();
        TestBed.tick();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Titel 2');
        expect(text).not.toContain('Titel 1');
    });
});
