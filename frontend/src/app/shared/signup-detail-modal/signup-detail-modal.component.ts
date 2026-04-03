import { Component, input, output, signal, inject, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EventService, SignupDetail } from '../../core/services/event.service';
import { AuthService } from '../../core/auth/auth.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';

@Component({
    selector: 'app-signup-detail-modal',
    imports: [DatePipe, SmagLoaderComponent],
    template: `
        <div 
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
            (click)="onBackdropClick($event)"
        >
            <div class="fixed inset-0 bg-black bg-opacity-50"></div>
            
            <div 
                class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10"
                (click)="$event.stopPropagation()"
            >
                <button 
                    type="button"
                    class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    (click)="close.emit()"
                    [disabled]="loading() || deleting()"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <h2 class="text-xl font-bold text-gray-900 mb-4">Anmeldung Details</h2>

                @if (loading()) {
                    <div class="flex justify-center py-8">
                        <smag-loader [size]="40" />
                    </div>
                } @else if (error()) {
                    <div class="p-4 bg-red-50 border-l-4 border-red-400 rounded-r">
                        <p class="text-red-800">{{ error() }}</p>
                    </div>
                } @else if (signup()) {
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">Name</label>
                            <p class="text-gray-900 font-medium">{{ signup()!.name }}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">E-Mail-Adresse</label>
                            <p class="text-gray-900">
                                <a [href]="'mailto:' + signup()!.email" class="text-pink-600 hover:text-pink-800">
                                    {{ signup()!.email }}
                                </a>
                            </p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">Kommentar</label>
                            @if (signup()!.comment) {
                                <p class="text-gray-900 bg-gray-50 p-3 rounded-lg">{{ signup()!.comment }}</p>
                            } @else {
                                <p class="text-gray-400 italic">Kein Kommentar</p>
                            }
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">Anmeldezeitpunkt</label>
                            <p class="text-gray-900">{{ signup()!.created_at | date:'dd.MM.yyyy HH:mm' }}</p>
                        </div>
                    </div>
                }
                
                <div class="mt-6 flex justify-between gap-3">
                    @if (authService.isEditor()) {
                        <button 
                            type="button"
                            [class]="deleteConfirm() 
                                ? 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors'
                                : 'px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 font-medium transition-colors'"
                            (click)="onDeleteClick()"
                            [disabled]="loading() || deleting()"
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
                    
                    <button 
                        type="button"
                        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        (click)="close.emit()"
                        [disabled]="loading() || deleting()"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    `
})
export class SignupDetailModalComponent {
    private readonly eventService = inject(EventService);
    readonly authService = inject(AuthService);

    eventId = input.required<number>();
    signupId = input.required<number>();
    close = output<void>();

    signup = signal<SignupDetail | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);
    deleteConfirm = signal(false);
    deleting = signal(false);

    private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        effect(() => {
            const eventId = this.eventId();
            const signupId = this.signupId();
            
            if (eventId && signupId) {
                this.fetchSignupDetail(eventId, signupId);
            }
        });
    }

    private fetchSignupDetail(eventId: number, signupId: number): void {
        const token = this.authService.getToken();
        if (!token) {
            this.loading.set(false);
            this.error.set('Nicht autorisiert');
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.eventService.getSignupDetail(eventId, signupId, token).subscribe({
            next: (response) => {
                this.loading.set(false);
                if (response.data) {
                    this.signup.set(response.data);
                } else if (response.error) {
                    this.error.set(response.error);
                }
            },
            error: () => {
                this.loading.set(false);
                this.error.set('Fehler beim Laden der Anmeldedaten');
            }
        });
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

        const token = this.authService.getToken();
        if (!token) {
            this.error.set('Nicht autorisiert');
            return;
        }

        this.deleting.set(true);
        this.eventService.deleteSignup(this.eventId(), this.signupId(), token).subscribe({
            next: (response) => {
                this.deleting.set(false);
                if (response.error) {
                    this.error.set(response.error);
                } else {
                    this.close.emit();
                }
            },
            error: () => {
                this.deleting.set(false);
                this.error.set('Fehler beim Löschen der Anmeldung');
            }
        });
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('fixed')) {
            this.close.emit();
        }
    }
}
