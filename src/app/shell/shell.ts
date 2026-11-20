import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HostListener } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../shared/services/theme.service';
import { TermsDialog } from '../terms/terms-dialog';
import { TermsService, TermsStatus } from '../terms/terms.service';

@Component({
  imports: [RouterOutlet, RouterLinkActive, RouterLink, TermsDialog],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell implements OnInit {
  isSidebarOpen = signal<boolean>(false);

  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private termsService = inject(TermsService);
  private router = inject(Router); 
  isUserMenuOpen = false;

  termsStatus = signal<TermsStatus | null>(null);
  viewingTerms = signal(false);

  // Initials are drawn locally so usernames never go to an outside avatar service.
  userInitials = computed(() => (this.authService.currentUser() || 'U').trim().slice(0, 2).toUpperCase());

  toggleSidebar(): void {
    this.isSidebarOpen.update(prev => !prev);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  ngOnInit(): void {
    // Fetch latest user profile in background to sync any changes
    this.authService.fetchProfile().subscribe({
      error: (err) => {
        // A rejected token (revoked or invalid) means the session is no longer usable.
        if (err?.status === 401 || err?.status === 403) {
          this.authService.forceLocalLogout();
        }
      }
    });
    // If this check fails the app stays usable; the consent screen only appears once the status is known.
    this.termsService.getStatus().subscribe({
      next: status => this.termsStatus.set(status),
      error: () => undefined,
    });
  }

  onTermsAccepted(status: TermsStatus): void {
    this.termsStatus.set(status);
  }

  openTerms(): void {
    this.closeMenu();
    this.viewingTerms.set(true);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeMenu(): void {
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.closeMenu();
    }
  }

  onLogout(): void {
    this.closeMenu();
    this.authService.logout();
  }
}
