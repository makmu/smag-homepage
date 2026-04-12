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
    prev_post_id: number | null;
    next_post_id: number | null;
}

export interface AddPostRequest {
    thumbnail_id: number;
    title: string;
    caption: string;
    date: string;
}

export interface UpdatePostRequest {
    thumbnail_id?: number;
    thumbnail_url?: string;
    title: string;
    caption: string;
    date: string;
}

export type PostFormData = AddPostRequest | UpdatePostRequest;

function mapApiToPost(item: PostApiItem): Post {
    const thumbUrl = item.thumbnail_url;
    const fullUrl = thumbUrl.startsWith('http')
        ? thumbUrl
        : environment.apiUrl + thumbUrl;

    return {
        id: item.id,
        thumbnailUrl: fullUrl,
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

    getPost(id: number): Observable<{ id: number; thumbnailUrl: string; title: string; caption: string; date: string; createdAt: string; updatedAt: string; prevPostId: number | null; nextPostId: number | null } | null> {
        return this.http.get<{ data: PostApiFullItem | null; error: string | null }>(`${this.apiUrl}/posts/${id}`).pipe(
            map(response => {
                if (response.data) {
                    const p = response.data;
                    const thumbUrl = p.thumbnail_url;
                    const fullUrl = thumbUrl.startsWith('http')
                        ? thumbUrl
                        : environment.apiUrl + thumbUrl;

                    return {
                        id: p.id,
                        thumbnailUrl: fullUrl,
                        title: p.title,
                        caption: p.caption,
                        date: p.date,
                        createdAt: p.created_at,
                        updatedAt: p.updated_at,
                        prevPostId: p.prev_post_id,
                        nextPostId: p.next_post_id,
                    };
                }
                return null;
            })
        );
    }

    createPost(post: AddPostRequest): Observable<PostApiResponseSingle> {
        return this.http.post<PostApiResponseSingle>(`${this.apiUrl}/posts`, post);
    }

    updatePost(id: number, post: UpdatePostRequest): Observable<PostApiResponseSingle> {
        return this.http.put<PostApiResponseSingle>(`${this.apiUrl}/posts/${id}`, post);
    }

    deletePost(id: number): Observable<PostApiResponseSingle> {
        return this.http.delete<PostApiResponseSingle>(`${this.apiUrl}/posts/${id}`);
    }
}