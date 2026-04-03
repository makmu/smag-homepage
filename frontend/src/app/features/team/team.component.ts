import { Component } from '@angular/core';

@Component({
  selector: 'app-team',
  template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <h1 class="text-3xl font-bold mb-6">Unser Team</h1>
      <p class="text-gray-600">Das SMAG Team stellt sich vor...</p>
      <!-- Placeholder content -->
      <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-gray-100 p-6 rounded-lg shadow-sm text-center">
          <div class="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <h3 class="text-xl font-bold">Max Mustermann</h3>
          <p class="text-gray-500">Organisator</p>
        </div>
        <div class="bg-gray-100 p-6 rounded-lg shadow-sm text-center">
          <div class="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <h3 class="text-xl font-bold">Erika Musterfrau</h3>
          <p class="text-gray-500">Support</p>
        </div>
      </div>
    </div>
  `,
})
export class TeamComponent {}
