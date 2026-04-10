import { Component, signal, effect, inject } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { PostService, Post } from '../../core/services/post.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { parseToDisplayParts } from '../../shared/utils/date.utils';

interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

@Component({
    selector: 'app-gallery',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgOptimizedImage, SmagLoaderComponent],
    template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <h1 class="text-3xl font-bold mb-6">Galerie</h1>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <smag-loader [size]="48" />
        </div>
      } @else if (error()) {
        <p class="text-red-500">{{ error() }}</p>
      } @else if (posts().length === 0) {
        <p class="text-gray-500 italic mb-8">Noch keine Galerien vorhanden.</p>
      } @else {
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (post of posts(); track post.id) {
            <div class="rounded-lg bg-gray-100 p-4 shadow-sm">
              <img 
                [ngSrc]="post.thumbnailUrl" 
                [alt]="post.title"
                width="400"
                height="300"
                class="mb-4 h-48 w-full rounded object-cover"
              />
              <h3 class="mb-2 text-xl font-bold">{{ post.title }}</h3>
              <p class="text-sm text-gray-600">{{ post.caption }}</p>
              <p class="text-xs text-gray-400 mt-2">{{ formatDate(post.date) }}</p>
            </div>
          }
        </div>

        @if (pagination() && pagination()!.total_pages > 1) {
          <div class="mt-8 flex justify-center gap-2">
            @for (p of [].constructor(pagination()!.total_pages); track $index) {
              <button 
                (click)="loadPage($index + 1)"
                class="rounded px-3 py-1 transition-colors"
                [class.bg-blue-500]="pagination()!.page === $index + 1"
                [class.text-white]="pagination()!.page === $index + 1"
                [class.bg-gray-200]="pagination()!.page !== $index + 1"
                [class.hover:bg-gray-300]="pagination()!.page !== $index + 1"
              >
                {{ $index + 1 }}
              </button>
            }
          </div>
        }
      }
    </div>
  `
})
export class GalleryComponent {
    protected readonly parseToDisplayParts = parseToDisplayParts;

    private readonly postService = inject(PostService);

    posts = signal<Post[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    pagination = signal<Pagination | null>(null);

    constructor() {
        effect(() => {
            this.loading.set(true);
            this.error.set(null);

            this.postService.getPosts().subscribe({
                next: (response) => {
                    this.posts.set(response.posts);
                    this.pagination.set(response.pagination);
                    this.loading.set(false);
                },
                error: (err) => {
                    console.error('Failed to load posts:', err);
                    this.error.set('Fehler beim Laden der Galerie.');
                    this.loading.set(false);
                }
            });
        });
    }

    formatDate(dateStr: string): string {
        const parts = parseToDisplayParts(dateStr);
        const date = new Date(dateStr);
        const year = date.getFullYear().toString();
        return `${parts.day}. ${parts.month} ${year}`;
    }

    loadPage(page: number): void {
        this.loading.set(true);

        this.postService.getPosts(page).subscribe({
            next: (response) => {
                this.posts.set(response.posts);
                this.pagination.set(response.pagination);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load posts:', err);
                this.error.set('Fehler beim Laden der Galerie.');
                this.loading.set(false);
            }
        });
    }
}