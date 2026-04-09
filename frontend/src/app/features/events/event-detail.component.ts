import { Component, input, signal, inject, effect, computed } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ORANGE_STYLE } from '../../core/constants/theme-colors';
import { SignupDialogComponent } from '../../shared/components/signup-dialog.component';
import { EventModalComponent, EditableEvent } from '../../shared/event-modal/event-modal.component';
import { SignupDetailModalComponent } from '../../shared/signup-detail-modal/signup-detail-modal.component';
import { EventService, Event, AddEventRequest } from '../../core/services/event.service';
import { AuthService } from '../../core/auth/auth.service';
import { eventToEditableEvent } from './event-helpers';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { parseToDisplayParts } from '../../shared/utils/date.utils';

export interface EventSignup {
    name: string;
    email: string;
    comment?: string;
    timestamp: string;
}

@Component({
    selector: 'app-event-detail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, DatePipe, SignupDialogComponent, EventModalComponent, SignupDetailModalComponent, SmagLoaderComponent],
    template: `
    <div class="mx-auto mt-6">
      <div class="flex justify-between items-start mb-6">
        <a routerLink="/" class="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium">
          <span class="mr-2">←</span> Zurück zur Übersicht
        </a>
        @if (authService.isEditor() && event()) {
          <button
            type="button"
            (click)="openEditModal()"
            class="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-colors"
            aria-label="Veranstaltung bearbeiten"
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
    } @else if (event()) {
        <div 
          class="bg-white rounded-lg shadow-md overflow-hidden"
          [style.border-left]="'5px solid ' + ORANGE_STYLE.color"
        >
          <div class="p-6 md:p-8">
            <div class="flex flex-col md:flex-row gap-6 mb-6">
              <div class="w-full md:w-32 shrink-0 flex flex-row md:flex-col items-center md:items-start justify-center md:justify-start gap-2">
                <span class="text-5xl font-bold" [style.color]="ORANGE_STYLE.text">{{ eventDay() }}</span>
                <span class="text-xl font-semibold uppercase" [style.color]="ORANGE_STYLE.text">{{ eventMonth() }}</span>
              </div>
              
              <div class="flex-1 flex items-center">
                <h1 class="text-3xl font-bold text-gray-900">{{ event()!.title }}</h1>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-6 text-gray-700 font-medium mb-6">
              <div class="flex items-center gap-2">
                <span>🕒</span>
                <span><strong>{{ eventTime() }} Uhr</strong></span>
              </div>
              <div class="flex items-center gap-2">
                <span>📍</span>
                <span>{{ event()!.location }}</span>
              </div>
            </div>
            
            <div class="border-t border-gray-200 pt-6 prose prose-gray max-w-none" [innerHTML]="event()!.fullDescription"></div>
            
            <div class="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
              @switch (event()!.signupType) {
                @case ('none') {
                  <p class="text-gray-700">
                    <span class="font-bold text-green-700">Keine Anmeldung nötig</span> – einfach vorbeikommen!<br/> Bei Fragen melde dich bei 
                    <a href="mailto:smag@fliederlich.de" class="text-pink-600 hover:text-pink-800">smag@fliederlich.de</a> oder in unserer WhatsApp-Gruppe.
                  </p>
                }
                @case ('instructions') {
                  <p class="text-gray-700">
                    {{ event()!.signupInstructions }}
                  </p>
                }
                @case ('open') {
                  <div>
                    @if (isSignupLimitReached(event()!)) {
                      <div class="mb-4">
                        <p class="text-blue-900 font-bold text-lg mb-2">
                          <span class="mr-2">🔒</span>Anmeldung nicht mehr möglich – alle Plätze sind belegt.
                        </p>
                        @if (event()!.signupLimit && event()!.currentSignups !== undefined) {
                          <div class="mb-1">
                            <div class="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                              <div class="h-full w-full bg-blue-600 rounded-full"></div>
                            </div>
                            <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide mt-1">
                              Alle Plätze belegt ({{ event()!.currentSignups }}/{{ event()!.signupLimit }})
                            </p>
                          </div>
                        }
                      </div>
                    } @else {
                      @if (isSignupOpen(event()!)) {
                        <button 
                          type="button"
                          class="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium transition-colors"
                          (click)="showSignupDialog.set(true)"
                        >
                          Anmelden
                        </button>
                        @if (event()!.signupLimit && event()!.currentSignups !== undefined) {
                          <div class="mt-3">
                            <div class="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                              <div 
                                class="h-full bg-blue-600 rounded-full transition-all"
                                [style.width]="(event()!.currentSignups! / event()!.signupLimit! * 100) + '%'"
                              ></div>
                            </div>
                            <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide mt-1">
                              {{ event()!.currentSignups }} / {{ event()!.signupLimit }} Plätze belegt
                            </p>
                          </div>
                        }
                      } @else {
                        <p class="text-gray-700 font-medium mb-4">
                          Die Anmeldung ist geschlossen.
                        </p>
                      }
                    }
                    @if (event()!.signupDeadline) {
                      <p class="text-sm text-blue-600 italic border-t border-blue-200 pt-3 mt-3">
                        Anmeldung möglich bis: {{ event()!.signupDeadline | date:'dd.MM.yyyy HH:mm' }}
                      </p>
                    }
                  </div>
                }
              }
            </div>

            @if (event()!.signups && event()!.signups.length > 0) {
              <div class="mt-8">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg font-bold text-gray-900">Anmeldungen ({{ event()!.signups.length }})</h3>
                  <div class="flex items-center gap-3">
                    @if (csvDownloadError()) {
                      <span class="text-sm text-red-600">{{ csvDownloadError() }}</span>
                    }
                    @if (authService.isEditor() && event()!.signups.length > 0) {
                      <button
                        type="button"
                        (click)="downloadSignupsCsv()"
                        class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-pink-600 bg-white border border-gray-200 rounded-md hover:border-pink-300 transition-colors"
                        aria-label="Anmeldungen als CSV herunterladen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                        CSV
                      </button>
                    }
                  </div>
                </div>
                <div class="space-y-3">
                  @for (signup of event()!.signups; track signup.id) {
                    <div class="p-4 bg-gray-50 rounded-lg flex justify-between items-start">
                      <div class="flex-1">
                        <p class="font-medium text-gray-900">{{ signup.name }}</p>
                        @if (signup.comment) {
                          <p class="text-sm text-gray-600 mt-1">{{ signup.comment }}</p>
                        }
                      </div>
                      @if (authService.isEditor()) {
                        <button
                          type="button"
                          (click)="openSignupDetailModal(signup.id)"
                          class="ml-3 p-2 text-gray-400 hover:text-pink-600 transition-colors"
                          aria-label="Anmeldung ansehen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (!loading()) {
        <div class="p-6 rounded-lg bg-red-50 text-center text-gray-600">
          <p class="text-lg">Veranstaltung nicht gefunden.</p>
        </div>
      }
    </div>
    
    @if (showSignupDialog() && event()) {
      <app-signup-dialog
        [eventId]="event()!.id"
        (close)="showSignupDialog.set(false)"
        (signedUp)="refreshEvent()"
      />
    }

    @if (showEditModal() && event()) {
      <app-event-modal 
        [editableEvent]="editableEvent()"
        (close)="showEditModal.set(false)"
        (saved)="onEventSaved($event)"
      />
    }

    @if (showSignupDetailModal() && selectedSignupId() && event()) {
      <app-signup-detail-modal
        [eventId]="event()!.id"
        [signupId]="selectedSignupId()!"
        (close)="closeSignupDetailModal()"
      />
    }
  `
})
export class EventDetailComponent {
    protected readonly ORANGE_STYLE = ORANGE_STYLE;
    protected readonly authService = inject(AuthService);
    protected showSignupDialog = signal(false);
    protected showEditModal = signal(false);
    protected showSignupDetailModal = signal(false);
    protected selectedSignupId = signal<number | null>(null);
    protected editableEvent = signal<EditableEvent | null>(null);
    protected csvDownloadError = signal<string | null>(null);
    
    private readonly eventService = inject(EventService);
    
    id = input<number>();
    event = signal<Event | null>(null);
    loading = signal(true);

    private readonly dateParts = computed(() => {
        const evt = this.event();
        return evt ? parseToDisplayParts(evt.date) : null;
    });

    protected readonly eventDay = computed(() => this.dateParts()?.day ?? '');
    protected readonly eventMonth = computed(() => this.dateParts()?.month ?? '');
    protected readonly eventTime = computed(() => this.dateParts()?.time ?? '');

    constructor() {
        effect(() => {
            const eventId = Number(this.id());
            if (eventId) {
                this.loading.set(true);
                this.eventService.getEvent(eventId).subscribe({
                    next: (data) => {
                        this.event.set(data);
                        this.loading.set(false);
                    },
                    error: () => {
                        this.event.set(null);
                        this.loading.set(false);
                    }
                });
            }
        });
    }

    protected openEditModal(): void {
        const evt = this.event();
        if (!evt) return;

        this.editableEvent.set(eventToEditableEvent(evt));
        this.showEditModal.set(true);
    }

    protected onEventSaved(eventData: AddEventRequest): void {
        const evt = this.event();
        if (!evt) return;

        this.eventService.updateEvent(evt.id, eventData).subscribe({
            next: (response) => {
                if (response.data) {
                    console.log('Event updated:', response.data);
                    this.refreshEvent();
                } else if (response.error) {
                    console.error('Failed to update event:', response.error);
                }
            },
            error: (err) => console.error('Failed to update event:', err)
        });
        this.showEditModal.set(false);
    }
    
    protected isSignupOpen(event: Event): boolean {
        if (!event.signupDeadline) {
            return true;
        }
        return new Date(event.signupDeadline) > new Date();
    }

    protected isSignupLimitReached(event: Event): boolean {
        if (!event.signupLimit || event.currentSignups === undefined) {
            return false;
        }
        return event.currentSignups >= event.signupLimit;
    }

    protected refreshEvent(): void {
        const eventId = Number(this.id());
        if (eventId) {
            this.eventService.getEvent(eventId).subscribe({
                next: (data) => this.event.set(data),
                error: () => {}
            });
        }
    }

    protected downloadSignupsCsv(): void {
        const token = this.authService.getToken();
        if (!token) {
            console.error('No auth token available');
            return;
        }

        const eventId = Number(this.id());
        if (!eventId) {
            return;
        }

        this.eventService.downloadSignupsCsv(eventId, token).subscribe({
            next: (blob) => {
                this.csvDownloadError.set(null);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const event = this.event();
                const filename = event 
                    ? `anmeldungen_${this.sanitizeFilename(event.title)}_${new Date().toISOString().split('T')[0]}.csv`
                    : `anmeldungen_event_${eventId}_${new Date().toISOString().split('T')[0]}.csv`;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            },
            error: () => {
                this.csvDownloadError.set('Download fehlgeschlagen');
            }
        });
    }

    protected openSignupDetailModal(signupId: number): void {
        this.selectedSignupId.set(signupId);
        this.showSignupDetailModal.set(true);
    }

    protected closeSignupDetailModal(): void {
        this.refreshEvent();
        this.showSignupDetailModal.set(false);
        this.selectedSignupId.set(null);
    }

    private sanitizeFilename(name: string): string {
        return name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_').substring(0, 50);
    }
}
