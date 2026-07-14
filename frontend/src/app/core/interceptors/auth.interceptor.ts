import { inject } from '@angular/core'
import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http'
import { catchError, switchMap, throwError } from 'rxjs'

import { AuthService } from '../services/auth.service'

const AUTH_NO_RETRY_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout']
const AUTH_RETRY_HEADER = 'X-Auth-Retry'

function isAuthNoRetryUrl (url: string) {
  return AUTH_NO_RETRY_PATHS.some((path) => url.includes(path))
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const token = auth.accessToken()

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error)
      }

      if (isAuthNoRetryUrl(req.url) || req.headers.has(AUTH_RETRY_HEADER)) {
        if (!isAuthNoRetryUrl(req.url)) {
          auth.sessionExpired()
        }
        return throwError(() => error)
      }

      if (!auth.refreshToken()) {
        auth.sessionExpired()
        return throwError(() => error)
      }

      return auth.refresh().pipe(
        switchMap(() => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${auth.accessToken()}`,
              [AUTH_RETRY_HEADER]: '1',
            },
          })
          return next(retryReq)
        }),
        catchError((refreshError) => {
          auth.sessionExpired()
          return throwError(() => refreshError)
        }),
      )
    }),
  )
}
