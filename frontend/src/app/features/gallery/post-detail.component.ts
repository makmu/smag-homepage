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
      <div class="mb-6 flex justify-between items-center">
        <a routerLink="/gallery" class="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium">
          <span class="mr-2">←</span> Zurück zur Galerie
        </a>
        @if (post()?.prevPostId || post()?.nextPostId) {
          <div class="flex gap-2">
            @if (post()?.prevPostId) {
              <a [routerLink]="['/gallery', post()!.prevPostId]" 
                 class="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                 ← Zurück
              </a>
            }
            @if (post()?.nextPostId) {
              <a [routerLink]="['/gallery', post()!.nextPostId]" 
                 class="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                 Weiter →
              </a>
            }
          </div>
        }
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <smag-loader [size]="48" />
        </div>
      } @else if (post()) {
        <div class="bg-white rounded-lg shadow-md p-6 md:p-8">
          <img 
            [ngSrc]="post()!.thumbnailUrl" 
            [alt]="post()!.title"
            width="800"
            height="500"
            class="w-full h-auto max-h-[500px] object-contain rounded mb-6"
          />
          <h1 class="text-3xl font-bold mb-2">{{ post()!.title }}</h1>
          <p class="text-sm text-gray-500 mb-4">{{ formatDate(post()!.date) }}</p>
          <div class="prose prose-gray max-w-none" [innerHTML]="safeHtml(post()!.caption)"></div>
        </div>
      } @else {
        <div class="p-6 rounded-lg bg-red-50 text-center text-gray-600">
          <p class="text-lg">Beitrag nicht gefunden.</p>
        </div>
      }
    </div>
  `
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