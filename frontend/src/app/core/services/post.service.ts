import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
        pagination: PostPagination;
    };
}

export interface PostPagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export interface PostPage {
    posts: Post[];
    pagination: PostPagination;
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

export interface PostDetail {
    id: number;
    thumbnailUrl: string;
    title: string;
    caption: string;
    date: string;
    createdAt: string;
    updatedAt: string;
    prevPostId: number | null;
    nextPostId: number | null;
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

function toFullThumbnailUrl(thumbUrl: string): string {
    return thumbUrl.startsWith('http') ? thumbUrl : environment.apiUrl + thumbUrl;
}

function mapApiToPost(item: PostApiItem): Post {
    return {
        id: item.id,
        thumbnailUrl: toFullThumbnailUrl(item.thumbnail_url),
        title: item.title,
        caption: item.caption,
        date: item.date,
    };
}

export function toRelativeThumbnailUrl(url: string): string {
    if (url.startsWith(environment.apiUrl)) {
        return url.slice(environment.apiUrl.length);
    }

    const mediaIndex = url.lastIndexOf('/media/');
    return mediaIndex !== -1 ? url.slice(mediaIndex) : url;
}

/**
 * Transforms a raw `GET /posts` body into a page of posts. Used as the `parse` option
 * of an `httpResource`.
 */
export function parsePosts(body: unknown): PostPage {
    const response = body as PostApiResponse;
    return {
        posts: response.data.items.map(mapApiToPost),
        pagination: response.data.pagination,
    };
}

/**
 * Transforms a raw `GET /posts/:id` body into a post, or `null` when the backend reports
 * no such post. Used as the `parse` option of an `httpResource`.
 */
export function parsePostDetail(body: unknown): PostDetail | null {
    const response = body as PostApiResponseSingle;
    if (!response.data) {
        return null;
    }

    const p = response.data;
    return {
        id: p.id,
        thumbnailUrl: toFullThumbnailUrl(p.thumbnail_url),
        title: p.title,
        caption: p.caption,
        date: p.date,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        prevPostId: p.prev_post_id,
        nextPostId: p.next_post_id,
    };
}

@Injectable({ providedIn: 'root' })
export class PostService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    postsUrl(page: number, limit: number = 20): string {
        return `${this.apiUrl}/posts?page=${page}&limit=${limit}`;
    }

    postUrl(id: number): string {
        return `${this.apiUrl}/posts/${id}`;
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