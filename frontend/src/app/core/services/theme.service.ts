import { Injectable, signal, effect } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme'
  readonly isDark = signal(this.getInitialTheme())

  constructor () {
    effect(() => {
      const dark = this.isDark()
      document.documentElement.classList.toggle('dark', dark)
      document.body.classList.toggle('dark', dark)
      localStorage.setItem(this.storageKey, dark ? 'dark' : 'light')
    })
  }

  toggle () {
    this.isDark.update((v) => !v)
  }

  private getInitialTheme () {
    const saved = localStorage.getItem(this.storageKey)
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
}
