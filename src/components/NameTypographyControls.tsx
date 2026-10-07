import React from 'react';
import { RotateCcw } from 'lucide-react';
import { ProfileData } from '../types';
import { NAME_FONTS, getNameTypography } from '../nameTypography';

interface Props {
  profile: ProfileData;
  onChange: (patch: Partial<ProfileData>) => void;
  japanese: boolean;
}

export default function NameTypographyControls({ profile, onChange, japanese }: Props) {
  const { font, size, spacing } = getNameTypography(profile);
  return <div className="space-y-2 mt-3 text-xs">
    <label className="flex items-center justify-between gap-2"><span>{japanese ? '書体' : 'Typeface'}</span>
      <select aria-label={japanese ? '名前の書体' : 'Name typeface'} name="nameFont" value={font.family} onChange={event => onChange({ nameFont: event.target.value })} className="max-w-44 min-w-0 border-b border-gray-200 bg-transparent py-1">
        {NAME_FONTS.map(font => <option key={font.name} value={font.family}>{font.name}</option>)}
      </select>
    </label>
    <label className="block"><span>{japanese ? '文字サイズ' : 'Name size'}</span><span className="float-right text-gray-500 tabular-nums">{size} px</span>
      <input aria-label={japanese ? '名前の文字サイズ' : 'Name size'} type="range" min="32" max="84" step="1" value={size} onChange={event => onChange({ nameSize: Number(event.target.value) })} className="w-full accent-black" />
    </label>
    <label className="block"><span>{japanese ? '文字間隔' : 'Letter spacing'}</span><span className="float-right text-gray-500 tabular-nums">{(spacing * 100).toFixed(1)}%</span>
      <input aria-label={japanese ? '名前の文字間隔' : 'Name letter spacing'} type="range" min="0" max="0.12" step="0.005" value={spacing} onChange={event => onChange({ nameSpacing: Number(event.target.value) })} className="w-full accent-black" />
    </label>
    <button type="button" onClick={() => onChange({ nameSize: undefined, nameSpacing: undefined })} disabled={profile.nameSize === undefined && profile.nameSpacing === undefined} className="flex items-center gap-1 text-gray-500 hover:text-black disabled:opacity-40" title={japanese ? '文字サイズと間隔を標準に戻す' : 'Restore default size and spacing'}><RotateCcw size={13} />{japanese ? '標準に戻す' : 'Use defaults'}</button>
  </div>;
}
