import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface TeamMember {
    id: number;
    name: string;
    imageUrl: string | null;
}

interface UserApiItem {
    id: number;
    name: string;
    image_url: string | null;
}

interface UserApiResponse {
    data: {
        items: UserApiItem[];
    };
    error: null;
}

export interface CreateUserRequest {
    name: string;
    email: string;
    password: string;
    image_url?: string;
}

export interface CreateUserApiResponse {
    data: {
        id: number;
        name: string;
        email: string;
    } | null;
    error: string | null;
}

export interface EditableUser {
    id: number;
    name: string;
    email: string;
    imageUrl: string | null;
}

export interface UpdateUserRequest {
    name: string;
    email: string;
    password?: string;
    image_url?: string;
}

interface UserApiSingleItem {
    id: number;
    name: string;
    email: string;
    image_url: string | null;
}

interface UserApiResponseSingle {
    data: UserApiSingleItem | null;
    error: string | null;
}

function mapApiToTeamMember(item: UserApiItem): TeamMember {
    return {
        id: item.id,
        name: item.name,
        imageUrl: item.image_url,
    };
}

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getUsers(): Observable<TeamMember[]> {
        return this.http.get<UserApiResponse>(`${this.apiUrl}/users`).pipe(
            map(response => response.data.items.map(mapApiToTeamMember))
        );
    }

    createUser(request: CreateUserRequest): Observable<CreateUserApiResponse> {
        return this.http.post<CreateUserApiResponse>(`${this.apiUrl}/users`, request);
    }

    getUser(id: number): Observable<EditableUser | null> {
        return this.http.get<UserApiResponseSingle>(`${this.apiUrl}/users/${id}`).pipe(
            map(response => {
                if (response.data) {
                    return {
                        id: response.data.id,
                        name: response.data.name,
                        email: response.data.email,
                        imageUrl: response.data.image_url,
                    };
                }
                return null;
            })
        );
    }

    updateUser(id: number, request: UpdateUserRequest): Observable<CreateUserApiResponse> {
        return this.http.put<CreateUserApiResponse>(`${this.apiUrl}/users/${id}`, request);
    }
}