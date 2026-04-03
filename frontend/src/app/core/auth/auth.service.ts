import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface User {
  email: string;
}

interface AuthResponse {
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } | null;
  error: string | null;
}

const STORAGE_KEY = 'smag_user';
const TOKEN_KEY = 'smag_token';
const REFRESH_TOKEN_KEY = 'smag_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private readonly user = signal<User | null>(this.loadUser());

  readonly currentUser = this.user.asReadonly();
  readonly isLoggedIn = () => this.user() !== null;
  readonly isEditor = () => this.user() !== null;

  private loadUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.http
        .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
        .subscribe({
          next: (response) => {
            if (response.data) {
              const user = { email };
              this.user.set(user);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
              localStorage.setItem(TOKEN_KEY, response.data.access_token);
              localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
              resolve(true);
            } else {
              resolve(false);
            }
          },
          error: () => {
            resolve(false);
          },
        });
    });
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe();
    }
    this.user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  refreshToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(false);
    }

    return new Observable((observer) => {
      this.http
        .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refresh_token: refreshToken })
        .subscribe({
          next: (response) => {
            if (response.data) {
              localStorage.setItem(TOKEN_KEY, response.data.access_token);
              localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
              observer.next(true);
            } else {
              observer.next(false);
            }
            observer.complete();
          },
          error: () => {
            observer.next(false);
            observer.complete();
          },
        });
    });
  }
}
