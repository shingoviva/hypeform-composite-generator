import { AppState } from './types';
import { MAIN_PHOTO_RATIO, SUB_PHOTO_RATIO } from './compositeLayout';
import { applyCompositeTypography } from './compositeTypography';

export function layoutInstagram(target: HTMLElement, state: AppState, side: 'left' | 'right') {
  const document = target.ownerDocument;
  const margin = Math.min(100, Math.max(24, state.instagram?.margin ?? 32));
  const gap = Math.min(40, Math.max(16, state.instagram?.gap ?? 24));
  const get = (role: string) => target.querySelector<HTMLElement>(`[data-composite="${role}"]`);
  const name = get('name')!;
  const contact = get('contact');
  const main = get('main')!;
  const gallery = get('gallery')!;
  const measurements = get('measurements')!;
  const details = get('details')!;
  const watermark = get('watermark');
  const hasSocial = !!contact?.querySelector('[data-social="instagram"]');
  const header = document.createElement('div');
  header.style.cssText = `flex-shrink:0;text-align:center;height:${side === 'left' || hasSocial ? 96 : 64}px;display:flex;flex-direction:column;justify-content:center;overflow:hidden`;
  header.append(name);
  if (side === 'left' && contact) {
    contact.style.cssText = 'font-size:14px;line-height:1.5;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 8px;white-space:normal;overflow-wrap:anywhere';
    header.append(contact);
  }
  if (side === 'right' && contact?.querySelector('[data-social="instagram"]')) {
    const social = document.createElement('p'); social.dataset.composite = 'contact';social.style.cssText = 'display:flex;justify-content:center;flex-wrap:wrap;text-align:center';
    social.append(contact.querySelector('[data-social="instagram"]')!.cloneNode(true));
    header.append(social);
  }
  const body = side === 'left' ? main : gallery;
  body.style.cssText = side === 'left'
    ? 'flex:1;min-height:0;width:100%;background:white;overflow:hidden'
    : `flex:1;min-height:0;width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:${gap}px`;
  body.querySelectorAll<HTMLImageElement>('img').forEach(img => {
    img.style.cssText += ';width:100%;height:100%;object-fit:contain;background:white';
  });
  const footer = document.createElement('div');
  footer.dataset.composite = 'attributes';
  footer.style.cssText = 'height:96px;box-sizing:border-box;overflow:hidden;flex-shrink:0;text-align:center;padding-top:8px;display:flex;flex-direction:column;gap:4px';
  for (const node of [measurements, details]) {
    node.style.cssText = 'font-size:16px;line-height:1.5;letter-spacing:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;white-space:normal;overflow-wrap:anywhere';
    node.querySelectorAll<HTMLElement>('span').forEach(span => { span.style.whiteSpace = 'normal'; span.style.minWidth = '0'; });
    footer.append(node);
  }
  target.replaceChildren();
  target.style.cssText = `position:relative;isolation:isolate;width:1080px;height:1350px;box-sizing:border-box;background:white;color:black;padding:${margin}px;display:flex;flex-direction:column;gap:12px;overflow:hidden`;
  for (const layer of [body, header, footer]) Object.assign(layer.style, { position: 'relative', zIndex: '1' });
  if (state.profile.nameAtBottom ?? true) target.append(body, header);
  else target.append(header, body);
  if (side === 'right') target.append(footer);
  if (watermark) {
    watermark.style.cssText = `position:absolute;display:flex;justify-content:flex-end;opacity:${state.watermark.opacity / 100};text-align:right`;
    target.append(watermark);
  }
  applyCompositeTypography(target, state, side);
  const photoWidth = side === 'left'
    ? body.clientHeight * MAIN_PHOTO_RATIO
    : (body.clientHeight - gap) * SUB_PHOTO_RATIO + gap;
  body.style.width = `${Math.min(1080 - margin * 2, photoWidth)}px`;
  body.style.alignSelf = 'center';
}
