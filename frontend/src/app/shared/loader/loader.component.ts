import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'smag-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smag-loader" [style.width.px]="size" [style.height.px]="size * (55/48)">
      <svg
        [attr.viewBox]="'0 0 48 55'"
        [attr.width]="size"
        [attr.height]="size * (55/48)"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- S - top left (red) -->
        <rect class="quad quad-s" x="1" y="1" width="22" height="26" rx="1.5"/>
        <text class="letter letter-s" x="12" y="14" text-anchor="middle" dominant-baseline="middle">S</text>

        <!-- M - top right (blue) -->
        <rect class="quad quad-m" x="25" y="1" width="22" height="26" rx="1.5"/>
        <text class="letter letter-m" x="36" y="14" text-anchor="middle" dominant-baseline="middle">M</text>

        <!-- A - bottom left (yellow/orange) -->
        <rect class="quad quad-a" x="1" y="29" width="22" height="25" rx="1.5"/>
        <text class="letter letter-a" x="12" y="41.5" text-anchor="middle" dominant-baseline="middle">A</text>

        <!-- G - bottom right (green) -->
        <rect class="quad quad-g" x="25" y="29" width="22" height="25" rx="1.5"/>
        <text class="letter letter-g" x="36" y="41.5" text-anchor="middle" dominant-baseline="middle">G</text>
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .smag-loader {
      display: inline-block;
    }

    /* ── Shared quad defaults (gray/inactive) ── */
    .quad {
      fill: #BBBBBB;
      transition: fill 0.2s ease;
    }

    /* ── Shared letter defaults (dimmed) ── */
    .letter {
      fill: #CCCCCC;
      font-family: 'Arial Black', Arial, sans-serif;
      font-weight: 900;
      font-size: 18px;
      transition: fill 0.2s ease;
    }

    /* ── Active quad colors (soft backgrounds) ── */
    .quad-s.active { fill: #FDF2F2; }
    .quad-m.active { fill: #EBF5FB; }
    .quad-a.active { fill: #FEFDE7; }
    .quad-g.active { fill: #E8F5E9; }

    /* ── Active letter color ── */
    .letter.active { fill: #C0392B; }
    .letter-m.active { fill: #2471A3; }
    .letter-a.active { fill: #B7950B; }
    .letter-g.active { fill: #1E8449; }

    /* ── CSS animation: cycle through S → M → A → G ── */

    /* Step timing: 4 steps, each 25% of the cycle */
    /* Active window per letter = 25% on, 75% off */

    .quad-s, .letter-s {
      animation: pulse-s 1.6s steps(1, end) infinite;
    }
    .quad-m, .letter-m {
      animation: pulse-m 1.6s steps(1, end) infinite;
    }
    .quad-a, .letter-a {
      animation: pulse-a 1.6s steps(1, end) infinite;
    }
    .quad-g, .letter-g {
      animation: pulse-g 1.6s steps(1, end) infinite;
    }

    /* S active: 0% – 25% */
    @keyframes pulse-s {
      0%   { fill: var(--s-active); }
      25%  { fill: var(--inactive-quad); }
      100% { fill: var(--inactive-quad); }
    }

    /* M active: 25% – 50% */
    @keyframes pulse-m {
      0%   { fill: var(--inactive-quad); }
      25%  { fill: var(--m-active); }
      50%  { fill: var(--inactive-quad); }
      100% { fill: var(--inactive-quad); }
    }

    /* A active: 50% – 75% */
    @keyframes pulse-a {
      0%   { fill: var(--inactive-quad); }
      50%  { fill: var(--a-active); }
      75%  { fill: var(--inactive-quad); }
      100% { fill: var(--inactive-quad); }
    }

    /* G active: 75% – 100% */
    @keyframes pulse-g {
      0%   { fill: var(--inactive-quad); }
      75%  { fill: var(--g-active); }
      100% { fill: var(--g-active); }
    }

    /* CSS variables for quad fills */
    .quad-s { --s-active: #FDF2F2; --inactive-quad: #EEEEEE; }
    .quad-m { --m-active: #EBF5FB; --inactive-quad: #EEEEEE; }
    .quad-a { --a-active: #FEFDE7; --inactive-quad: #EEEEEE; }
    .quad-g { --g-active: #E8F5E9; --inactive-quad: #EEEEEE; }

    /* CSS variables for letter fills */
    .letter-s { --s-active: #C0392B; --inactive-quad: #CCCCCC; }
    .letter-m { --m-active: #2471A3; --inactive-quad: #CCCCCC; }
    .letter-a { --a-active: #B7950B; --inactive-quad: #CCCCCC; }
    .letter-g { --g-active: #1E8449; --inactive-quad: #CCCCCC; }
  `]
})
export class SmagLoaderComponent {
  /** Size in px (width). Height scales proportionally. Default: 48 */
  @Input() size: number = 48;
}