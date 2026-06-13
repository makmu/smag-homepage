import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgOptimizedImage } from '@angular/common';
import { UserService, TeamMember } from '../../core/services/user.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';

@Component({
    selector: 'app-team',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgOptimizedImage, SmagLoaderComponent],
    template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <h1 class="text-3xl font-bold mb-6">Unser Team</h1>
      
      @if (loading()) {
        <div class="flex justify-center py-12">
          <smag-loader [size]="48" />
        </div>
      } @else if (members().length === 0) {
        <div class="p-6 rounded-lg bg-blue-50 flex flex-col items-center justify-center text-gray-600 text-center">
          <p class="italic text-lg">Noch keine Teammitglieder vorhanden.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (member of members(); track member.id) {
            <div class="bg-gray-100 p-6 rounded-lg shadow-sm text-center">
              @if (member.imageUrl) {
                <img 
                  [ngSrc]="member.imageUrl" 
                  [alt]="member.name"
                  width="128"
                  height="128"
                  class="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
              } @else {
                <div class="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4"></div>
              }
              <h3 class="text-xl font-bold">{{ member.name }}</h3>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TeamComponent implements OnInit, OnDestroy {
    private readonly userService = inject(UserService);
    private readonly destroy$ = new Subject<void>();

    members = signal<TeamMember[]>([]);
    loading = signal(true);

    ngOnInit(): void {
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadUsers(): void {
        this.loading.set(true);
        this.userService.getUsers().pipe(takeUntil(this.destroy$)).subscribe({
            next: (data) => {
                this.members.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }
}