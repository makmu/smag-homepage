import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface MediaUploadResponse {
    data: {
        id: number;
        url: string;
        filename: string;
    } | null;
    error: string | null;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    uploadImage(file: File): Observable<MediaUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<MediaUploadResponse>(`${this.apiUrl}/media`, formData);
    }
}