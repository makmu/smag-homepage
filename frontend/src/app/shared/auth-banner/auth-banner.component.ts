import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-auth-banner',
  template: `
    @if (auth.currentUser(); as user) {
      <div class="mx-auto mt-4 max-w-[1100px]">
        <div class="flex items-center justify-between rounded-lg border border-pink-200 bg-pink-50 px-4 py-2">
          <div class="flex items-center gap-2 text-pink-800">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            <span>Angemeldet als <strong>{{ user.email }}</strong></span>
          </div>
          <button
            (click)="logout()"
            class="flex items-center gap-1 rounded px-3 py-1 text-sm font-medium text-pink-600 transition-colors hover:bg-pink-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
            </svg>
            Abmelden
          </button>
        </div>
      </div>
    }
  `,
})
export class AuthBannerComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
