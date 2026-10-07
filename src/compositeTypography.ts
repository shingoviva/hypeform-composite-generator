import { AppState } from './types';
import { getNameTypography, NAME_FONTS } from './nameTypography';

export const TYPE_GRID = 4;

export function applyCompositeTypography(root: HTMLElement, state: AppState, side?: 'left' | 'right') {
  const typography = getNameTypography(state.profile);
  const name = root.querySelector<HTMLElement>('[data-composite="name"]');
  const contact = root.querySelector<HTMLElement>('[data-composite="contact"]');
  const band = name?.parentElement;
  const bodySize = side ? 14 : 10;
  if (contact) {
    Object.assign(contact.style, { fontSize: `${bodySize}px`, lineHeight: '1.4', letterSpacing: '0', gap: '4px 8px', margin: '0', paddingBottom: '4px', flexShrink: '0' });
  }
  if (name && band?.clientHeight) {
    let size = typography.size * (side === 'left' ? 1.25 : 1);
    Object.assign(name.style, { fontSize: `${size}px`, lineHeight: '1.15', letterSpacing: `${typography.spacing}em`, fontFamily: typography.font.family, fontWeight: String(typography.font.weight), margin: '0 0 8px', padding: '4px', flexShrink: '0' });
    // Reserve one grid unit for glyph descenders and export rasterizer differences.
    while (name.offsetHeight + (contact && band.contains(contact) ? contact.offsetHeight : 0) + 12 > band.clientHeight && size > 12) name.style.fontSize = `${--size}px`;
  }
  const attributes = root.querySelector<HTMLElement>('[data-composite="attributes"]');
  if (attributes) {
    const blocks = attributes.querySelectorAll<HTMLElement>('[data-composite="measurements"], [data-composite="details"]');
    let size = side ? 16 : 10;
    attributes.style.gap = '4px';
    blocks.forEach(block => Object.assign(block.style, { fontSize: `${size}px`, lineHeight: '1.4', letterSpacing: '0', rowGap: '4px', flexShrink: '0' }));
    blocks.forEach(block => Array.from(block.children).forEach(part => {
      const label = part.firstElementChild as HTMLElement | null;
      if (label) Object.assign(label.style, { color: '#666666', fontWeight: '500' });
    }));
    while (attributes.scrollHeight > attributes.clientHeight && size > (side ? 12 : 8)) {
      size -= .25;
      blocks.forEach(block => { block.style.fontSize = `${size}px`; });
    }
  }
  const stamp = root.querySelector<HTMLElement>('[data-composite="watermark"]');
  const text = state.watermark.type === 'text' ? stamp?.firstElementChild as HTMLElement | null : null;
  if (stamp && text) {
    const font = NAME_FONTS.find(font => font.family === state.watermark.font) || NAME_FONTS[0];
    const nameSize = name ? parseFloat(name.style.fontSize) : 52;
    let size = Math.min(state.watermark.textSize ?? 31, 38, nameSize * .8);
    Object.assign(text.style, { fontFamily: font.family, fontWeight: String(font.weight), fontSize: `${size}px`, letterSpacing: `${state.watermark.textSpacing ?? font.spacing}em`, lineHeight: '1.2', padding: '4px', overflowWrap: 'anywhere' });
    while ((stamp.scrollHeight > stamp.clientHeight || stamp.scrollWidth > stamp.clientWidth) && size > 12) text.style.fontSize = `${--size}px`;
  }
}
