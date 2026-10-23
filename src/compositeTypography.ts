import { AppState } from './types';
import { getNameTypography } from './nameTypography';
import { applyWatermarkLayout } from './watermarkLayout';

export const TYPE_GRID = 4;

function inkInset(element: HTMLElement) {
  const style = element.ownerDocument.defaultView!.getComputedStyle(element);
  const size = parseFloat(style.fontSize);
  const context = element.ownerDocument.createElement('canvas').getContext('2d')!;
  context.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
  const metrics = context.measureText(element.textContent?.trim() || 'H');
  const ascent = metrics.fontBoundingBoxAscent ?? size * .8;
  const descent = metrics.fontBoundingBoxDescent ?? size * .2;
  return parseFloat(style.paddingTop) + (parseFloat(style.lineHeight) - ascent - descent) / 2 + ascent - metrics.actualBoundingBoxAscent;
}

export function applyCompositeTypography(root: HTMLElement, state: AppState, side?: 'left' | 'right') {
  const typography = getNameTypography(state.profile);
  const name = root.querySelector<HTMLElement>('[data-composite="name"]');
  const contact = root.querySelector<HTMLElement>('[data-composite="contact"]');
  const band = name?.parentElement;
  const topBandHeight = !side && !(state.profile.nameAtBottom ?? true) ? Number(band?.dataset.nameBandHeight) : 0;
  if (band && topBandHeight) band.style.height = `${topBandHeight}px`;
  const bodySize = side ? 14 : 10;
  if (contact) {
    Object.assign(contact.style, { display: 'flex', gridTemplateColumns: '', fontSize: `${bodySize}px`, lineHeight: '1.4', letterSpacing: '0', gap: '4px 8px', margin: '0', paddingBottom: '4px', flexShrink: '0' });
    const style = root.ownerDocument.defaultView!.getComputedStyle(contact);
    const context = root.ownerDocument.createElement('canvas').getContext('2d')!;
    context.font = `${style.fontWeight} ${bodySize}px ${style.fontFamily}`;
    const parts = Array.from(contact.children) as HTMLElement[];
    const widths = parts.map(part => context.measureText(part.textContent || '').width);
    const available = contact.clientWidth;
    const stacked = available > 0 && (widths.some(width => width > available * .65) || widths.reduce((sum, width) => sum + width, 0) > available * 1.8);
    if (stacked) Object.assign(contact.style, { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '3px', lineHeight: '1.35' });
    for (const part of parts) Object.assign(part.style, { minWidth: '0', maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', fontWeight: stacked ? '500' : '' });
    // Extremely long inputs still need to leave room for the model name.
    let fittedBody = bodySize;
    while (band && contact.offsetHeight > band.clientHeight * .65 && fittedBody > (side ? 12 : 8)) {
      fittedBody -= .25; contact.style.fontSize = `${fittedBody}px`;
    }
  }
  if (name && band?.clientHeight) {
    band.style.justifyContent = !side && (state.profile.nameAtBottom ?? true) ? 'flex-start' : 'center';
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
  if (name && band && topBandHeight) {
    band.style.justifyContent = 'flex-start';
    const inset = inkInset(name);
    name.style.marginTop = `${-inset}px`;
    // Keep the photo frame fixed; only the occupied title band moves its position.
    const occupied = name.offsetHeight - inset + 8 + (contact?.offsetHeight ?? 0) + TYPE_GRID;
    band.style.height = `${Math.min(topBandHeight, Math.max(TYPE_GRID, occupied))}px`;
  }
  if (!side && (state.profile.nameAtBottom ?? true) && name && band && attributes) {
    const first = attributes.querySelector<HTMLElement>('[data-composite="measurements"] span');
    if (first && root.clientWidth && root.getBoundingClientRect().width) {
      band.style.justifyContent = 'flex-start';
      const scale = root.getBoundingClientRect().width / root.clientWidth;
      const target = (first.getBoundingClientRect().top - band.getBoundingClientRect().top) / scale + inkInset(first);
      name.style.marginTop = `${target - inkInset(name)}px`;
    }
  }
  // Foreground text has its own opaque backing; the independent logo cannot impair it.
  root.style.isolation = 'isolate';
  for (const node of [name, contact, ...Array.from(attributes?.children ?? [])] as (HTMLElement | null)[]) {
    if (node) Object.assign(node.style, { backgroundColor: '#ffffff', position: 'relative', zIndex: '1' });
  }
  applyWatermarkLayout(root, state, name ? parseFloat(name.style.fontSize) : 52);
}
