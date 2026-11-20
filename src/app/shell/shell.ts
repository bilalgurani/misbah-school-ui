import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HostListener } from '@angular/core';
import { filter } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../shared/services/theme.service';
import { TermsDialog } from '../terms/terms-dialog';
import { TermsService, TermsStatus } from '../terms/terms.service';
import { BOTTOM_TABS, BottomTab, NAV_GROUPS, NAV_ICONS, NAV_TOP_LINKS, NavGroup, NavLinkItem, NavTopLink } from './shell-nav';

@Component({
  imports: [RouterOutlet, RouterLink, TermsDialog],
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

  readonly menuIcon = NAV_ICONS.menu;

  // The page being shown, without its query string, so the menu can highlight where the user is.
  private currentPath = signal<string>(this.pathOf(this.router.url));
  // Only one menu group is open at a time so the menu stays short on a phone.
  openGroup = signal<string | null>(null);

  private allows(item: { role?: string }): boolean {
    return !item.role || (item.role === 'ADMIN' ? this.authService.isAdmin() : this.authService.isTeacher());
  }

  topLinks = computed<NavTopLink[]>(() => NAV_TOP_LINKS.filter(l => this.allows(l)));

  // Groups with only what this person may use; a group left with nothing is hidden.
  visibleGroups = computed<NavGroup[]>(() =>
    NAV_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => this.allows(i)) }))
      .filter(g => g.items.length > 0));

  bottomTabs = computed<BottomTab[]>(() => BOTTOM_TABS.filter(t => this.allows(t)));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(e => {
        this.currentPath.set(this.pathOf(e.urlAfterRedirects));
        const group = this.visibleGroups().find(g => this.groupHasActive(g));
        if (group) this.openGroup.set(group.id);
      });
    const group = this.visibleGroups().find(g => this.groupHasActive(g));
    if (group) this.openGroup.set(group.id);
  }

  private pathOf(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  isActive(item: NavLinkItem): boolean {
    const path = this.currentPath();
    return path === item.path || (item.match ?? []).some(m => path === m || path.startsWith(m + '/'));
  }

  groupHasActive(group: NavGroup): boolean {
    return group.items.some(i => this.isActive(i));
  }

  isTabActive(tab: BottomTab): boolean {
    const path = this.currentPath();
    return tab.within.some(p => path === p || path.startsWith(p + '/'));
  }

  toggleGroup(id: string): void {
    this.openGroup.update(open => (open === id ? null : id));
  }

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
