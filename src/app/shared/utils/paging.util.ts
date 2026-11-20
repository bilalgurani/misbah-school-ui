import { computed, effect, signal, untracked } from '@angular/core';

/**
 * Paging for a list that is already on screen. Call it where the component's fields are declared.
 * `resetOn` is read to send the user back to page 1 when it changes (for example the search text), while a
 * shorter list after a delete or refresh only pulls the page back if it no longer exists.
 */
export function createPaging<T>(items: () => T[], resetOn: () => unknown, initialSize = 25) {
  const requestedPage = signal(1);
  const pageSize = signal(initialSize);

  const totalPages = computed(() => Math.max(1, Math.ceil(items().length / pageSize())));
  const page = computed(() => Math.min(requestedPage(), totalPages()));
  const paged = computed(() => {
    const size = pageSize();
    const start = (page() - 1) * size;
    return items().slice(start, start + size);
  });

  effect(() => {
    resetOn();
    untracked(() => requestedPage.set(1));
  });

  return {
    page,
    pageSize,
    paged,
    goTo: (value: number) => requestedPage.set(Math.min(Math.max(1, value), totalPages())),
    setPageSize: (size: number) => {
      pageSize.set(size);
      requestedPage.set(1);
    },
  };
}
