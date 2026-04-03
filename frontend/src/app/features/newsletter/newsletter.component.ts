import { Component } from '@angular/core';

@Component({
  selector: 'app-newsletter',
  template: `
    <div class="mx-auto mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <h1 class="text-3xl font-bold mb-6">Newsletter</h1>
      <p class="mb-4">Melde dich für unseren Newsletter an, um immer auf dem Laufenden zu bleiben.</p>
      
      <!-- Placeholder Form -->
      <form class="max-w-md space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">E-Mail-Adresse</label>
          <input type="email" id="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="deine@email.de">
        </div>
        <button type="button" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Anmelden
        </button>
      </form>
    </div>
  `,
})
export class NewsletterComponent {}
