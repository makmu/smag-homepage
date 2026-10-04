import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { GalleryComponent } from './gallery.component';

const apiUrl = environment.apiUrl;

function postsBody(page: number) {
    return {
        data: {
            items: [
                {
                    id: page,
                    thumbnail_url: '/media/thumb.jpg',
                    title: `Titel Seite ${page}`,
                    caption: 'Caption',
                    date: '2026-06-01',
                },
            ],
            pagination: { page, limit: 20, total: 3, total_pages: 3 },
        },
    };
}

describe('GalleryComponent', () => {
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GalleryComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify({ ignoreCancelled: true });
    });

    it('aborts the in-flight page request when a newer page is requested', async () => {
        const fixture = TestBed.createComponent(GalleryComponent);
        TestBed.tick();

        const stale = httpMock.expectOne(`${apiUrl}/posts?page=1&limit=20`);

        fixture.componentInstance.loadPage(2);
        TestBed.tick();

        expect(stale.cancelled).toBe(true);

        httpMock.expectOne(`${apiUrl}/posts?page=2&limit=20`).flush(postsBody(2));
        await fixture.whenStable();
        TestBed.tick();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Titel Seite 2');
        expect(text).not.toContain('Titel Seite 1');
    });

    it('refetches the current page after a post was saved', async () => {
        const fixture = TestBed.createComponent(GalleryComponent);
        TestBed.tick();

        httpMock.expectOne(`${apiUrl}/posts?page=1&limit=20`).flush(postsBody(1));
        await fixture.whenStable();
        TestBed.tick();

        fixture.componentInstance.onPostSaved();
        TestBed.tick();

        httpMock.expectOne(`${apiUrl}/posts?page=1&limit=20`).flush(postsBody(1));
        await fixture.whenStable();
        TestBed.tick();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Titel Seite 1');
    });

    it('still refetches when the save finishes while the previous request is in flight', async () => {
        const fixture = TestBed.createComponent(GalleryComponent);
        TestBed.tick();

        const pending = httpMock.expectOne(`${apiUrl}/posts?page=1&limit=20`);

        fixture.componentInstance.onPostSaved();

        pending.flush(postsBody(1));
        // Let the flushed response settle instead of awaiting stability: the queued reload
        // would open a new request and keep the fixture unstable forever.
        await Promise.resolve();
        TestBed.tick();

        httpMock.expectOne(`${apiUrl}/posts?page=1&limit=20`).flush(postsBody(1));
        await fixture.whenStable();
        TestBed.tick();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Titel Seite 1');
    });
});
