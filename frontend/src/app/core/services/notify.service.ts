import { Injectable, inject } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snack = inject(MatSnackBar)

  success (message: string) {
    this.snack.open(message, 'OK', { duration: 3500, panelClass: ['snack-success'] })
  }

  error (message: string) {
    this.snack.open(message, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] })
  }
}
