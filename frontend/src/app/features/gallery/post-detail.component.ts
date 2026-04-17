import { Component, input, signal, inject, effect, DestroyRef, OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { NgOptimizedImage, ViewportScroller } from '@angular/common';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/auth/auth.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { PostModalComponent } from '../../shared/post-modal/post-modal.component';
import { EditablePost, postToEditablePost } from '../../shared/post-modal/post-helpers';
import { parseToDisplayParts } from '../../shared/utils/date.utils';

@Component({
    selector: 'app-post-detail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, NgOptimizedImage, SmagLoaderComponent, PostModalComponent],
    template: `
    <div class="mt-6">
      <div class="flex justify-between items-start mb-6">
        <a routerLink="/gallery" class="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium">
          <span class="mr-2">←</span> Zurück zur Galerie
        </a>
        @if (authService.isEditor() && post()) {
          <button
            type="button"
            (click)="openEditModal()"
            class="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-colors"
            aria-label="Beitrag bearbeiten"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 hover:text-pink-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <smag-loader [size]="48" />
        </div>
      } @else if (post()) {
        <div class="bg-white md:shadow-md md:rounded-lg md:mx-auto md:max-w-[1100px] md:mt-5 md:pt-4">
          <div class="gallery-viewport relative w-full"
               (touchstart)="onTouchStart($event)"
               (touchmove)="onTouchMove($event)"
               (touchend)="onTouchEnd($event)">
            <img 
              [ngSrc]="post()!.thumbnailUrl" 
              [alt]="post()!.title"
              width="800"
              height="500"
              class="w-full h-auto max-h-[500px] object-contain md:rounded-t-lg"
            />
            @if (post()?.prevPostId || post()?.nextPostId) {
              <div class="gallery-nav-overlay absolute inset-0 pointer-events-none">
                @if (post()?.prevPostId) {
                  <a [routerLink]="['/gallery', post()!.prevPostId]" 
                     class="nav-prev absolute left-0 top-0 bottom-0 w-[15%] md:w-[10%] flex items-center justify-start pl-4 md:pl-3 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    <div class="rounded-full bg-black/40 p-2 md:p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-8 md:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </a>
                }
                @if (post()?.nextPostId) {
                  <a [routerLink]="['/gallery', post()!.nextPostId]" 
                     class="nav-next absolute right-0 top-0 bottom-0 w-[15%] md:w-[10%] flex items-center justify-end pr-4 md:pr-3 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    <div class="rounded-full bg-black/40 p-2 md:p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-8 md:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                }
              </div>
            }
          </div>
          <div class="p-5 md:p-6 md:rounded-b-lg">
            <h1 class="text-2xl md:text-3xl font-bold mb-1 md:mb-2">{{ post()!.title }}</h1>
            <p class="text-xs md:text-sm text-gray-400 mb-4 md:mb-4">{{ formatDate(post()!.date) }}</p>
            <div class="prose prose-gray max-w-none mb-4 md:mb-6" [innerHTML]="safeHtml(post()!.caption)"></div>
          </div>
        </div>
      } @else {
        <div class="p-6 rounded-lg bg-red-50 text-center text-gray-600">
          <p class="text-lg">Beitrag nicht gefunden.</p>
        </div>
      }
    </div>

    @if (showEditModal() && post()) {
      <app-post-modal
        [editablePost]="editablePost()"
        (cancelled)="closeEditModal()"
        (saved)="onPostSaved()"
      />
    }
  `,
    styles: [`
      .gallery-viewport:hover .gallery-nav-overlay .nav-prev,
      .gallery-viewport:hover .gallery-nav-overlay .nav-next {
        opacity: 1;
      }
    `]
})
export class PostDetailComponent implements OnDestroy {
    protected readonly authService = inject(AuthService);
    private readonly postService = inject(PostService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly router = inject(Router);
    private readonly viewportScroller = inject(ViewportScroller);
    private readonly destroyRef = inject(DestroyRef);
    private readonly destroy$ = new Subject<void>();

    id = input<number>();
    post = signal<ReturnType<typeof this.postService.getPost> extends import("rxjs").Observable<infer T> ? T : never | null>(null);
    loading = signal(true);
    private hasScrolled = signal(false);
    touchStartX = signal<number | null>(null);
    touchStartY = signal<number | null>(null);
    isSwipeCancelled = signal(false);
    showEditModal = signal(false);
    editablePost = signal<EditablePost | null>(null);

    constructor() {
        effect(() => {
            const postId = Number(this.id());
            if (postId) {
                this.loadPost();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadPost(): void {
        this.loading.set(true);
        const postId = Number(this.id());
        if (postId) {
            this.postService.getPost(postId).pipe(takeUntil(this.destroy$)).subscribe({
                next: (data) => {
                    this.post.set(data);
                    this.loading.set(false);
                    if (!this.hasScrolled()) {
                        this.hasScrolled.set(true);
                        this.viewportScroller.scrollToPosition([0, 0]);
                    }
                },
                error: () => {
                    this.post.set(null);
                    this.loading.set(false);
                }
            });
        }
    }

    formatDate(dateStr: string): string {
        const parts = parseToDisplayParts(dateStr);
        const date = new Date(dateStr);
        const year = date.getFullYear().toString();
        return `${parts.day}. ${parts.month} ${year}`;
    }

    safeHtml(html: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    onTouchStart(event: TouchEvent): void {
        const touch = event.touches[0];
        if (!touch) return;
        this.touchStartX.set(touch.clientX);
        this.touchStartY.set(touch.clientY);
        this.isSwipeCancelled.set(false);
    }

    onTouchMove(event: TouchEvent): void {
        const touch = event.touches[0];
        if (!touch || this.isSwipeCancelled()) return;

        const startY = this.touchStartY();
        if (startY === null) return;

        if (Math.abs(touch.clientY - startY) > 10) {
            this.isSwipeCancelled.set(true);
        }
    }

    onTouchEnd(event: TouchEvent): void {
        if (this.isSwipeCancelled()) {
            this.touchStartX.set(null);
            this.touchStartY.set(null);
            return;
        }

        const startX = this.touchStartX();
        if (startX === null) return;

        const touch = event.changedTouches[0];
        if (!touch) return;

        const endX = touch.clientX;
        const delta = endX - startX;
        const currentPost = this.post();

        if (delta < -50 && currentPost?.nextPostId) {
            this.router.navigate(['/gallery', currentPost.nextPostId]);
        } else if (delta > 50 && currentPost?.prevPostId) {
            this.router.navigate(['/gallery', currentPost.prevPostId]);
        }

        this.touchStartX.set(null);
        this.touchStartY.set(null);
    }

    openEditModal(): void {
        const p = this.post();
        if (!p) return;
        this.editablePost.set({
            id: p.id,
            title: p.title,
            caption: p.caption,
            date: p.date,
            thumbnailUrl: p.thumbnailUrl,
        });
        this.showEditModal.set(true);
    }

    closeEditModal(): void {
        this.showEditModal.set(false);
        this.editablePost.set(null);
    }

    onPostSaved(): void {
        this.closeEditModal();
        this.loadPost();
    }

    refreshPost(): void {
        this.loadPost();
    }
}