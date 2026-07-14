import { Component, input } from '@angular/core'

@Component({
  selector: 'app-page-heading',
  standalone: true,
  template: `
    <h1 class="page-heading">
      <span class="page-heading__emphasis">{{ emphasis() }}</span>@if (accent()) {<span class="page-heading__accent"> {{ accent() }}</span>}
    </h1>
    @if (subtitle()) {
      <p class="page-subtitle">{{ subtitle() }}</p>
    }
  `,
  styles: [`
    :host { display: block; }

    .page-heading__emphasis {
      color: #0f172a;
    }

    .page-heading__accent {
      color: #2563eb;
      font-weight: 600;
    }

    .page-subtitle {
      color: #64748b;
    }

    :host-context(html.dark) .page-heading__emphasis {
      color: #f8fafc;
    }

    :host-context(html.dark) .page-heading__accent {
      color: #60a5fa;
    }

    :host-context(html.dark) .page-subtitle {
      color: #94a3b8;
    }
  `],
})
export class PageHeadingComponent {
  readonly emphasis = input.required<string>()
  readonly accent = input('')
  readonly subtitle = input('')
}
