import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SmagDialogComponent } from '../components/dialog.component';

@Component({
  selector: 'app-login-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SmagDialogComponent],
  template: `
    <smag-dialog
      [heading]="'Anmeldung'"
      [maxWidth]="'md'"
      [busy]="submitting()"
      (close)="onCancel()"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="mb-4">
          <label for="email" class="mb-1 block text-sm font-medium text-gray-700">E-Mail</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>

        <div class="mb-4">
          <label for="password" class="mb-1 block text-sm font-medium text-gray-700">Passwort</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>

        @if (error()) {
          <p class="mb-4 text-sm text-red-600">{{ error() }}</p>
        }

        <div class="flex gap-3">
          <button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="flex-1 rounded bg-pink-600 px-4 py-2 text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            @if (submitting()) {
              <span class="flex items-center justify-center gap-2">
                <svg
                  aria-hidden="true"
                  class="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Anmelden...
              </span>
            } @else {
              Anmelden
            }
          </button>
          <button
            type="button"
            (click)="onCancel()"
            class="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </smag-dialog>
  `,
})
export class LoginModalComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  error = signal<string>('');
  submitting = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    const success = await this.auth.login(email, password);
    this.submitting.set(false);

    if (success) {
      this.router.navigate(['/']);
    } else {
      this.error.set('E-Mail oder Passwort falsch');
    }
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }
}
