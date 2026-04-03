import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-modal',
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="login-title" class="mb-4 text-xl font-bold text-gray-800">Anmeldung</h2>
        
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
              [disabled]="form.invalid"
              class="flex-1 rounded bg-pink-600 px-4 py-2 text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anmelden
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
      </div>
    </div>
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

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { email, password } = this.form.getRawValue();
    const success = await this.auth.login(email, password);
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
