import { AppState } from './types';
import { NAME_FONTS } from './nameTypography';

export function applyWatermarkLayout(root: HTMLElement, state: AppState, nameSize = 52) {
  root.dataset.watermarkNameSize = String(nameSize);
  const stamp = root.querySelector<HTMLElement>('[data-composite="watermark"]');
  if (!stamp) return;
  Object.assign(stamp.style, { position: 'absolute', zIndex: '0', right: '12px', bottom: '4px', maxWidth: '240px' });
  if (state.watermark.type === 'image') {
    const image = stamp.querySelector<HTMLImageElement>('img');
    const maximum = 32;
    const height = Math.min(maximum, maximum * Math.min(140, Math.max(40, state.watermark.size ?? 100)) / 140);
    Object.assign(stamp.style, { height: `${maximum}px`, maxHeight: `${maximum}px`, width: '160px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' });
    if (image) Object.assign(image.style, { width: '100%', height: `${height}px`, maxHeight: `${maximum}px`, objectFit: 'contain', objectPosition: 'right bottom' });
  }
  const text = state.watermark.type === 'text' ? stamp.firstElementChild as HTMLElement | null : null;
  if (!text) return;
  const safeHeight = 44;
  Object.assign(stamp.style, { height: `${safeHeight}px`, maxHeight: `${safeHeight}px`, overflow: 'visible', alignItems: 'center' });
  const font = NAME_FONTS.find(font => font.family === state.watermark.font) || NAME_FONTS[0];
  let size = Math.min(38, nameSize * .8, (safeHeight - 8) / 1.4);
  Object.assign(text.style, { fontFamily: font.family, fontWeight: String(font.weight), fontSize: `${size}px`, letterSpacing: `${state.watermark.textSpacing ?? font.spacing}em`, lineHeight: '1.4', padding: '2px 2px 6px', whiteSpace: 'nowrap' });
  while ((text.offsetHeight > safeHeight || text.scrollWidth > stamp.clientWidth) && size > 1) text.style.fontSize = `${size = Math.max(1, size - .5)}px`;
  text.style.fontSize = `${size * (.65 + .35 * ((state.watermark.textSize ?? 31) - 16) / 22)}px`;
}
