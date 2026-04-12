import { Component, inject, signal, output, input, effect, ChangeDetectionStrategy, computed, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntil, Subject } from 'rxjs';
import { AngularTiptapEditorComponent } from '@flogeez/angular-tiptap-editor';
import { extractLocalDateTime, convertLocalToUtc } from '../utils/date.utils';
import { EventService, AddEventRequest, Event } from '../../core/services/event.service';
import { SmagLoaderComponent } from '../loader/loader.component';

export type SignupType = 'none' | 'on_site' | 'special';

export interface EventFormData {
  title: string;
  teaser: string;
  location: string;
  date: string;
  time: string;
  description: string;
  signupType: SignupType;
  signupDeadlineDate: string;
  signupDeadlineTime: string;
  hasLimit: boolean;
  signupLimit: number | null;
  signupInstructions: string;
}

export interface EditableEvent {
  id: number;
  title: string;
  teaser: string;
  location: string;
  date: string;
  description: string;
  signup_type: SignupType;
  signup_deadline: string | null;
  signup_limit: number | null;
  signup_instructions: string | null;
}

@Component({
  selector: 'app-event-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AngularTiptapEditorComponent, SmagLoaderComponent],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 id="event-modal-title" class="text-xl font-bold text-gray-800">{{ isEditMode() ? 'Veranstaltung bearbeiten' : 'Neue Veranstaltung' }}</h2>
          <button
            type="button"
            (click)="cancelled.emit()"
            [disabled]="saving() || loading()"
            class="text-gray-400 hover:text-gray-600 disabled:text-gray-300"
            aria-label="Schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        @if (loading()) {
          <div class="flex justify-center py-12">
            <smag-loader [size]="48" />
          </div>
        } @else {
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
            <label for="teaser" class="mb-1 block text-sm font-medium text-gray-700">Teaser *</label>
            <input
              id="teaser"
              type="text"
              formControlName="teaser"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div class="mb-4">
            <label for="location" class="mb-1 block text-sm font-medium text-gray-700">Ort *</label>
            <input
              id="location"
              type="text"
              formControlName="location"
              class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label for="date" class="mb-1 block text-sm font-medium text-gray-700">Datum *</label>
              <input
                id="date"
                type="date"
                formControlName="date"
                placeholder="TT.MM.JJJJ"
                class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div>
              <label for="time" class="mb-1 block text-sm font-medium text-gray-700">Uhrzeit *</label>
              <input
                id="time"
                type="time"
                formControlName="time"
                placeholder="HH:MM"
                class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          <div class="mb-4">
            <label for="description" class="mb-1 block text-sm font-medium text-gray-700">Beschreibung *</label>
            <angular-tiptap-editor
              id="description"
              formControlName="description"
              [showToolbar]="true"
              [showFooter]="false"
              [showCharacterCount]="false"
              [showWordCount]="false"
              [seamless]="false"
              placeholder="Beschreibung eingeben..."
            ></angular-tiptap-editor>
          </div>

          <div class="mb-4">
            <label class="mb-2 block text-sm font-medium text-gray-700">Anmeldung</label>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  formControlName="signupType"
                  value="none"
                  class="text-pink-600 focus:ring-pink-500"
                />
                <span class="text-sm text-gray-700">Keine Anmeldung erforderlich</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  formControlName="signupType"
                  value="on_site"
                  class="text-pink-600 focus:ring-pink-500"
                />
                <span class="text-sm text-gray-700">Anmeldung über diese Seite</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  formControlName="signupType"
                  value="special"
                  class="text-pink-600 focus:ring-pink-500"
                />
                <span class="text-sm text-gray-700">Besondere Anmeldungsinformationen</span>
              </label>
            </div>
          </div>

          @if (form.get('signupType')?.value === 'on_site') {
            <div class="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label for="signupDeadlineDate" class="mb-1 block text-sm font-medium text-gray-700">Anmeldefrist Datum *</label>
                <input
                  id="signupDeadlineDate"
                  type="date"
                  formControlName="signupDeadlineDate"
                  placeholder="TT.MM.JJJJ"
                  class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div>
                <label for="signupDeadlineTime" class="mb-1 block text-sm font-medium text-gray-700">Anmeldefrist Uhrzeit *</label>
                <input
                  id="signupDeadlineTime"
                  type="time"
                  formControlName="signupDeadlineTime"
                  placeholder="HH:MM"
                  class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>
            <div class="mb-4">
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  formControlName="hasLimit"
                  class="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span class="text-sm text-gray-700">Teilnehmerlimit festlegen</span>
              </label>
            </div>
            @if (form.get('hasLimit')?.value) {
              <div class="mb-4">
                <label for="signupLimit" class="mb-1 block text-sm font-medium text-gray-700">Teilnehmerlimit *</label>
                <input
                  id="signupLimit"
                  type="number"
                  formControlName="signupLimit"
                  min="1"
                  class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
            }
          }

          @if (form.get('signupType')?.value === 'special') {
            <div class="mb-4">
              <label for="signupInstructions" class="mb-1 block text-sm font-medium text-gray-700">Anmeldungsinformationen *</label>
              <angular-tiptap-editor
                id="signupInstructions"
                formControlName="signupInstructions"
                [showToolbar]="true"
                [showFooter]="false"
                [showCharacterCount]="false"
                [showWordCount]="false"
                [seamless]="false"
                placeholder="Anmeldungsinformationen eingeben..."
              ></angular-tiptap-editor>
            </div>
          }

          @if (error()) {
            <p class="mb-4 text-sm text-red-500">{{ error() }}</p>
          }

          <div class="flex gap-3">
            <button
              type="submit"
              [disabled]="!isSubmitEnabled() || saving() || loading()"
              class="flex-1 rounded bg-pink-600 px-4 py-2 text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              @if (saving()) {
                <span class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Speichere...
                </span>
              } @else {
                Speichern
              }
            </button>
            <button
              type="button"
              (click)="cancelled.emit()"
              [disabled]="saving() || loading()"
              class="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
        }
      </div>
    </div>
  `,
})
export class EventModalComponent implements OnDestroy {
  cancelled = output<void>();
  saved = output<void>();

  eventId = input<number | null>(null);

  private readonly eventService = inject(EventService);
  private readonly destroy$ = new Subject<void>();
  private loadedEventId: number | null = null;

  saving = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  readonly isEditMode = computed(() => this.eventId() !== null);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    teaser: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    time: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    signupType: new FormControl<SignupType>('none', { nonNullable: true }),
    signupDeadlineDate: new FormControl('', { nonNullable: true }),
    signupDeadlineTime: new FormControl('', { nonNullable: true }),
    hasLimit: new FormControl(false, { nonNullable: true }),
    signupLimit: new FormControl<number | null>(null),
    signupInstructions: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const id = this.eventId();
      if (id !== this.loadedEventId) {
        this.loadedEventId = id;
        if (id) {
          this.loadEvent(id);
        } else {
          this.form.reset({
            signupType: 'none',
            hasLimit: false,
          });
        }
      }
    });
  }

  private loadEvent(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventService.getEvent(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (event) => {
        this.loading.set(false);
        if (event) {
          this.populateFormFromService(event);
        } else {
          this.error.set('Veranstaltung nicht gefunden');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Fehler beim Laden der Veranstaltung');
      }
    });
  }

  private populateFormFromService(event: Event): void {
    let signupType: SignupType = 'none';
    switch (event.signupType) {
      case 'none': signupType = 'none'; break;
      case 'open': signupType = 'on_site'; break;
      case 'instructions': signupType = 'special'; break;
    }

    const { date: dateStr, time: timeStr } = extractLocalDateTime(event.date);

    let deadlineDate = '';
    let deadlineTime = '';
    if (event.signupDeadline) {
      const { date, time } = extractLocalDateTime(event.signupDeadline);
      deadlineDate = date;
      deadlineTime = time;
    }

    this.form.patchValue({
      title: event.title,
      teaser: event.teaser,
      location: event.location,
      date: dateStr,
      time: timeStr,
      description: event.fullDescription,
      signupType: signupType,
      signupDeadlineDate: deadlineDate,
      signupDeadlineTime: deadlineTime,
      hasLimit: event.signupLimit !== undefined,
      signupLimit: event.signupLimit ?? null,
      signupInstructions: event.signupInstructions ?? '',
    });
  }

  onSubmit(): void {
    if (!this.isSubmitEnabled()) return;

    const formValue = this.form.getRawValue();
    const dateTime = convertLocalToUtc(formValue.date, formValue.time);

    let signupDeadline: string | null = null;
    if (formValue.signupType === 'on_site' && formValue.signupDeadlineDate && formValue.signupDeadlineTime) {
      signupDeadline = convertLocalToUtc(formValue.signupDeadlineDate, formValue.signupDeadlineTime);
    }

    let signupLimit: number | null = null;
    if (formValue.signupType === 'on_site' && formValue.hasLimit && formValue.signupLimit) {
      signupLimit = formValue.signupLimit;
    }

    let signupInstructions: string | null = null;
    if (formValue.signupType === 'special' && formValue.signupInstructions) {
      signupInstructions = formValue.signupInstructions;
    }

    const apiRequest: AddEventRequest = {
      title: formValue.title,
      teaser: formValue.teaser,
      location: formValue.location,
      date: dateTime,
      description: formValue.description,
      signup_type: formValue.signupType,
      signup_deadline: signupDeadline,
      signup_limit: signupLimit,
      signup_instructions: signupInstructions,
    };

    this.saving.set(true);
    this.error.set(null);

    const isEdit = this.isEditMode();
    const obs = isEdit
      ? this.eventService.updateEvent(this.eventId()!, apiRequest)
      : this.eventService.createEvent(apiRequest);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.error) {
          this.error.set(response.error);
        } else {
          this.saved.emit();
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Fehler beim Speichern');
      }
    });
  }

  isSubmitEnabled(): boolean {
    if (this.form.invalid) return false;

    const subType = this.form.get('signupType')?.value;
    if (subType === 'special') {
      const signupInstr = this.form.get('signupInstructions')?.value;
      if (!signupInstr || signupInstr.trim() === '' || signupInstr === '<p></p>') {
        return false;
      }
    }
    if (subType === 'on_site') {
      const deadlineDate = this.form.get('signupDeadlineDate')?.value;
      const deadlineTime = this.form.get('signupDeadlineTime')?.value;
      if (!deadlineDate || !deadlineTime) {
        return false;
      }
      if (this.form.get('hasLimit')?.value && !this.form.get('signupLimit')?.value) {
        return false;
      }
    }
    return true;
  }
}
