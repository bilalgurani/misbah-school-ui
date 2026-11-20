import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { createPaging } from './paging.util';

describe('createPaging', () => {
  const setup = (count: number, size = 10) => {
    const items = signal(Array.from({ length: count }, (_, i) => i + 1));
    const search = signal('');
    const paging = runInInjectionContext(TestBed.inject(Injector), () =>
      createPaging(() => items(), () => search(), size));
    return { items, search, paging };
  };

  it('shows one page at a time and clamps to the last page', () => {
    const { paging } = setup(25);

    expect(paging.paged()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    paging.goTo(3);
    expect(paging.paged()).toEqual([21, 22, 23, 24, 25]);
    paging.goTo(99);
    expect(paging.page()).toBe(3);
  });

  it('pulls the page back when the list gets shorter, and returns to page 1 for a new search', () => {
    const { items, search, paging } = setup(25);
    paging.goTo(3);

    items.set(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(paging.page()).toBe(2);

    paging.setPageSize(5);
    expect(paging.page()).toBe(1);
    expect(paging.paged().length).toBe(5);

    paging.goTo(2);
    search.set('a');
    TestBed.tick();
    expect(paging.page()).toBe(1);
  });
});
