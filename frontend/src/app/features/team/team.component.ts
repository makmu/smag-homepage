import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgOptimizedImage } from '@angular/common';
import { UserService, TeamMember } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { SmagLoaderComponent } from '../../shared/loader/loader.component';
import { UserModalComponent } from '../../shared/user-modal/user-modal.component';

@Component({
    selector: 'app-team',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgOptimizedImage, SmagLoaderComponent, UserModalComponent],
    template: `
    <div class="mt-6 rounded-lg bg-white px-6 py-6 shadow-md">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Unser Team</h1>
        @if (authService.isEditor() && !loading()) {
          <button
            type="button"
            (click)="showModal.set(true)"
            class="flex items-center gap-1 rounded-lg bg-pink-50 border border-pink-200 px-4 py-2 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Neu
          </button>
        }
      </div>
      
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
            <div class="relative bg-gray-100 p-6 rounded-lg shadow-sm text-center">
              @if (authService.isEditor()) {
                <button
                  type="button"
                  (click)="openEditModal(member)"
                  class="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
                  aria-label="Benutzer bearbeiten"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 hover:text-pink-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              }
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

    @if (showModal() || editingUserId() !== null) {
      <app-user-modal 
        [userId]="editingUserId()" 
        (cancelled)="onModalClose()" 
        (saved)="onUserSaved()" 
      />
    }
  `,
})
export class TeamComponent implements OnInit, OnDestroy {
    private readonly userService = inject(UserService);
    protected readonly authService = inject(AuthService);
    private readonly destroy$ = new Subject<void>();

    members = signal<TeamMember[]>([]);
    loading = signal(true);
    showModal = signal(false);
    editingUserId = signal<number | null>(null);

    ngOnInit(): void {
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected onModalClose(): void {
        this.showModal.set(false);
        this.editingUserId.set(null);
    }

    protected openEditModal(member: TeamMember): void {
        this.editingUserId.set(member.id);
    }

    protected onUserSaved(): void {
        this.onModalClose();
        this.loadUsers();
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