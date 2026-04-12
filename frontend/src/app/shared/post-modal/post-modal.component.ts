import { Component, inject, signal, output, input, ChangeDetectionStrategy, effect, OnDestroy, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntil, Subject } from 'rxjs';
import { MediaService, MediaUploadResponse } from '../../core/services/media.service';
import { PostService, AddPostRequest, UpdatePostRequest, PostFormData } from '../../core/services/post.service';
import { EditablePost } from './post-helpers';

@Component({
    selector: 'app-post-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule],
    template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-modal-title"
    >
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 id="post-modal-title" class="text-xl font-bold text-gray-800">{{ isEditMode() ? 'Beitrag bearbeiten' : 'Neuer Beitrag' }}</h2>
          <button
            type="button"
            (click)="close.emit()"
            class="text-gray-400 hover:text-gray-600"
            aria-label="Schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label for="title" class="mb-1 block text-sm font-medium text-gray-700">Titel *</label>
            <input
              id="title"
              type="text"
              formControlName="title"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div class="mb-4">
            <label for="caption" class="mb-1 block text-sm font-medium text-gray-700">Beschreibung *</label>
            <textarea
              id="caption"
              formControlName="caption"
              rows="3"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            ></textarea>
          </div>

          <div class="mb-4">
            <label for="date" class="mb-1 block text-sm font-medium text-gray-700">Datum *</label>
            <input
              id="date"
              type="date"
              formControlName="date"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div class="mb-4">
            <label for="image" class="mb-1 block text-sm font-medium text-gray-700">Bild *</label>
            <input
              id="image"
              type="file"
              accept="image/jpeg,image/png"
              (change)="onFileSelect($event)"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
            <p class="mt-1 text-xs text-gray-500">JPEG oder PNG, max. 1 MiB</p>
            
            @if (previewUrl()) {
              <div class="mt-2">
                <img [src]="previewUrl()" alt="Vorschau" class="h-32 w-full rounded object-cover" />
              </div>
            }
          </div>

          @if (error()) {
            <p class="mb-4 text-sm text-red-500">{{ error() }}</p>
          }

          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="!isSubmitEnabled() || uploading()"
              class="rounded bg-pink-500 px-4 py-2 text-white transition-colors hover:bg-pink-600 disabled:bg-gray-300"
            >
              @if (uploading()) {
                Wird hochgeladen...
              } @else {
                Speichern
              }
            </button>
            <button
              type="button"
              (click)="close.emit()"
              class="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class PostModalComponent implements OnDestroy {
    close = output<void>();
    saved = output<PostFormData>();

    editablePost = input<EditablePost | null>(null);

    private readonly mediaService = inject(MediaService);
    private readonly postService = inject(PostService);
    private readonly destroy$ = new Subject<void>();

    form = new FormGroup({
        title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        caption: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    });

    thumbnailId = signal<number | null>(null);
    previewUrl = signal<string | null>(null);
    uploading = signal(false);
    error = signal<string | null>(null);

    private existingThumbnailUrl = signal<string | null>(null);

    readonly isEditMode = computed(() => this.editablePost() !== null);

    constructor() {
        effect(() => {
            const editable = this.editablePost();
            if (editable) {
                this.form.patchValue({
                    title: editable.title,
                    caption: editable.caption,
                    date: editable.date,
                });
                this.previewUrl.set(editable.thumbnailUrl);
                this.existingThumbnailUrl.set(editable.thumbnailUrl);
            }
        });
    }

    ngOnDestroy(): void {
        const url = this.previewUrl();
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    onFileSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        if (file.size > 1048576) {
            this.error.set('Datei ist größer als 1 MiB');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.error.set('Nur JPEG und PNG erlaubt');
            return;
        }

        this.previewUrl.set(URL.createObjectURL(file));
        this.error.set(null);
        this.uploadFile(file);
    }

    private uploadFile(file: File): void {
        this.uploading.set(true);
        this.error.set(null);

        this.mediaService.uploadImage(file).pipe(takeUntil(this.destroy$)).subscribe({
            next: (response) => {
                this.uploading.set(false);
                if (response.data) {
                    this.thumbnailId.set(response.data.id);
                } else {
                    this.error.set(response.error || 'Upload fehlgeschlagen');
                }
            },
            error: () => {
                this.uploading.set(false);
                this.error.set('Upload fehlgeschlagen');
            },
        });
    }

    isSubmitEnabled(): boolean {
        const isEdit = this.isEditMode();
        const hasNewThumbnail = this.thumbnailId() !== null;
        const hasExistingThumbnail = this.existingThumbnailUrl() !== null && this.previewUrl() === this.existingThumbnailUrl();

        if (isEdit) {
            return this.form.valid && (hasNewThumbnail || hasExistingThumbnail) && !this.uploading();
        }

        return this.form.valid && hasNewThumbnail && !this.uploading();
    }

    onSubmit(): void {
        if (!this.isSubmitEnabled()) return;

        const isEdit = this.isEditMode();
        const formValue = this.form.getRawValue();
        const newThumbnailId = this.thumbnailId();

        const request: UpdatePostRequest = {
            title: formValue.title,
            caption: formValue.caption,
            date: formValue.date,
        };

        if (isEdit) {
            if (newThumbnailId !== null) {
                (request as AddPostRequest).thumbnail_id = newThumbnailId;
            } else if (this.existingThumbnailUrl()) {
                request.thumbnail_url = this.existingThumbnailUrl()!;
            }
        } else {
            const req = request as AddPostRequest;
            req.thumbnail_id = newThumbnailId!;
        }

        this.saved.emit(request);
    }
}