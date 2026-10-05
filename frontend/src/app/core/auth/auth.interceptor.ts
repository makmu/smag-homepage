import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const isAuthEndpoint = (url: string): boolean => url.startsWith(`${environment.apiUrl}/auth/`);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService) as AuthService;
  const token = authService.getToken();

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  // The auth endpoints are the token lifecycle itself: their 401s are outcomes
  // (bad credentials, revoked refresh token), never a reason to refresh again.
  const canRefresh = isApiRequest && !isAuthEndpoint(req.url);

  let authReq = req;
  if (token && isApiRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && canRefresh) {
        return authService.refreshToken().pipe(
          switchMap((success) => {
            if (success) {
              const newToken = authService.getToken();
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(retryReq);
            }
            authService.logout();
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
