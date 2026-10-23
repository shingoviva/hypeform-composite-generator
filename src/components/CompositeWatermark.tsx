import React from 'react';
import { AppState } from '../types';
import { NAME_FONTS } from '../nameTypography';
import LogoImage from './LogoImage';

export default function CompositeWatermark({ state, onLoad }: { state: AppState; onLoad?: () => void }) {
  const watermark = state.watermark;
  if (!watermark.enabled) return null;
  const font = NAME_FONTS.find(font => font.family === watermark.font) || NAME_FONTS[0];
  return <div data-composite="watermark" className={`absolute pointer-events-none z-0 flex items-end justify-end ${watermark.type === 'image' ? 'overflow-hidden' : ''}`} style={{ opacity: watermark.opacity / 100, right: 12, bottom: 4, maxWidth: 240, maxHeight: watermark.type === 'image' ? 32 : 44, overflow: watermark.type === 'image' ? 'hidden' : 'visible', width: watermark.type === 'image' ? 160 : undefined, height: watermark.type === 'image' ? 32 : 44 }}>
    {watermark.type === 'text' && watermark.text && <div className={`text-black text-right ${watermark.textItalic ? 'italic' : ''}`} style={{ fontFamily: font.family, fontWeight: font.weight, letterSpacing: `${watermark.textSpacing ?? font.spacing}em`, fontSize: Math.min(38, Math.max(16, watermark.textSize ?? 31)), lineHeight: 1.2, padding: '2px 4px', overflowWrap: 'anywhere' }}>{watermark.text}</div>}
    {watermark.type === 'image' && watermark.imageUrl && <LogoImage src={watermark.imageUrl} onLoad={onLoad} alt="Agency Logo" className="block w-auto object-contain object-right-bottom" style={{ height: 32 * Math.min(140, Math.max(40, watermark.size ?? 100)) / 140, maxWidth: 160, maxHeight: 32 }} />}
  </div>;
}
