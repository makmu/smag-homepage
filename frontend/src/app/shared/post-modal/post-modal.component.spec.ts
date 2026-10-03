import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { EditablePost } from './post-helpers';
import { PostModalComponent } from './post-modal.component';

describe('PostModalComponent', () => {
    let httpMock: HttpTestingController;

    const editablePost: EditablePost = {
        id: 42,
        title: 'Alter Titel',
        caption: 'Alte Beschreibung',
        date: '2026-01-01',
        thumbnailUrl: environment.apiUrl + '/media/7',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PostModalComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    async function openForEditing() {
        const fixture = TestBed.createComponent(PostModalComponent);
        fixture.componentRef.setInput('editablePost', editablePost);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture;
    }

    it('sends the relative thumbnail_url when the image is left untouched', async () => {
        const fixture = await openForEditing();
        const component = fixture.componentInstance;

        expect(component.isSubmitEnabled()).toBe(true);

        component.onSubmit();

        const req = httpMock.expectOne(
            (r) => r.method === 'PUT' && r.url === `${environment.apiUrl}/posts/42`
        );
        expect(req.request.body.thumbnail_url).toBe('/media/7');
        expect(req.request.body.thumbnail_id).toBeUndefined();

        req.flush({ data: { id: 42, thumbnail_url: '/media/7' }, error: null });
        await fixture.whenStable();
    });

    it('sends the new thumbnail_id when a new image was uploaded', async () => {
        const fixture = await openForEditing();
        const component = fixture.componentInstance;

        component.thumbnailId.set(99);
        component.onSubmit();

        const req = httpMock.expectOne(
            (r) => r.method === 'PUT' && r.url === `${environment.apiUrl}/posts/42`
        );
        expect(req.request.body.thumbnail_id).toBe(99);
        expect(req.request.body.thumbnail_url).toBeUndefined();

        req.flush({ data: { id: 42, thumbnail_url: '/media/99' }, error: null });
        await fixture.whenStable();
    });
});
