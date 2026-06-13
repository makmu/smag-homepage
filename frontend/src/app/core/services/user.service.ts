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
}