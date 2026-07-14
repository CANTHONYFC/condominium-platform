import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
      <h2 class="text-xl font-semibold mb-2">{{ title }}</h2>
      <p class="text-gray-500">Módulo en desarrollo — API REST disponible en Swagger.</p>
    </div>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute)
  title = this.route.snapshot.data['title'] ?? 'Módulo'
}
