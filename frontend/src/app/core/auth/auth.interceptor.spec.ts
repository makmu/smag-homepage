import { TestBed } from '@angular/core/testing';
import {
    HttpClient,
    HttpErrorResponse,
    provideHttpClient,
    withInterceptors,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
    TestRequest,
} from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';

const apiUrl = environment.apiUrl;
const USER_KEY = 'smag_user';
const TOKEN_KEY = 'smag_token';
const REFRESH_KEY = 'smag_refresh_token';

const unauthorized = { data: null, error: 'Unauthorized' };
const refreshedTokens = {
    data: { access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 3600 },
    error: null,
};

function flushUnauthorized(request: TestRequest): void {
    request.flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
}

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        localStorage.setItem(USER_KEY, JSON.stringify({ email: 'editor@example.com' }));
        localStorage.setItem(TOKEN_KEY, 'access-1');
        localStorage.setItem(REFRESH_KEY, 'refresh-1');

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
            ],
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        httpMock.verify({ ignoreCancelled: true });
    });

    it('fails the refresh response instead of issuing another refresh', () => {
        let failure: HttpErrorResponse | undefined;

        http.post(`${apiUrl}/auth/refresh`, { refresh_token: 'refresh-1' }).subscribe({
            error: (error: HttpErrorResponse) => (failure = error),
        });
        flushUnauthorized(httpMock.expectOne(`${apiUrl}/auth/refresh`));

        expect(failure?.status).toBe(401);
        expect(httpMock.match(() => true)).toHaveLength(0);
        expect(localStorage.getItem(TOKEN_KEY)).toBe('access-1');
        expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
        expect(localStorage.getItem(USER_KEY)).not.toBeNull();
    });

    it('does not refresh after a rejected login', () => {
        let failure: HttpErrorResponse | undefined;

        http.post(`${apiUrl}/auth/login`, { email: 'editor@example.com', password: 'nope' }).subscribe({
            error: (error: HttpErrorResponse) => (failure = error),
        });
        flushUnauthorized(httpMock.expectOne(`${apiUrl}/auth/login`));

        expect(failure?.status).toBe(401);
        expect(httpMock.match(() => true)).toHaveLength(0);
    });

    it('logs out once instead of looping when the refresh token is rejected', () => {
        let failure: HttpErrorResponse | undefined;

        http.get(`${apiUrl}/events`).subscribe({
            error: (error: HttpErrorResponse) => (failure = error),
        });
        flushUnauthorized(httpMock.expectOne(`${apiUrl}/events`));
        flushUnauthorized(httpMock.expectOne(`${apiUrl}/auth/refresh`));
        httpMock.expectOne(`${apiUrl}/auth/logout`).flush({ data: null, error: null });

        expect(failure?.status).toBe(401);
        expect(httpMock.match(() => true)).toHaveLength(0);
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
        expect(localStorage.getItem(USER_KEY)).toBeNull();
    });

    it('shares one refresh between concurrent 401 responses and retries both', () => {
        const retried: string[] = [];

        http.get(`${apiUrl}/events`).subscribe({ next: () => retried.push('events'), error: () => {} });
        http.get(`${apiUrl}/posts`).subscribe({ next: () => retried.push('posts'), error: () => {} });

        const events = httpMock.expectOne(`${apiUrl}/events`);
        const posts = httpMock.expectOne(`${apiUrl}/posts`);
        flushUnauthorized(events);
        flushUnauthorized(posts);

        httpMock.expectOne(`${apiUrl}/auth/refresh`).flush(refreshedTokens);

        const retriedEvents = httpMock.expectOne(`${apiUrl}/events`);
        const retriedPosts = httpMock.expectOne(`${apiUrl}/posts`);
        expect(retriedEvents.request.headers.get('Authorization')).toBe('Bearer access-2');
        expect(retriedPosts.request.headers.get('Authorization')).toBe('Bearer access-2');

        retriedEvents.flush({ data: { items: [] }, error: null });
        retriedPosts.flush({ data: { items: [] }, error: null });

        expect(retried).toEqual(['events', 'posts']);
        expect(localStorage.getItem(TOKEN_KEY)).toBe('access-2');
        expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-2');
    });
});
