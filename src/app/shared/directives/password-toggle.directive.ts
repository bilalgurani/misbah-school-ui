import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.45-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.17c0-1.66-1.34-3-3-3l-.17.02z"/></svg>';

/**
 * Adds a show/hide (eye) button to every password input of a component that imports it.
 * The input is wrapped so the button sits inside it; forms and validation are not affected.
 */
@Directive({ selector: 'input[type=password]' })
export class PasswordToggleDirective implements OnInit, OnDestroy {
  private input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private wrapper: HTMLElement | null = null;

  ngOnInit(): void {
    const parent = this.input.parentNode;
    if (!parent) return;

    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'position:relative;display:block;width:100%';
    parent.insertBefore(wrapper, this.input);
    wrapper.appendChild(this.input);
    this.input.style.paddingRight = '2.75rem';
    this.input.style.boxSizing = 'border-box';

    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.style.cssText = 'position:absolute;top:50%;right:0.5rem;transform:translateY(-50%);width:36px;height:36px;'
      + 'display:inline-flex;align-items:center;justify-content:center;padding:0;border:none;background:none;'
      + 'color:var(--muted-foreground);cursor:pointer;border-radius:var(--radius)';

    const render = () => {
      const visible = this.input.type === 'text';
      button.innerHTML = visible ? EYE : EYE_OFF;
      button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    };
    button.addEventListener('click', () => {
      this.input.type = this.input.type === 'password' ? 'text' : 'password';
      render();
      this.input.focus();
    });
    render();

    wrapper.appendChild(button);
    this.wrapper = wrapper;
  }

  // The wrapper was added by hand, so it is removed by hand when the input goes away.
  ngOnDestroy(): void {
    this.wrapper?.remove();
  }
}
