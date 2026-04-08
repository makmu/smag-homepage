import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface NewsletterRequest {
    email: string;
    email_confirmation: string;
    action: 'subscribe' | 'unsubscribe';
    cf_turnstile_token?: string;
}

export interface NewsletterResponse {
    data: {
        message?: string;
    } | null;
    error: string | null;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    subscribe(email: string, emailConfirmation: string, turnstileToken?: string): Observable<NewsletterResponse> {
        const request: NewsletterRequest = {
            email,
            email_confirmation: emailConfirmation,
            action: 'subscribe',
            cf_turnstile_token: turnstileToken || undefined
        };

        return this.http.post<NewsletterResponse>(`${this.apiUrl}/newsletter/subscribe`, request);
    }

    unsubscribe(email: string, emailConfirmation: string, turnstileToken?: string): Observable<NewsletterResponse> {
        const request: NewsletterRequest = {
            email,
            email_confirmation: emailConfirmation,
            action: 'unsubscribe',
            cf_turnstile_token: turnstileToken || undefined
        };

        return this.http.post<NewsletterResponse>(`${this.apiUrl}/newsletter/unsubscribe`, request);
    }
}