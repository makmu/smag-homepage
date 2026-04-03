import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RAINBOW_COLORS } from '../../constants/theme-colors';

interface NavItem {
  path: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive],
  host: {
    class: 'block',
  },
  template: `
    <nav class="mt-6 rounded-lg bg-gray-100 px-6 py-6">
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        @for (item of navItems; track item.path; let i = $index) {
          <li class="nav-item" [style.--indicator-color]="item.color">
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              class="nav-link block rounded px-3 py-2.5 text-center font-semibold text-white transition-colors md:px-5 md:py-2.5"
              [style.background-color]="item.color"
            >
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styleUrl: './navigation.component.css',
})
export class NavigationComponent {
  protected readonly navItems: NavItem[] = [
    { path: '/', label: 'Willkommen', color: RAINBOW_COLORS[0].color },
    { path: '/gallery', label: 'Galerie', color: RAINBOW_COLORS[1].color },
    { path: '/newsletter', label: 'Newsletter', color: RAINBOW_COLORS[2].color },
    { path: '/team', label: 'Team', color: RAINBOW_COLORS[3].color },
    { path: '/links', label: 'Links', color: RAINBOW_COLORS[4].color },
    { path: '/imprint', label: 'Impressum', color: RAINBOW_COLORS[5].color },
  ];
}
