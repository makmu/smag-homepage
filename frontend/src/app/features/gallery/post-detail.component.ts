import { Component, input, signal, inject, effect } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { PostService } from '../../core/services/post.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { parseToDisplayParts } from '../../shared/utils/date.utils';

@Component({
    selector: 'app-post-detail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, NgOptimizedImage, SmagLoaderComponent],
    template: `
    <div class="mx-auto mt-6 max-w-4xl">
      <div class="mb-6">
        <a routerLink="/gallery" class="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium">
          <span class="mr-2">←</span> Zurück zur Galerie
        </a>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <smag-loader [size]="48" />
        </div>
      } @else if (post()) {
        <div class="bg-white shadow-md">
          <div class="gallery-viewport relative w-[100vw] -ml-[calc(50vw-50%)]"
               (touchstart)="onTouchStart($event)"
               (touchmove)="onTouchMove($event)"
               (touchend)="onTouchEnd($event)">
            <img 
              [ngSrc]="post()!.thumbnailUrl" 
              [alt]="post()!.title"
              width="800"
              height="500"
              class="w-full h-auto max-h-[500px] object-contain"
            />
            @if (post()?.prevPostId || post()?.nextPostId) {
              <div class="gallery-nav-overlay absolute inset-0 pointer-events-none">
                @if (post()?.prevPostId) {
                  <a [routerLink]="['/gallery', post()!.prevPostId]" 
                     class="nav-prev absolute left-0 top-0 bottom-0 w-[15%] flex items-center justify-start pl-4 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    <div class="rounded-full bg-black/40 p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </a>
                }
                @if (post()?.nextPostId) {
                  <a [routerLink]="['/gallery', post()!.nextPostId]" 
                     class="nav-next absolute right-0 top-0 bottom-0 w-[15%] flex items-center justify-end pr-4 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                    <div class="rounded-full bg-black/40 p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                }
              </div>
            }
          </div>
          <div class="p-4 md:p-6">
            <h1 class="text-3xl font-bold mb-2">{{ post()!.title }}</h1>
            <p class="text-sm text-gray-500 mb-4">{{ formatDate(post()!.date) }}</p>
            <div class="prose prose-gray max-w-none" [innerHTML]="safeHtml(post()!.caption)"></div>
          </div>
        </div>
      } @else {
        <div class="p-6 rounded-lg bg-red-50 text-center text-gray-600">
          <p class="text-lg">Beitrag nicht gefunden.</p>
        </div>
      }
    </div>
  `,
    styles: [`
      .gallery-viewport:hover .gallery-nav-overlay .nav-prev,
      .gallery-viewport:hover .gallery-nav-overlay .nav-next {
        opacity: 1;
      }
    `]
})
export class PostDetailComponent {
    private readonly postService = inject(PostService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly router = inject(Router);

    id = input<number>();
    post = signal<ReturnType<typeof this.postService.getPost> extends import("rxjs").Observable<infer T> ? T : never | null>(null);
    loading = signal(true);
    touchStartX = signal<number | null>(null);
    touchStartY = signal<number | null>(null);
    isSwipeCancelled = signal(false);

    constructor() {
        effect(() => {
            const postId = Number(this.id());
            if (postId) {
                this.loading.set(true);
                this.postService.getPost(postId).subscribe({
                    next: (data) => {
                        this.post.set(data);
                        this.loading.set(false);
                    },
                    error: () => {
                        this.post.set(null);
                        this.loading.set(false);
                    }
                });
            }
        });
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
}