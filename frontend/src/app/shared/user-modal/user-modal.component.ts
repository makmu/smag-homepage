import { Component, inject, signal, output, input, computed, effect, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntil, Subject } from 'rxjs';
import { MediaService } from '../../core/services/media.service';
import { UserService, CreateUserRequest, UpdateUserRequest } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { SmagLoaderComponent } from '../loader/loader.component';

@Component({
    selector: 'app-user-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, SmagLoaderComponent],
    host: {
        '(document:keydown.escape)': 'onEscapeKey()',
    },
    template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      (click)="onBackdropClick($event)"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 id="user-modal-title" class="text-xl font-bold text-gray-800">{{ isEditMode() ? 'Benutzer bearbeiten' : 'Neuer Benutzer' }}</h2>
          <button
            type="button"
            (click)="cancelled.emit()"
            class="text-gray-400 hover:text-gray-600"
            aria-label="Schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        @if (loading()) {
          <div class="flex justify-center py-8">
            <smag-loader [size]="48" />
          </div>
        } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label for="name" class="mb-1 block text-sm font-medium text-gray-700">Anzeigename *</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div class="mb-4">
            <label for="email" class="mb-1 block text-sm font-medium text-gray-700">E-Mail-Adresse *</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div class="mb-4">
            <label for="password" class="mb-1 block text-sm font-medium text-gray-700">Passwort {{ isEditMode() ? '' : '*' }}</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
            @if (form.get('password')?.value) {
              <div class="mt-2">
                <div class="flex items-center gap-2">
                  <div class="h-2 flex-1 rounded-full bg-gray-200">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      [class]="getPasswordStrengthBarClass()"
                      [style.width.%]="getPasswordStrengthPercent()"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500">{{ getPasswordStrengthLabel() }}</span>
                </div>
              </div>
            }
          </div>

          <div class="mb-4">
            <label for="passwordConfirm" class="mb-1 block text-sm font-medium text-gray-700">Passwort bestätigen {{ isEditMode() ? '' : '*' }}</label>
            <input
              id="passwordConfirm"
              type="password"
              formControlName="passwordConfirm"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
            @if (form.get('passwordConfirm')?.value && !passwordsMatch()) {
              <p class="mt-1 text-xs text-red-500">Passwörter stimmen nicht überein</p>
            }
          </div>

          <div class="mb-4">
            <label for="avatar" class="mb-1 block text-sm font-medium text-gray-700">Avatar (optional)</label>
            <input
              id="avatar"
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
              [disabled]="!isSubmitEnabled() || uploading() || saving() || deleting()"
              class="rounded bg-pink-500 px-4 py-2 text-white transition-colors hover:bg-pink-600 disabled:bg-gray-300"
            >
              @if (uploading()) {
                Wird hochgeladen...
              } @else if (saving()) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isEditMode() ? 'Speichere...' : 'Erstelle...' }}
                </span>
              } @else {
                {{ isEditMode() ? 'Speichern' : 'Erstellen' }}
              }
            </button>
            <button
              type="button"
              (click)="cancelled.emit()"
              [disabled]="uploading() || saving() || deleting()"
              class="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:bg-gray-200 disabled:text-gray-400"
            >
              Abbrechen
            </button>
            @if (isEditMode() && authService.isEditor()) {
              <button
                type="button"
                [class]="deleteConfirm()
                  ? 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors'
                  : 'px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 font-medium transition-colors'"
                (click)="onDeleteClick()"
                [disabled]="uploading() || saving() || deleting()"
              >
                @if (deleting()) {
                  <span class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Lösche...
                  </span>
                } @else if (deleteConfirm()) {
                  Erneut klicken zum Bestätigen
                } @else {
                  Löschen
                }
              </button>
            }
          </div>
        </form>
        }
      </div>
    </div>
  `,
})
export class UserModalComponent implements OnDestroy {
    userId = input<number | null>(null);
    readonly isEditMode = computed(() => this.userId() !== null);
    
    cancelled = output<void>();
    saved = output<void>();

    private readonly mediaService = inject(MediaService);
    private readonly userService = inject(UserService);
    readonly authService = inject(AuthService);
    private readonly destroy$ = new Subject<void>();
    private loadedUserId: number | null = null;

    form = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
        password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
        passwordConfirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    });

    previewUrl = signal<string | null>(null);
    imageUrl = signal<string | null>(null);
    uploading = signal(false);
    saving = signal(false);
    loading = signal(false);
    error = signal<string | null>(null);

    deleteConfirm = signal(false);
    deleting = signal(false);
    private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        effect(() => {
            const id = this.userId();
            if (id !== this.loadedUserId) {
                this.loadedUserId = id;
                if (id) {
                    this.form.get('password')?.setValidators([Validators.minLength(8)]);
                    this.form.get('password')?.updateValueAndValidity();
                    this.form.get('passwordConfirm')?.clearValidators();
                    this.form.get('passwordConfirm')?.updateValueAndValidity();
                    this.loadUser(id);
                } else {
                    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
                    this.form.get('password')?.updateValueAndValidity();
                    this.form.get('passwordConfirm')?.setValidators([Validators.required]);
                    this.form.get('passwordConfirm')?.updateValueAndValidity();
                    this.form.reset({ name: '', email: '', password: '', passwordConfirm: '' });
                    this.previewUrl.set(null);
                    this.imageUrl.set(null);
                }
            }
        });
    }

    getPasswordStrength(): number {
        const pw = this.form.get('password')?.value ?? '';
        let score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score;
    }

    getPasswordStrengthLabel(): string {
        const score = this.getPasswordStrength();
        if (score <= 2) return 'Schwach';
        if (score <= 4) return 'Mittel';
        return 'Stark';
    }

    getPasswordStrengthBarClass(): string {
        const score = this.getPasswordStrength();
        if (score <= 2) return 'bg-red-500';
        if (score <= 4) return 'bg-yellow-500';
        return 'bg-green-500';
    }

    getPasswordStrengthPercent(): number {
        const score = this.getPasswordStrength();
        return Math.min((score / 6) * 100, 100);
    }

    passwordsMatch(): boolean {
        const pw = this.form.get('password')?.value ?? '';
        const confirm = this.form.get('passwordConfirm')?.value ?? '';
        return pw === confirm && confirm.length > 0;
    }

    isSubmitEnabled(): boolean {
        const isEdit = this.isEditMode();
        const pw = this.form.get('password')?.value ?? '';
        const hasPassword = pw.length > 0;

        if (isEdit) {
            return this.form.get('name')!.valid
                && this.form.get('email')!.valid
                && (!hasPassword || (this.form.get('password')!.valid && this.passwordsMatch()))
                && !this.uploading()
                && !this.saving()
                && !this.loading();
        }
        return this.form.valid
            && this.passwordsMatch()
            && !this.uploading()
            && !this.saving();
    }

    ngOnDestroy(): void {
        const url = this.previewUrl();
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        if (this.deleteTimeout) {
            clearTimeout(this.deleteTimeout);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    onEscapeKey(): void {
        this.cancelled.emit();
    }

    onDeleteClick(): void {
        if (this.deleteConfirm()) {
            this.performDelete();
        } else {
            this.deleteConfirm.set(true);
            this.resetDeleteTimeout();
        }
    }

    private resetDeleteTimeout(): void {
        if (this.deleteTimeout) {
            clearTimeout(this.deleteTimeout);
        }
        this.deleteTimeout = setTimeout(() => {
            this.deleteConfirm.set(false);
        }, 5000);
    }

    private performDelete(): void {
        if (this.deleteTimeout) {
            clearTimeout(this.deleteTimeout);
        }

        const id = this.userId();
        if (!id) {
            this.error.set('Benutzer nicht gefunden');
            return;
        }

        this.deleting.set(true);
        this.userService.deleteUser(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: (response) => {
                this.deleting.set(false);
                if (response.error) {
                    this.error.set(response.error);
                } else {
                    this.saved.emit();
                }
            },
            error: () => {
                this.deleting.set(false);
                this.error.set('Fehler beim Löschen des Benutzers');
            }
        });
    }

    private loadUser(id: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.userService.getUser(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: (user) => {
                this.loading.set(false);
                if (user) {
                    this.form.patchValue({
                        name: user.name,
                        email: user.email,
                        password: '',
                        passwordConfirm: '',
                    });
                    if (user.imageUrl) {
                        this.imageUrl.set(user.imageUrl);
                        this.previewUrl.set(user.imageUrl);
                    }
                } else {
                    this.error.set('Benutzer nicht gefunden');
                }
            },
            error: (err) => {
                this.loading.set(false);
                if (err.error?.error) {
                    this.error.set(err.error.error);
                } else {
                    this.error.set('Fehler beim Laden des Benutzers');
                }
            }
        });
    }

    onBackdropClick(event: Event): void {
        if (event.target === event.currentTarget) {
            this.cancelled.emit();
        }
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
                    this.imageUrl.set(response.data.url);
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

    onSubmit(): void {
        if (!this.isSubmitEnabled()) return;

        const formValue = this.form.getRawValue();
        this.saving.set(true);
        this.error.set(null);

        const obs = this.isEditMode()
            ? this.userService.updateUser(this.userId()!, {
                name: formValue.name,
                email: formValue.email,
                password: formValue.password || undefined,
                image_url: this.imageUrl() ?? undefined,
            })
            : this.userService.createUser({
                name: formValue.name,
                email: formValue.email,
                password: formValue.password,
                image_url: this.imageUrl() ?? undefined,
            });

        obs.pipe(takeUntil(this.destroy$)).subscribe({
            next: (response) => {
                this.saving.set(false);
                if (response.error) {
                    this.error.set(response.error);
                } else {
                    this.saved.emit();
                }
            },
            error: (err) => {
                this.saving.set(false);
                if (err.status === 409) {
                    this.error.set('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.');
                } else if (err.error?.error) {
                    this.error.set(err.error.error);
                } else {
                    this.error.set(this.isEditMode()
                        ? 'Fehler beim Aktualisieren des Benutzers.'
                        : 'Fehler beim Erstellen des Benutzers.');
                }
            }
        });
    }
}