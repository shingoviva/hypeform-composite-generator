import { AppState } from './types';
import { getNameTypography } from './nameTypography';

export function layoutInstagram(target: HTMLElement, state: AppState, side: 'left' | 'right') {
  const document = target.ownerDocument;
  const margin = Math.min(100, Math.max(40, state.instagram?.margin ?? 64));
  const gap = Math.min(40, Math.max(16, state.instagram?.gap ?? 24));
  const get = (role: string) => target.querySelector<HTMLElement>(`[data-composite="${role}"]`);
  const name = get('name')!;
  const contact = get('contact');
  const main = get('main')!;
  const gallery = get('gallery')!;
  const measurements = get('measurements')!;
  const details = get('details')!;
  const watermark = get('watermark');
  const header = document.createElement('div');
  header.style.cssText = 'flex-shrink:0;text-align:center';
  const typography = getNameTypography(state.profile);
  name.style.cssText += `;font-size:${typography.size / typography.defaultSize * (side === 'left' ? 68 : 48)}px;line-height:1.15;letter-spacing:${typography.spacing}em;margin:0 0 12px;overflow-wrap:anywhere`;
  header.append(name);
  if (side === 'left' && contact) {
    contact.style.cssText = 'font-size:14px;line-height:1.5;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 8px;white-space:normal;overflow-wrap:anywhere';
    header.append(contact);
  }
  const body = side === 'left' ? main : gallery;
  body.style.cssText = side === 'left'
    ? 'flex:1;min-height:0;width:100%;background:white;overflow:hidden'
    : `flex:1;min-height:0;width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:${gap}px`;
  body.querySelectorAll<HTMLImageElement>('img').forEach(img => {
    img.style.cssText += ';width:100%;height:100%;object-fit:contain;background:white';
  });
  const footer = document.createElement('div');
  footer.style.cssText = 'flex-shrink:0;text-align:center;border-top:1px solid black;padding-top:18px;display:flex;flex-direction:column;gap:10px';
  for (const node of [measurements, details]) {
    node.style.cssText = 'font-size:16px;line-height:1.5;letter-spacing:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;white-space:normal;overflow-wrap:anywhere';
    node.querySelectorAll<HTMLElement>('span').forEach(span => { span.style.whiteSpace = 'normal'; span.style.minWidth = '0'; });
    footer.append(node);
  }
  target.replaceChildren();
  target.style.cssText = `position:relative;width:1080px;height:1350px;box-sizing:border-box;background:white;color:black;padding:${margin}px ${margin}px ${watermark ? Math.max(96, margin) : margin}px;display:flex;flex-direction:column;gap:24px;overflow:hidden`;
  if (side === 'left' && state.profile.nameAtBottom) target.append(body, header);
  else target.append(header, body);
  if (side === 'right') target.append(footer);
  if (watermark) {
    watermark.style.cssText = `position:absolute;bottom:24px;right:${margin}px;max-width:${1080 - margin * 2}px;opacity:${state.watermark.opacity / 100};text-align:right`;
    if (state.watermark.type === 'text') {
      const text = watermark.firstElementChild as HTMLElement | null;
      if (text) text.style.cssText += ';line-height:1.3;padding:4px 0;overflow-wrap:anywhere;letter-spacing:0';
    } else {
      watermark.style.width = '190px'; watermark.style.height = '56px';
      watermark.style.display = 'flex'; watermark.style.alignItems = 'flex-end'; watermark.style.justifyContent = 'flex-end';
    }
    target.append(watermark);
  }
  // Keep unusually long profile text inside the reserved outer margins.
  while (header.offsetHeight + (side === 'right' ? footer.offsetHeight : 0) > 300 && parseFloat(name.style.fontSize) > 36) {
    name.style.fontSize = `${parseFloat(name.style.fontSize) - 2}px`;
  }
}
