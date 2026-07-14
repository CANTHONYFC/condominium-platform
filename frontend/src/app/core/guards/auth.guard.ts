import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'

import { AuthService } from '../services/auth.service'

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (auth.isAuthenticated()) return true
  return router.createUrlTree(['/auth/login'])
}

export const permissionGuard = (permission: string): CanActivateFn => () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (auth.hasPermission(permission)) return true
  return router.createUrlTree([auth.homePath()])
}

export const menuGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (auth.canAccessPath(state.url)) return true
  return router.createUrlTree([auth.homePath()])
}

export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)
  return router.createUrlTree([auth.homePath()])
}
