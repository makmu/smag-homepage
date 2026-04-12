import { Component, signal, effect, inject, computed } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RAINBOW_COLORS } from '../../core/constants/theme-colors';
import { EventService, Event } from '../../core/services/event.service';
import { AuthService } from '../../core/auth/auth.service';
import { EventModalComponent } from '../../shared/event-modal/event-modal.component';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { parseToDisplayParts } from '../../shared/utils/date.utils';

@Component({
    selector: 'app-event-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, EventModalComponent, SmagLoaderComponent],
    template: `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Veranstaltungen</h2>
      @if (authService.isEditor() && !loading()) {
        <button type="button" (click)="showAddModal.set(true)" class="flex items-center gap-1 rounded-lg bg-pink-50 border border-pink-200 px-4 py-2 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Neu
        </button>
      }
    </div>
    
    @if (loading()) {
      <div class="flex justify-center py-12">
        <smag-loader [size]="48" />
      </div>
    } @else {
      @if (events().length > 0) {
        @for (event of events(); track event.id; let i = $index) {
          @let color = RAINBOW_COLORS[i % RAINBOW_COLORS.length];
          <div 
            class="relative block rounded-lg shadow-sm p-4 md:p-6 mb-5 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg flex flex-col md:flex-row gap-3 md:gap-4"
            [style.background-color]="color.bg"
            [style.border-left]="'5px solid ' + color.color"
          >
            @if (authService.isEditor()) {
              <button
                type="button"
                (click)="openEditModal(event); $event.stopPropagation()"
                class="absolute top-2 right-2 md:top-4 md:right-4 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
                aria-label="Veranstaltung bearbeiten"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 hover:text-pink-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            }
            <a [routerLink]="['/events', event.id]" class="flex flex-1 flex-col md:flex-row gap-3 md:gap-4 cursor-pointer no-underline">
              @let parts = parseToDisplayParts(event.date);
              <div class="w-full md:w-20 shrink-0 flex flex-row md:flex-col items-center md:text-center justify-center gap-2 md:gap-0">
                <span class="text-2xl md:text-3xl font-bold" [style.color]="color.text">{{ parts.day }}</span>
                <span class="text-xs md:text-sm font-bold uppercase" [style.color]="color.text">{{ parts.month }}</span>
                <span class="text-xs md:text-sm flex items-center gap-1 text-gray-600 font-bold">
                  🕒 {{ parts.time }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 
                  class="text-xl font-bold mb-2 transition-colors duration-200"
                  [style.color]="color.text"
                >
                  {{ event.title }}
                </h3>
                <p class="text-gray-700">
                  <span class="font-bold">📍 Treffpunkt:</span> {{ event.location }}
                </p>
                <p class="text-gray-600 mt-2">{{ event.description }}</p>
              </div>
            </a>
          </div>
        }
      } @else {
        <div class="p-6 rounded-lg bg-blue-50 flex flex-col items-center justify-center text-gray-600 text-center">
          <p class="italic text-lg">Aktuell sind keine Veranstaltungen geplant.</p>
          <p class="mt-3">
            Melde dich bei unserem <a href="/newsletter" class="text-pink-600 underline hover:text-pink-700 font-medium">Newsletter</a> an und verpasse keine Veranstaltung.
          </p>
        </div>
      }
    }

    @if (showAddModal() || editingEventId() !== null) {
      <app-event-modal 
        [eventId]="editingEventId()" 
        (cancelled)="onModalClose()" 
        (saved)="onEventSaved()" 
      />
    }
  `
})

export class EventListComponent {
    protected readonly RAINBOW_COLORS = RAINBOW_COLORS;
    protected readonly authService = inject(AuthService);
    protected readonly parseToDisplayParts = parseToDisplayParts;

    private readonly eventService = inject(EventService);

    events = signal<Event[]>([]);
    loading = signal(true);
    showAddModal = signal(false);
    editingEventId = signal<number | null>(null);

    constructor() {
        effect(() => {
            this.eventService.getEvents().subscribe({
                next: (data) => {
                    this.events.set(data);
                    this.loading.set(false);
                },
                error: (err) => {
                    console.error('Failed to load events:', err);
                    this.loading.set(false);
                }
            });
        });
    }

    protected openEditModal(event: Event): void {
        this.editingEventId.set(event.id);
    }

    protected onModalClose(): void {
        this.showAddModal.set(false);
        this.editingEventId.set(null);
    }

    protected onEventSaved(): void {
        this.refreshEvents();
    }

    private refreshEvents(): void {
        this.eventService.getEvents().subscribe({
            next: (data) => this.events.set(data),
            error: (err) => console.error('Failed to refresh events:', err)
        });
        this.onModalClose();
    }
}
