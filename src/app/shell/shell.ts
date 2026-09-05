import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HostListener } from '@angular/core';

@Component({
  imports: [RouterOutlet, RouterLinkActive, RouterLink],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell {
  isUserMenuOpen = false;

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
    // Insert authentication logout logic / router navigation here
  }
}
