import { AppState } from './types';
import { applyCompositeTypography } from './compositeTypography';
import { applyWatermarkLayout } from './watermarkLayout';

export function layoutSecondPageInstagram(target: HTMLElement, state: AppState, side: 'left' | 'right', referenceNameSize?: number) {
  const name = target.querySelector<HTMLElement>('[data-composite="name"]')!;
  const body = target.querySelector<HTMLElement>(`[data-second-half="${side}"]`)!;
  const watermark = target.querySelector<HTMLElement>('[data-composite="watermark"]');
  const contact = target.querySelector<HTMLElement>('[data-composite="contact"]');
  const headerHeight = side === 'left' || contact ? 96 : 64;
  const margin = Math.min(100, Math.max(24, state.instagram?.margin ?? 32));
  const gap = Math.min(40, Math.max(16, state.instagram?.gap ?? 24));
  const header = target.ownerDocument.createElement('div');
  Object.assign(name.style, { flex: 'none', width: '100%', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center' });
  header.style.cssText = `flex-shrink:0;text-align:center;height:${headerHeight}px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative;z-index:1`;
  header.append(name);
  if (contact) {Object.assign(contact.style,{display:'flex',justifyContent:'center',flexWrap:'wrap',textAlign:'center'});header.append(contact);}
  target.replaceChildren();
  target.style.cssText = `position:relative;isolation:isolate;width:1080px;height:1350px;box-sizing:border-box;background:white;color:black;padding:${margin}px;display:flex;flex-direction:column;gap:12px;overflow:hidden`;
  const height = 1350 - margin * 2 - headerHeight - 12;
  const width = Math.min(1080 - margin * 2, (height - gap) * .8 + gap);
  body.style.cssText = `width:${width}px;height:${(width - gap) / .8 + gap}px;max-height:${height}px;align-self:center;flex-shrink:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:${gap}px;position:relative;z-index:1;background:white`;
  body.querySelectorAll<HTMLElement>('[data-page2-photo]').forEach(frame => {
    frame.style.cssText = 'width:100%;height:100%;padding:0;border:0;overflow:hidden;background:#e5e7eb;min-height:0;min-width:0';
  });
  if (state.profile.nameAtBottom ?? true) target.append(body, header);
  else target.append(header, body);
  if (watermark) target.append(watermark);
  applyCompositeTypography(target, state, side);
  if (referenceNameSize !== undefined) applyWatermarkLayout(target, state, referenceNameSize);
}
