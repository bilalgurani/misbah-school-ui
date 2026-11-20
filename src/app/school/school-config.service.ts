import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

// Everything that differs from one school to the next. It is read at startup from
// school/school.config.json, so one build can serve any school.
export interface SchoolConfig {
  schoolName: string;
  shortName: string;
  portalTitle: string;
  logo: string;
  banner: string;
  loginBackground: string;
  icon: string;
  lowAttendancePct: number;
}

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'Sana Misbah Public School',
  shortName: 'Sana Misbah School',
  portalTitle: 'Misbah School Portal',
  logo: 'school/logo.jpeg',
  banner: 'school/banner.jpeg',
  loginBackground: 'school/login-bg.jpg',
  icon: 'school/icon.png',
  lowAttendancePct: 75,
};

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

// Keeps the defaults for anything missing or of the wrong type, so a typo in the file cannot break the app.
export function mergeSchoolConfig(raw: unknown): SchoolConfig & { apiUrl?: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SCHOOL_CONFIG;
  const pct = Number(r['lowAttendancePct']);
  const apiUrl = typeof r['apiUrl'] === 'string' ? r['apiUrl'].trim().replace(/\/+$/, '') : '';
  return {
    schoolName: text(r['schoolName'], d.schoolName),
    shortName: text(r['shortName'], d.shortName),
    portalTitle: text(r['portalTitle'], d.portalTitle),
    logo: text(r['logo'], d.logo),
    banner: text(r['banner'], d.banner),
    loginBackground: text(r['loginBackground'], d.loginBackground),
    icon: text(r['icon'], d.icon),
    lowAttendancePct: Number.isFinite(pct) && pct >= 1 && pct <= 100 ? pct : d.lowAttendancePct,
    ...(/^(https?:\/\/|\/)/.test(apiUrl) ? { apiUrl } : {}),
  };
}

@Injectable({ providedIn: 'root' })
export class SchoolConfigService {
  private readonly state = signal<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);

  readonly config = this.state.asReadonly();
  readonly schoolName = computed(() => this.state().schoolName);
  readonly shortName = computed(() => this.state().shortName);
  readonly portalTitle = computed(() => this.state().portalTitle);
  readonly logo = computed(() => this.state().logo);
  readonly banner = computed(() => this.state().banner);
  readonly lowAttendancePct = computed(() => this.state().lowAttendancePct);

  // Runs before the app starts. A missing or broken file just means the defaults are used.
  async load(): Promise<void> {
    let raw: unknown = null;
    try {
      const res = await fetch('school/school.config.json', { cache: 'no-store' });
      if (res.ok) raw = await res.json();
    } catch {
      raw = null;
    }
    const { apiUrl, ...config } = mergeSchoolConfig(raw);
    this.state.set(config);
    // Services read environment.apiUrl when they are created, which is after startup finishes.
    if (apiUrl) environment.apiUrl = apiUrl;
    document.title = config.shortName;
    // Quotes and brackets are stripped so the path cannot break out of url().
    const safe = encodeURI(config.loginBackground).replace(/["'()\\]/g, '');
    document.documentElement.style.setProperty('--login-bg', `url("${safe}")`);
    // No type is given so the browser works out PNG or WebP from the file itself.
    for (const rel of ['icon', 'apple-touch-icon']) {
      let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = config.icon;
    }
  }
}
