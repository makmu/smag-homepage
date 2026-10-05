import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { SignupDialogComponent } from './signup-dialog.component';

const apiUrl = environment.apiUrl;

type SignupErrorResponse = { data: null; error: string };

describe('SignupDialogComponent', () => {
    let fixture: ComponentFixture<SignupDialogComponent>;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        (window as unknown as { turnstile?: unknown }).turnstile = { render: () => 'widget-id' };

        await TestBed.configureTestingModule({
            imports: [SignupDialogComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);

        fixture = TestBed.createComponent(SignupDialogComponent);
        fixture.componentRef.setInput('eventId', 1);
        fixture.detectChanges();
    });

    afterEach(() => {
        httpMock.verify({ ignoreCancelled: true });
        delete (window as unknown as { turnstile?: unknown }).turnstile;
    });

    function submit(): void {
        const component = fixture.componentInstance;
        component.name = 'Ada';
        component.email = 'ada@example.com';
        component.turnstileToken.set('token');
        component.onSubmit();
        fixture.detectChanges();
    }

    function flushSignupError(status: number, statusText: string, error: SignupErrorResponse | null): void {
        httpMock.expectOne(`${apiUrl}/events/1/signups`).flush(error, { status, statusText });
        fixture.detectChanges();
    }

    it('shows the backend conflict message when the signup loses the race', () => {
        submit();
        flushSignupError(409, 'Conflict', { data: null, error: 'Signup limit reached' });

        expect(fixture.componentInstance.error()).toBe('Ein Fehler ist aufgetreten: Signup limit reached');
        expect(fixture.componentInstance.isSubmitting()).toBe(false);
    });

    it('shows the backend message for a duplicate signup', () => {
        submit();
        flushSignupError(409, 'Conflict', {
            data: null,
            error: 'You are already signed up for this event',
        });

        expect(fixture.componentInstance.error()).toBe(
            'Ein Fehler ist aufgetreten: You are already signed up for this event'
        );
    });

    it('falls back to a generic message when the backend sends no error', () => {
        submit();
        flushSignupError(500, 'Server Error', null);

        expect(fixture.componentInstance.error()).toBe(
            'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.'
        );
    });
});
