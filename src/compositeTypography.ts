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
    let size = 84 * (side === 'left' ? 1.25 : 1);
    Object.assign(name.style, { fontSize: `${size}px`, lineHeight: '1.15', letterSpacing: `${typography.spacing}em`, fontFamily: typography.font.family, fontWeight: String(typography.font.weight), margin: '0 0 8px', padding: '4px', flexShrink: '0' });
    // Reserve one grid unit for glyph descenders and export rasterizer differences.
    while (name.offsetHeight + (contact && band.contains(contact) ? contact.offsetHeight : 0) + 12 > band.clientHeight && size > 12) name.style.fontSize = `${--size}px`;
    // Scale inside the safe envelope: fitting must not erase slider movement.
    size *= .45 + .55 * (typography.size - 32) / 52;
    name.style.fontSize = `${size}px`;
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
  // Foreground text has its own opaque backing; the independent logo cannot impair it.
  root.style.isolation = 'isolate';
  for (const node of [name, contact, ...Array.from(attributes?.children ?? [])] as (HTMLElement | null)[]) {
    if (node) Object.assign(node.style, { backgroundColor: '#ffffff', position: 'relative', zIndex: '1' });
  }
  if (stamp) Object.assign(stamp.style, { zIndex: '0', right: '12px', bottom: '4px', maxWidth: '240px' });
  if (stamp && state.watermark.type === 'image') {
    const image = stamp.querySelector<HTMLImageElement>('img');
    const maximum = 32;
    const height = Math.min(maximum, maximum * Math.min(140, Math.max(40, state.watermark.size ?? 100)) / 140);
    Object.assign(stamp.style, { height: `${maximum}px`, maxHeight: `${maximum}px`, width: '160px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' });
    if (image) Object.assign(image.style, { width: '100%', height: `${height}px`, maxHeight: `${maximum}px`, objectFit: 'contain', objectPosition: 'right bottom' });
  }
  const text = state.watermark.type === 'text' ? stamp?.firstElementChild as HTMLElement | null : null;
  if (stamp && text) {
    const safeHeight = 44;
    Object.assign(stamp.style, { height: `${safeHeight}px`, maxHeight: `${safeHeight}px`, overflow: 'visible', alignItems: 'center' });
    const font = NAME_FONTS.find(font => font.family === state.watermark.font) || NAME_FONTS[0];
    const nameSize = name ? parseFloat(name.style.fontSize) : 52;
    const height = stamp.clientHeight || 28;
    let size = Math.min(38, nameSize * .8, (height - 8) / 1.4);
    Object.assign(text.style, { fontFamily: font.family, fontWeight: String(font.weight), fontSize: `${size}px`, letterSpacing: `${state.watermark.textSpacing ?? font.spacing}em`, lineHeight: '1.4', padding: '2px 2px 6px', whiteSpace: 'nowrap' });
    // Flex-end overflow can extend above its parent without increasing scrollHeight.
    while ((text.offsetHeight > height || text.scrollWidth > stamp.clientWidth) && size > 1) text.style.fontSize = `${size = Math.max(1, size - .5)}px`;
    text.style.fontSize = `${size * (.65 + .35 * ((state.watermark.textSize ?? 31) - 16) / 22)}px`;
  }
}
