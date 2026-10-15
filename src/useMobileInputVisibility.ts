import { useEffect } from 'react';

const textField = (element: Element | null): element is HTMLElement => element instanceof HTMLElement && element.matches('textarea, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"])');

export function useMobileInputVisibility() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const html = document.documentElement;
    let restingHeight = viewport?.height ?? window.innerHeight;
    let restingWidth = window.innerWidth;
    let frame = 0, settle = 0;
    const reveal = () => {
      if (!window.matchMedia('(max-width: 1023px)').matches || (viewport && viewport.scale !== 1)) return;
      const field = document.activeElement;
      if (!textField(field)) return;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      for (let parent = field.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (!/auto|scroll/.test(getComputedStyle(parent).overflowY) || parent.clientHeight === 0) continue;
        const bounds = parent.getBoundingClientRect();
        const top = Math.max(bounds.top, viewportTop) + 12;
        const bottom = Math.min(bounds.bottom, viewportBottom) - 12;
        if (bottom <= top) continue;
        const rect = field.getBoundingClientRect();
        // Include the label above the input, without scrolling the entire app shell.
        const labelTop = rect.top - 28;
        if (labelTop < top) parent.scrollTop += labelTop - top;
        else if (rect.bottom > bottom) parent.scrollTop += rect.bottom - bottom;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(reveal); });
    };
    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      if (!viewport || viewport.scale === 1) html.style.setProperty('--app-height', `${height}px`);
      const editing = textField(document.activeElement);
      html.dataset.textEditing = String(editing);
      if (window.innerWidth !== restingWidth) {
        restingWidth = window.innerWidth;
        restingHeight = Math.max(window.innerHeight, height);
      } else if (!editing) restingHeight = Math.max(restingHeight, height);
      const keyboard = editing && window.matchMedia('(max-width: 1023px)').matches && (!viewport || viewport.scale === 1) && restingHeight - height > 120;
      html.dataset.keyboardOpen = String(keyboard);
      schedule();
    };
    const focus = () => {
      update();
      window.clearTimeout(settle);
      settle = window.setTimeout(update, 350);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', focus);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(settle);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', focus);
      html.style.removeProperty('--app-height'); delete html.dataset.keyboardOpen; delete html.dataset.textEditing;
    };
  }, []);
}
