import React from 'react';
import { AppState, ProfileData, WatermarkData } from '../types';
import NameTypographyControls from './NameTypographyControls';

export default function WatermarkTypographyControls({ state, onChange, japanese }: { state: AppState; onChange: (patch: Partial<WatermarkData>) => void; japanese: boolean }) {
  const profile = { ...state.profile, name: state.watermark.text, nameFont: state.watermark.font, nameSize: state.watermark.textSize, nameSpacing: state.watermark.textSpacing };
  const change = (patch: Partial<ProfileData>) => {
    const watermark: Partial<WatermarkData> = {};
    if ('nameFont' in patch) watermark.font = patch.nameFont;
    if ('nameSize' in patch) watermark.textSize = patch.nameSize;
    if ('nameSpacing' in patch) watermark.textSpacing = patch.nameSpacing;
    onChange(watermark);
  };
  return <><NameTypographyControls profile={profile} onChange={change} japanese={japanese} watermark />
    <label className="flex items-center gap-2 mt-3 text-xs"><input type="checkbox" checked={!!state.watermark.textItalic} onChange={event => onChange({ textItalic: event.target.checked })} className="accent-black" />{japanese ? '斜体' : 'Italic'}</label>
  </>;
}
