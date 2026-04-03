import { Component } from '@angular/core';

@Component({
  selector: 'app-links',
  template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <h1 class="text-3xl font-bold mb-6">Links</h1>
      <p class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r text-gray-600">
        <strong>Hinweis zu externen Links:</strong> Diese Website enthält Verknüpfungen zu Websites Dritter ("externe Links"). Wir haben keinen Einfluss auf die Inhalte dieser verlinkten Websites und übernehmen keine Haftung dafür. Für die Inhalte der externen Links ist stets der jeweilige Anbieter verantwortlich.
      </p>
      <p class="mb-4">Interessante Links für dich:</p>
      <ul class="list-disc list-inside space-y-2 text-blue-600">
        <li><a href="https://fliederlich.de" target="_blank" class="hover:underline">Fliederlich e.V.</a></li>
        <li><a href="https://csd-nuernberg.de" target="_blank" class="hover:underline">CSD Nürnberg</a></li>
        <li><a href="https://www.gaycon.de/" target="_blank" class="hover:underline">Queer Magazin GAYCON</a></li>
      </ul>
    </div>
  `,
})
export class LinksComponent {}
