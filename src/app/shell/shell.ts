import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HostListener } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  imports: [RouterOutlet, RouterLinkActive, RouterLink],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell implements OnInit {
  isSidebarOpen = signal<boolean>(false);

  public authService = inject(AuthService);
  private router = inject(Router); 
  isUserMenuOpen = false;

  toggleSidebar(): void {
    this.isSidebarOpen.update(prev => !prev);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  ngOnInit(): void {
    // Fetch latest user profile in background to sync any changes
    this.authService.fetchProfile().subscribe({
      error: (err) => console.error('Failed to sync user profile:', err)
    });
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
    this.router.navigate(['/login']);
  }
}
