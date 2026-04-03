import { Component } from '@angular/core';

@Component({
  selector: 'app-gallery',
  template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <h1 class="text-3xl font-bold mb-6">Galerie</h1>
      <p class="text-gray-500 italic mb-8">Hier erscheinen bald die neuesten Galerien.</p>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="rounded-lg bg-gray-100 p-4 shadow-sm">
            <div class="mb-4 h-48 rounded bg-gray-300"></div>
            <h3 class="mb-2 text-xl font-bold">Galerie {{ i }}</h3>
            <p class="text-sm text-gray-600">
              Dies ist ein Platzhaltertext für eine Galerie.
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class GalleryComponent {}
