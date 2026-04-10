import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Post {
    id: number;
    thumbnailUrl: string;
    title: string;
    caption: string;
    date: string;
}

export interface PostApiItem {
    id: number;
    thumbnail_url: string;
    title: string;
    caption: string;
    date: string;
}

export interface PostApiResponse {
    data: {
        items: PostApiItem[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            total_pages: number;
        };
    };
}

export interface PostApiResponseSingle {
    data: PostApiFullItem | null;
    error: string | null;
}

export interface PostApiFullItem extends PostApiItem {
    created_at: string;
    updated_at: string;
}

export interface AddPostRequest {
    thumbnail_url: string;
    title: string;
    caption: string;
    date: string;
}

function mapApiToPost(item: PostApiItem): Post {
    return {
        id: item.id,
        thumbnailUrl: item.thumbnail_url,
        title: item.title,
        caption: item.caption,
        date: item.date,
    };
}

@Injectable({ providedIn: 'root' })
export class PostService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getPosts(page: number = 1, limit: number = 20): Observable<{ posts: Post[], pagination: PostApiResponse['data']['pagination'] }> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        return this.http.get<PostApiResponse>(`${this.apiUrl}/posts`, { params }).pipe(
            map(response => ({
                posts: response.data.items.map(mapApiToPost),
                pagination: response.data.pagination
            }))
        );
    }

    getPost(id: number): Observable<Post | null> {
        return this.http.get<{ data: PostApiFullItem | null; error: string | null }>(`${this.apiUrl}/posts/${id}`).pipe(
            map(response => {
                if (response.data) {
                    return mapApiToPost(response.data);
                }
                return null;
            })
        );
    }

    createPost(post: AddPostRequest): Observable<PostApiResponseSingle> {
        return this.http.post<PostApiResponseSingle>(`${this.apiUrl}/posts`, post);
    }

    updatePost(id: number, post: AddPostRequest): Observable<PostApiResponseSingle> {
        return this.http.put<PostApiResponseSingle>(`${this.apiUrl}/posts/${id}`, post);
    }
}