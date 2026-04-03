import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { EventListComponent } from '../events/event-list.component';
import { LoginModalComponent } from '../../shared/login-modal/login-modal.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage, EventListComponent, LoginModalComponent],
  template: `
    <!-- Welcome Card -->
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <div class="flex flex-col gap-6 md:flex-row">
        <!-- Left Column: Text (60%) -->
        <div class="md:w-[60%]">
          <h1 class="mb-4 text-3xl font-bold text-gray-800">Willkommen bei SMAG</h1>
          <div class="text-gray-600" style="line-height: 1.6;">
            <p class="mb-4">
              Wir sind die Gruppe für schwule Jungs im Alter ab 30 Jahren (kurz: SMAG) im
              Fliederlich e.V. Nürnberg und laden Dich ein zu gemeinsamen Unternehmungen, wie
              Gruppenabende, Biergarten, Party-Besuche, Städte-Touren, Wanderungen, Theaterbesuche,
              Kochabende und vieles mehr.
            </p>
            <p class="mb-4">
              Du willst neue Leute kennenlernen? Komm doch einfach mal bei einer unserer zahlreichen Veranstaltungen vorbei. Wir freuen uns auf dich!
            </p>
            <p class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r">
              Große Gruppenveranstaltungen sind dir für den Einstieg zu viel? Dann schreib uns an 
              <a href="mailto:smag@fliederlich.de" class="text-pink-600 hover:text-pink-800">smag@fliederlich.de</a> 
              und lerne einen von uns <a routerLink="/team" class="text-pink-600 hover:text-pink-800">Teamern</a> ungezwungen bei einem Kaffee in einem von Nürnbergs queeren Cafés kennen.
            </p>
            <p class="mb-4 text-sm text-gray-500">
              Fragen? Schreib uns: <a href="mailto:smag@fliederlich.de" class="text-pink-600 hover:text-pink-800">smag@fliederlich.de</a>
            </p>
          </div>
        </div>
        <!-- Right Column: Image (40%) -->
        <div class="md:w-[40%]">
          <img
            ngSrc="banner.webp"
            alt="SMAG Banner - Schwule Jungs in Nürnberg"
            class="h-full w-full rounded-lg object-cover"
            width="400"
            height="300"
          />
        </div>
      </div>
    </div>

    <!-- Veranstaltungen Section -->
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <app-event-list />
    </div>

    @if (showLoginModal) {
      <app-login-modal />
    }
  `,
})
export class HomeComponent {
  private router = inject(Router);
  showLoginModal = this.router.url === '/login';
}
