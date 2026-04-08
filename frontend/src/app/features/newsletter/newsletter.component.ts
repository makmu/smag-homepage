import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../core/services/newsletter.service';
import { environment } from '../../../environments/environment';
import { TurnstileComponent } from '../../shared/components/turnstile.component';

@Component({
    selector: 'app-newsletter',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, TurnstileComponent],
    template: `
        <div class="mx-auto mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
            <h1 class="text-3xl font-bold mb-2">Newsletter</h1>
            <p class="mb-6">Melde dich für unseren Newsletter an, um immer auf dem Laufenden zu bleiben.</p>
            
            @if (success()) {
                <div class="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-r">
                    <p class="text-green-800 font-medium">{{ successMessage() }}</p>
                </div>
                <button 
                    type="button"
                    class="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium transition-colors"
                    (click)="resetForm()"
                >
                    Weitere Adresse anmelden
                </button>
            } @else {
                @if (error()) {
                    <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r">
                        <p class="text-red-800">{{ error() }}</p>
                    </div>
                }

                <div class="flex gap-2 mb-6">
                    <button 
                        type="button"
                        class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                        [class.bg-pink-600]="mode() === 'subscribe'"
                        [class.text-white]="mode() === 'subscribe'"
                        [class.bg-gray-200]="mode() !== 'subscribe'"
                        [class.text-gray-700]="mode() !== 'subscribe'"
                        (click)="setMode('subscribe')"
                    >
                        Anmelden
                    </button>
                    <button 
                        type="button"
                        class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                        [class.bg-pink-600]="mode() === 'unsubscribe'"
                        [class.text-white]="mode() === 'unsubscribe'"
                        [class.bg-gray-200]="mode() !== 'unsubscribe'"
                        [class.text-gray-700]="mode() !== 'unsubscribe'"
                        (click)="setMode('unsubscribe')"
                    >
                        Abmelden
                    </button>
                </div>

                <form (ngSubmit)="onSubmit()" class="max-w-md space-y-4">
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                            E-Mail-Adresse *
                        </label>
                        <input 
                            type="email" 
                            id="email" 
                            [(ngModel)]="email" 
                            name="email"
                            required
                            [disabled]="isSubmitting()"
                            class="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm p-2 border disabled:bg-gray-100"
                            placeholder="deine@email.de"
                        />
                    </div>
                    
                    <div>
                        <label for="emailConfirmation" class="block text-sm font-medium text-gray-700 mb-1">
                            E-Mail-Adresse bestätigen *
                        </label>
                        <input 
                            type="email" 
                            id="emailConfirmation" 
                            [(ngModel)]="emailConfirmation" 
                            name="emailConfirmation"
                            required
                            [disabled]="isSubmitting()"
                            class="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm p-2 border disabled:bg-gray-100"
                            placeholder="deine@email.de"
                        />
                    </div>

                    @if (hasTurnstile) {
                        <div class="mb-4">
                            <app-turnstile [siteKey]="turnstileSiteKey" (tokenChange)="onTokenChange($event)" />
                        </div>
                    }

                    <button 
                        type="submit"
                        [disabled]="!email || !emailConfirmation || isSubmitting() || (hasTurnstile && !turnstileToken())"
                        class="w-full py-2 px-4 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        @if (isSubmitting()) {
                            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        }
                        {{ mode() === 'subscribe' ? 'Anmelden' : 'Abmelden' }}
                    </button>
                </form>
            }
        </div>
    `
})
export class NewsletterComponent {
    private readonly newsletterService = inject(NewsletterService);
    readonly turnstileSiteKey: string = environment.turnstileSiteKey;
    get hasTurnstile(): boolean { return !!this.turnstileSiteKey; }

    email = '';
    emailConfirmation = '';

    turnstileToken = signal('');
    mode = signal<'subscribe' | 'unsubscribe'>('subscribe');
    isSubmitting = signal(false);
    success = signal(false);
    successMessage = signal('');
    error = signal<string | null>(null);

    onTokenChange(token: string): void {
        this.turnstileToken.set(token);
    }

    setMode(newMode: 'subscribe' | 'unsubscribe'): void {
        this.mode.set(newMode);
        this.error.set(null);
    }

    onSubmit(): void {
        if (!this.email || !this.emailConfirmation || this.isSubmitting()) {
            return;
        }

        if (this.turnstileSiteKey && !this.turnstileToken()) {
            this.error.set('Bitte bestätige, dass du kein Roboter bist.');
            return;
        }

        this.isSubmitting.set(true);
        this.error.set(null);

        const currentMode = this.mode();
        const request$ = currentMode === 'subscribe'
            ? this.newsletterService.subscribe(this.email, this.emailConfirmation, this.turnstileToken() || undefined)
            : this.newsletterService.unsubscribe(this.email, this.emailConfirmation, this.turnstileToken() || undefined);

        request$.subscribe({
            next: (response) => {
                this.isSubmitting.set(false);
                if (response.data?.message) {
                    this.success.set(true);
                    this.successMessage.set(response.data.message);
                } else if (response.error) {
                    this.error.set(response.error);
                }
            },
            error: (err) => {
                this.isSubmitting.set(false);
                if (err.status === 400 && err.error?.error) {
                    this.error.set(`Ein Fehler ist aufgetreten: ${err.error.error}`);
                } else {
                    this.error.set('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
                }
            }
        });
    }

    resetForm(): void {
        this.email = '';
        this.emailConfirmation = '';
        this.success.set(false);
        this.successMessage.set('');
        this.error.set(null);
        this.turnstileToken.set('');
    }
}