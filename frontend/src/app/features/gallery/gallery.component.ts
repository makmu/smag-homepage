import { Component, signal, inject, OnInit } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PostService, Post } from '../../core/services/post.service';
import { AuthService } from '../../core/auth/auth.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { PostModalComponent } from '../../shared/post-modal/post-modal.component';
import { EditablePost, postToEditablePost } from '../../shared/post-modal/post-helpers';
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
    imports: [NgOptimizedImage, SmagLoaderComponent, PostModalComponent, RouterLink],
    template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-bold">Galerie</h1>
        @if (authService.isEditor()) {
          <button
            (click)="showModal.set(true)"
            class="rounded bg-pink-500 px-4 py-2 text-white transition-colors hover:bg-pink-600"
          >
            + Neuer Beitrag
          </button>
        }
      </div>

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
            <div class="group relative rounded-lg bg-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <a [routerLink]="['/gallery', post.id]" class="block">
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
              </a>
              @if (authService.isEditor()) {
                <button
                  type="button"
                  (click)="openEditModal(post)"
                  class="absolute top-2 right-2 rounded-full bg-white p-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-pink-50"
                  aria-label="Beitrag bearbeiten"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 hover:text-pink-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              }
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

    @if (showModal()) {
      <app-post-modal
        [editablePost]="editingPost()"
        (cancelled)="closeModal()"
        (saved)="onPostSaved()"
      />
    }
  `
})
export class GalleryComponent implements OnInit {
    protected readonly parseToDisplayParts = parseToDisplayParts;
    protected readonly authService = inject(AuthService);

    private readonly postService = inject(PostService);

protected posts = signal<Post[]>([]);
    protected loading = signal(true);
    protected error = signal<string | null>(null);
    protected showModal = signal(false);
    protected editingPost = signal<EditablePost | null>(null);
    protected pagination = signal<Pagination | null>(null);

    ngOnInit(): void {
        this.loadPage(1);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.editingPost.set(null);
    }

    openEditModal(post: Post): void {
        this.editingPost.set(postToEditablePost(post));
        this.showModal.set(true);
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

    onPostSaved(): void {
        this.closeModal();
        this.loadPage(1);
    }
}