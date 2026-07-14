import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { environment } from '../../../environments/environment'

export interface Paginated<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient)
  private readonly base = environment.apiUrl

  get<T> (path: string, params?: Record<string, string | number>) {
    let httpParams = new HttpParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          httpParams = httpParams.set(k, String(v))
        }
      })
    }
    return this.http.get<T>(`${this.base}${path}`, { params: httpParams })
  }

  post<T> (path: string, body: unknown) {
    return this.http.post<T>(`${this.base}${path}`, body)
  }

  patch<T> (path: string, body: unknown) {
    return this.http.patch<T>(`${this.base}${path}`, body)
  }

  put<T> (path: string, body: unknown) {
    return this.http.put<T>(`${this.base}${path}`, body)
  }

  delete<T> (path: string) {
    return this.http.delete<T>(`${this.base}${path}`)
  }

  upload<T> (path: string, file: File, folder?: string) {
    const form = new FormData()
    form.append('file', file)
    let url = `${this.base}${path}`
    if (folder) url += `?folder=${encodeURIComponent(folder)}`
    return this.http.post<T>(url, form)
  }
}
