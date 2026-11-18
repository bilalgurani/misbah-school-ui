import { NavigationError } from '@angular/router';

const RELOAD_KEY = 'chunkReloadAt';
const RELOAD_COOLDOWN_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  return /dynamically imported module|importing a module script failed|loading chunk/i.test(message);
}

// After a new deployment the old page still points at chunk files that no longer exist, so the server
// answers with index.html. Reloading once fetches the new version; the cooldown prevents a reload loop.
export function reloadOnStaleChunk(navigationError: NavigationError): void {
  if (!isChunkLoadError(navigationError.error)) {
    throw navigationError.error;
  }
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
    throw navigationError.error;
  }
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.assign(navigationError.url);
}
