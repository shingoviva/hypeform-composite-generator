import React, { useLayoutEffect, useRef, useState } from 'react';
import { AppState } from '../types';
import { SECOND_PAGE_IDS } from '../secondPage';
import { getCompositeLayout } from '../compositeLayout';
import { getNameTypography } from '../nameTypography';
import { getImageFilter } from '../imageAdjustments';
import ImageAdjustmentFilter from './ImageAdjustmentFilter';
import CompositeWatermark from './CompositeWatermark';
import { applyWatermarkLayout } from '../watermarkLayout';

export default function SecondPagePreview({ state, onImageClick }: { state: AppState; onImageClick: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(.1);
  useLayoutEffect(() => {
    const root = container.current?.querySelector<HTMLElement>('#composite-canvas-page2');
    const reference = document.querySelector<HTMLElement>('#composite-canvas [data-composite="name"]');
    if (!root || !reference) return;
    const update = () => applyWatermarkLayout(root, state, parseFloat(getComputedStyle(reference).fontSize));
    update();
    const observer = new MutationObserver(update);
    observer.observe(reference, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [state, scale]);
  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (!active) return;
      container.current?.querySelectorAll<HTMLElement>('[data-page2-label]').forEach(node => {
        let size = Number(node.dataset.page2Label);
        node.style.fontSize = `${size}px`;
        while (node.scrollWidth > node.clientWidth && size > 1) node.style.fontSize = `${size -= .5}px`;
      });
    };
    fit(); document.fonts.ready.then(fit);
    document.fonts.addEventListener('loadingdone', fit);
    return () => { active = false; document.fonts.removeEventListener('loadingdone', fit); };
  }, [state, scale]);
  useLayoutEffect(() => {
    const node = container.current!;
    const resize = () => {
      if (node.clientWidth && node.clientHeight) setScale(Math.min(node.clientWidth / 1123, node.clientHeight / 794, 1));
    };
    const observer = new ResizeObserver(resize); observer.observe(node); resize();
    return () => observer.disconnect();
  }, []);
  const layout = getCompositeLayout(state.compositeMargin);
  const gap = 16;
  const cellWidth = Math.min((layout.width - layout.columnGap - gap * 2) / 4, (794 - layout.margin * 2 - 64 - gap) / 2 * .8);
  const gridWidth = cellWidth * 4 + gap * 2 + layout.columnGap;
  const typography = getNameTypography(state.profile);
  return <div ref={container} className="relative w-full h-full flex items-center justify-center overflow-hidden">
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <div id="composite-canvas-page2" data-second-page="true" className="bg-white shadow-2xl border border-gray-100" style={{ position: 'relative', width: 1123, height: 794 }}>
        <div style={{ position: 'absolute', zIndex: 1, top: layout.margin, left: (1123 - gridWidth) / 2, display: 'flex', gap: layout.columnGap }}>
          {[0, 1].map(side => <div key={side} data-second-half={side ? 'right' : 'left'} style={{ display: 'grid', gridTemplateColumns: `repeat(2, ${cellWidth}px)`, gap }}>
            {SECOND_PAGE_IDS.slice(side * 4, side * 4 + 4).map((id, index) => {
              const photo = state.images[id];
              const source = photo?.fitMode === 'contain' ? photo.originalUrl || photo.croppedUrl : photo?.croppedUrl;
              return <React.Fragment key={id}>
                <ImageAdjustmentFilter id={`preview-image-adjustment-${id}`} exposure={photo?.exposure} vibrance={photo?.vibrance} />
                <button type="button" data-page2-photo={id} aria-label={`Page 2 photo ${side * 4 + index + 1}`} onClick={() => onImageClick(id)} style={{ width: cellWidth, height: cellWidth / .8, padding: 0, border: 0, overflow: 'hidden', background: '#e5e7eb' }}>
                  {source ? <img src={source} alt={`Page 2 photo ${side * 4 + index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff', filter: getImageFilter(`preview-image-adjustment-${id}`, photo) }} /> : <span style={{ color: '#9ca3af', fontSize: 14 }}>{side * 4 + index + 1}</span>}
                </button>
              </React.Fragment>;
            })}
          </div>)}
        </div>
        <div style={{ position: 'absolute', zIndex: 1, backgroundColor: '#ffffff', left: (1123 - gridWidth) / 2, top: layout.margin + cellWidth / .8 * 2 + gap + 16, width: gridWidth, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div data-composite="name" data-page2-label="24" style={{ flex: 1, minWidth: 0, fontFamily: typography.font.family, fontWeight: typography.font.weight, fontStyle: state.profile.nameItalic ? 'italic' : 'normal', fontSize: 24, lineHeight: '32px', letterSpacing: `${typography.spacing}em`, whiteSpace: 'nowrap' }}>{state.profile.name}</div>
        </div>
        <CompositeWatermark state={state} onLoad={() => {
          const root = container.current?.querySelector<HTMLElement>('#composite-canvas-page2');
          const first = document.querySelector<HTMLElement>('#composite-canvas [data-composite="name"]');
          if (root) applyWatermarkLayout(root, state, first ? parseFloat(getComputedStyle(first).fontSize) : 52);
        }} />
      </div>
    </div>
  </div>;
}
