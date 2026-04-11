import { Component, input, signal, inject, effect } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
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
        <div class="bg-white rounded-lg shadow-md p-6 md:p-8">
          <div class="gallery-viewport relative inline-block w-full">
            <img 
              [ngSrc]="post()!.thumbnailUrl" 
              [alt]="post()!.title"
              width="800"
              height="500"
              class="w-full h-auto max-h-[500px] object-contain rounded"
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
          <h1 class="text-3xl font-bold mt-6 mb-2">{{ post()!.title }}</h1>
          <p class="text-sm text-gray-500 mb-4">{{ formatDate(post()!.date) }}</p>
          <div class="prose prose-gray max-w-none" [innerHTML]="safeHtml(post()!.caption)"></div>
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

    id = input<number>();
    post = signal<ReturnType<typeof this.postService.getPost> extends import("rxjs").Observable<infer T> ? T : never | null>(null);
    loading = signal(true);

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
}