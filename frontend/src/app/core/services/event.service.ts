import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SignupType } from '../../shared/event-modal/event-modal.component';
import { AuthService } from '../auth/auth.service';

interface EventApiItem {
    id: number;
    title: string;
    teaser: string;
    location: string;
    date: string;
}

interface EventApiResponse {
    data: {
        items: EventApiItem[];
    };
}

interface EventApiResponseSingle {
    data: EventApiFullItem | null;
    error: string | null;
}

export interface EventApiFullItem {
    id: number;
    title: string;
    teaser: string;
    location: string;
    date: string;
    description: string;
    signup_type: SignupType;
    signup_deadline: string | null;
    signup_limit: number | null;
    signup_instructions: string | null;
    created_at: string;
    updated_at: string;
    signups: Array<{
        id: number;
        name: string;
        comment: string | null;
    }>;
}

export interface Event {
    id: number;
    date: string;
    location: string;
    description: string;
    fullDescription: string;
    title: string;
    teaser: string;
    signupType: 'none' | 'instructions' | 'open';
    signupInstructions?: string;
    signupLimit?: number;
    signupDeadline?: string;
    currentSignups?: number;
    signups: Array<{
        id: number;
        name: string;
        comment: string | null;
    }>;
}

export interface AddEventRequest {
    title: string;
    teaser: string;
    location: string;
    date: string;
    description: string;
    signup_type: SignupType;
    signup_deadline: string | null;
    signup_limit: number | null;
    signup_instructions: string | null;
}

export interface SignupRequest {
    name: string;
    email: string;
    comment?: string;
    cf_turnstile_token?: string;
}

export interface SignupResponse {
    data: {
        id: number;
        event_id: number;
        name: string;
        comment: string | null;
        created_at: string;
    } | null;
    error: string | null;
}

export interface SignupDetail {
    id: number;
    name: string;
    email: string;
    comment: string | null;
    created_at: string;
}

export interface SignupDetailResponse {
    data: SignupDetail | null;
    error: string | null;
}

function mapApiToEvent(item: EventApiItem): Event {
    return {
        id: item.id,
        title: item.title,
        date: item.date,
        teaser: item.teaser,
        location: item.location,
        description: item.teaser,
        fullDescription: item.teaser,
        signupType: 'none',
        signups: [],
    };
}

function mapApiToFullEvent(item: EventApiFullItem): Event {
    let signupType: 'none' | 'instructions' | 'open' = 'none';
    let signupInstructions: string | undefined;
    let signupLimit: number | undefined;
    let signupDeadline: string | undefined;
    let currentSignups: number | undefined;
    let signups: Event['signups'] = [];

    if (item.signups) {
        signups = item.signups.map(s => ({
            id: s.id,
            name: s.name,
            comment: s.comment
        }));
        currentSignups = signups.length;
    }

    switch (item.signup_type) {
        case 'none':
            signupType = 'none';
            break;
        case 'on_site':
            signupType = 'open';
            if (item.signup_limit) {
                signupLimit = item.signup_limit;
            }
            if (item.signup_deadline) {
                signupDeadline = item.signup_deadline;
            }
            break;
        case 'special':
            signupType = 'instructions';
            signupInstructions = item.signup_instructions ?? undefined;
            break;
    }

    return {
        id: item.id,
        title: item.title,
        date: item.date,
        teaser: item.teaser,
        location: item.location,
        description: item.teaser,
        fullDescription: item.description,
        signupType,
        signupInstructions,
        signupLimit,
        signupDeadline,
        currentSignups,
        signups,
    };
}

@Injectable({ providedIn: 'root' })
export class EventService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly apiUrl = environment.apiUrl;

    getEvents(): Observable<Event[]> {
        const showAll = this.auth.isLoggedIn();
        const params = new HttpParams().set('include_past', showAll ? 'true' : 'false');
        
        return this.http.get<EventApiResponse>(`${this.apiUrl}/events`, { params }).pipe(
            map(response => response.data.items.map(mapApiToEvent))
        );
    }

    getEvent(id: number): Observable<Event | null> {
        return this.http.get<{ data: EventApiFullItem | null; error: string | null }>(`${this.apiUrl}/events/${id}`).pipe(
            map(response => {
                if (response.data) {
                    return mapApiToFullEvent(response.data);
                }
                return null;
            })
        );
    }

    createEvent(event: AddEventRequest): Observable<EventApiResponseSingle> {
        return this.http.post<EventApiResponseSingle>(`${this.apiUrl}/events`, event);
    }

    updateEvent(id: number, event: AddEventRequest): Observable<EventApiResponseSingle> {
        return this.http.put<EventApiResponseSingle>(`${this.apiUrl}/events/${id}`, event);
    }

    signup(eventId: number, request: SignupRequest): Observable<SignupResponse> {
        return this.http.post<SignupResponse>(`${this.apiUrl}/events/${eventId}/signups`, request);
    }

    downloadSignupsCsv(eventId: number, token: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/events/${eventId}/signups/csv`, {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` }
        });
    }

    getSignupDetail(eventId: number, signupId: number, token: string): Observable<SignupDetailResponse> {
        return this.http.get<SignupDetailResponse>(`${this.apiUrl}/events/${eventId}/signups/${signupId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }

    deleteSignup(eventId: number, signupId: number, token: string): Observable<{ data: { deleted: boolean } | null; error: string | null }> {
        return this.http.delete<{ data: { deleted: boolean } | null; error: string | null }>(`${this.apiUrl}/events/${eventId}/signups/${signupId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
}
