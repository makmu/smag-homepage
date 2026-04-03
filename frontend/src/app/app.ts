import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './core/layout/navigation/navigation.component';
import { AuthBannerComponent } from './shared/auth-banner/auth-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent, AuthBannerComponent],
  template: `
    <app-auth-banner />
    <app-navigation />
    <router-outlet />
  `,
  styleUrl: './app.css',
})
export class App {}
