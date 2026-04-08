import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventSignup } from '../../features/events/event-detail.component';
import { EventService, SignupRequest } from '../../core/services/event.service';
import { environment } from '../../../environments/environment';
import { TurnstileComponent } from '../../shared/components/turnstile.component';

@Component({
    selector: 'app-signup-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, TurnstileComponent],
    template: `
        <div 
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
            (click)="onBackdropClick($event)"
        >
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-black bg-opacity-50"></div>
            
            <!-- Dialog -->
            <div 
                class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10"
                (click)="$event.stopPropagation()"
            >
                <!-- Close button -->
                <button 
                    type="button"
                    class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    (click)="onClose()"
                    [disabled]="isSubmitting()"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <h2 class="text-xl font-bold text-gray-900 mb-4">Anmeldung</h2>

                @if (success()) {
                    <div class="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-r">
                        <p class="text-green-800 font-medium">Du bist angemeldet!</p>
                        <p class="text-sm text-green-700 mt-1">Eine Bestätigung wurde an {{ email }} gesendet.</p>
                    </div>
                    <div class="flex justify-end">
                        <button 
                            type="button"
                            class="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium transition-colors"
                            (click)="onClose()"
                        >
                            Schließen
                        </button>
                    </div>
                } @else {
                    @if (error()) {
                        <div class="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r">
                            <p class="text-red-800">{{ error() }}</p>
                        </div>
                    }
                    
                    <form (ngSubmit)="onSubmit()">
                        <!-- Name field -->
                        <div class="mb-4">
                            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                                Name *
                            </label>
                            <input 
                                type="text" 
                                id="name" 
                                [(ngModel)]="name" 
                                name="name"
                                required
                                [disabled]="isSubmitting()"
                                class="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm p-2 border disabled:bg-gray-100"
                                placeholder="Dein Name"
                            />
                            <!-- Public notice for name -->
                            <div class="mt-2 p-2 bg-amber-50 border-l-4 border-amber-400 rounded-r">
                                <p class="text-xs text-amber-800">
                                    <strong>Hinweis:</strong> Dieser Name wird öffentlich auf der Website angezeigt.
                                </p>
                            </div>
                        </div>
                        
                        <!-- Email field -->
                        <div class="mb-4">
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
                            <!-- Email privacy notice -->
                            <div class="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                                <p class="text-xs text-blue-800">
                                    <strong>Hinweis:</strong> Deine E-Mail-Adresse ist nur für die Teamer sichtbar und wird nicht öffentlich angezeigt.
                                </p>
                            </div>
                        </div>
                        
                        <!-- Comment field -->
                        <div class="mb-4">
                            <label for="comment" class="block text-sm font-medium text-gray-700 mb-1">
                                Kommentar (optional)
                            </label>
                            <textarea 
                                id="comment" 
                                [(ngModel)]="comment" 
                                name="comment"
                                rows="3"
                                [disabled]="isSubmitting()"
                                class="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm p-2 border disabled:bg-gray-100"
                                placeholder="z.B. Ich komme 15 min. später"
                            ></textarea>
                            <!-- Public notice for comment -->
                            @if (comment) {
                                <div class="mt-2 p-2 bg-amber-50 border-l-4 border-amber-400 rounded-r">
                                    <p class="text-xs text-amber-800">
                                        <strong>Hinweis:</strong> Dieser Kommentar wird öffentlich auf der Website angezeigt.
                                    </p>
                                </div>
                            }
                        </div>
                        
                        <!-- Turnstile widget -->
                        @if (hasTurnstile) {
                            <app-turnstile [siteKey]="turnstileSiteKey" (tokenChange)="onTokenChange($event)" />
                        }
                        
                        <!-- Buttons -->
                        <div class="flex justify-end gap-3 mt-6">
                            <button 
                                type="button"
                                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                                (click)="close.emit()"
                                [disabled]="isSubmitting()"
                            >
                                Abbrechen
                            </button>
                            <button 
                                type="submit"
                                [disabled]="!name || !email || isSubmitting() || (hasTurnstile && !turnstileToken())"
                                class="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                @if (isSubmitting()) {
                                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                }
                                Anmelden
                            </button>
                        </div>
                    </form>
                }
            </div>
        </div>
    `
})
export class SignupDialogComponent {
    private readonly eventService = inject(EventService);
    readonly turnstileSiteKey: string = environment.turnstileSiteKey;
    get hasTurnstile(): boolean { return !!this.turnstileSiteKey; }

    eventId = input.required<number>();
    close = output<void>();
    signedUp = output<void>();
    signup = output<EventSignup>();
    
    name = '';
    email = '';
    comment = '';

    turnstileToken = signal('');
    isSubmitting = signal(false);
    success = signal(false);
    error = signal<string | null>(null);

    onTokenChange(token: string): void {
        this.turnstileToken.set(token);
    }
    
    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('fixed') && !this.isSubmitting()) {
            this.close.emit();
        }
    }

    onClose(): void {
        this.close.emit();
    }
    
    onSubmit(): void {
        if (!this.name || !this.email || this.isSubmitting()) {
            return;
        }

        if (this.turnstileSiteKey && !this.turnstileToken()) {
            this.error.set('Bitte bestätige, dass du kein Roboter bist.');
            return;
        }
        
        this.isSubmitting.set(true);
        this.error.set(null);

        const request: SignupRequest = {
            name: this.name,
            email: this.email,
            comment: this.comment || undefined,
            cf_turnstile_token: this.turnstileToken() || undefined
        };
        
        this.eventService.signup(this.eventId(), request).subscribe({
            next: (response) => {
                this.isSubmitting.set(false);
                if (response.data) {
                    this.success.set(true);
                    const newSignup: EventSignup = {
                        name: this.name,
                        email: this.email,
                        comment: this.comment || undefined,
                        timestamp: response.data.created_at
                    };
                    this.signup.emit(newSignup);
                    this.signedUp.emit();
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
}