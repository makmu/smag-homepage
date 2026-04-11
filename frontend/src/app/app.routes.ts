import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'events',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/events/event-detail.component').then((m) => m.EventDetailComponent),
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('./features/gallery/gallery.component').then((m) => m.GalleryComponent),
  },
  {
    path: 'gallery/:id',
    loadComponent: () =>
      import('./features/gallery/post-detail.component').then((m) => m.PostDetailComponent),
  },
  {
    path: 'team',
    loadComponent: () =>
      import('./features/team/team.component').then((m) => m.TeamComponent),
  },
  {
    path: 'links',
    loadComponent: () =>
      import('./features/links/links.component').then((m) => m.LinksComponent),
  },
  {
    path: 'imprint',
    loadComponent: () =>
      import('./features/imprint/imprint.component').then((m) => m.ImprintComponent),
  },
  {
    path: 'newsletter',
    loadComponent: () =>
      import('./features/newsletter/newsletter.component').then((m) => m.NewsletterComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
