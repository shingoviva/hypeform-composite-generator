import React, { useEffect, useRef } from 'react';
import { X, Instagram } from 'lucide-react';
import { AppState, ProfileData } from '../types';
import { UiLanguage } from '../App';
import NameTypographyControls from './NameTypographyControls';
import SnapRange from './SnapRange';
import WatermarkTypographyControls from './WatermarkTypographyControls';
import WatermarkAppearanceControls from './WatermarkAppearanceControls';
import { DEFAULT_COMPOSITE_MARGIN } from '../compositeLayout';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  language: UiLanguage;
  onClose: () => void;
  onInstagram: () => void;
  exporting: boolean;
}

export default function PreviewOptions({ state, setState, language, onClose, onInstagram, exporting }: Props) {
  const ja = language === 'ja';
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        document.querySelector<HTMLButtonElement>('[aria-controls="preview-options"]')?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!panelRef.current?.contains(target) && !target.closest('[aria-controls="preview-options"]')) onClose();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [onClose]);
  const profile = (patch: Partial<ProfileData>) => setState(previous => ({ ...previous, profile: { ...previous.profile, ...patch } }));
  const watermark = (patch: Partial<AppState['watermark']>) => setState(previous => ({ ...previous, watermark: { ...previous.watermark, ...patch } }));
  const visibility: [keyof ProfileData, string][] = [['showContact', ja ? '電話番号' : 'Phone'], ['showEmail', ja ? 'メール' : 'Email'], ['showNationality', ja ? '国籍' : 'Nationality'], ['showResidence', ja ? '拠点' : 'Base'], ['showExperience', ja ? '実績' : 'Experience']];
  return <section ref={panelRef} id="preview-options" aria-label={ja ? 'レイアウト調整' : 'Layout adjustments'} className="absolute top-16 right-2 z-[60] w-[288px] max-w-[calc(100%_-_1rem)] max-h-[calc(100%_-_4.5rem)] overflow-y-auto bg-white border border-gray-200 shadow-lg rounded-lg p-4 text-xs">
    <div className="flex justify-between items-center mb-3"><h2 className="font-bold">{ja ? 'レイアウト調整' : 'Layout adjustments'}</h2><button onClick={onClose} aria-label={ja ? '調整を閉じる' : 'Close adjustments'} className="p-2"><X size={16} /></button></div>
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-2"><span>{ja ? '名前の位置' : 'Name position'}</span><select value={(state.profile.nameAtBottom ?? true) ? 'bottom' : 'top'} onChange={e => profile({ nameAtBottom: e.target.value === 'bottom' })} className="border-b border-gray-200 bg-white py-1"><option value="top">{ja ? '上' : 'Top'}</option><option value="bottom">{ja ? '下' : 'Bottom'}</option></select></label>
      <NameTypographyControls profile={state.profile} onChange={profile} japanese={ja} />
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!state.profile.nameItalic} onChange={e => profile({ nameItalic: e.target.checked })} className="accent-black" />{ja ? '斜体' : 'Italic'}</label>
      <label className="block border-t border-gray-100 pt-3">{ja ? 'コンポジットの余白' : 'Composite margin'}<span className="float-right text-gray-500">{state.compositeMargin ?? DEFAULT_COMPOSITE_MARGIN} px</span><SnapRange defaultValueNumber={DEFAULT_COMPOSITE_MARGIN} aria-label={ja ? 'コンポジットの余白' : 'Composite margin'} min="16" max="80" value={state.compositeMargin ?? DEFAULT_COMPOSITE_MARGIN} onChange={e => setState(previous => ({ ...previous, compositeMargin: Number(e.target.value) }))} className="w-full accent-black" /></label>
      <details className="border-t border-gray-100 pt-3"><summary className="cursor-pointer font-medium">{ja ? '表示する情報' : 'Visible information'}</summary><div className="grid grid-cols-2 gap-3 mt-3">{visibility.map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={!!state.profile[key]} onChange={e => profile({ [key]: e.target.checked })} className="accent-black" />{label}</label>)}</div></details>
      <details className="border-t border-gray-100 pt-3"><summary className="cursor-pointer font-medium">{ja ? 'ウォーターマーク' : 'Watermark'}</summary><div className="space-y-3 mt-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={state.watermark.enabled} onChange={e => watermark({ enabled: e.target.checked })} className="accent-black" />{ja ? '表示' : 'Show'}</label>
        {state.watermark.type === 'text' && <label className="block">{ja ? 'テキスト' : 'Text'}<input value={state.watermark.text} onChange={e => watermark({ text: e.target.value })} className="w-full border-b border-gray-200 py-1 mt-1" /></label>}
        {state.watermark.type === 'text' && <WatermarkTypographyControls state={state} onChange={watermark} japanese={ja} />}
        <WatermarkAppearanceControls watermark={state.watermark} onChange={watermark} japanese={ja} />
      </div></details>
      <details className="border-t border-gray-100 pt-3"><summary className="cursor-pointer font-medium flex items-center gap-2"><Instagram size={14} />{ja ? 'Instagram用に出力' : 'Instagram export'}</summary><div className="space-y-3 mt-3">
        <span className="text-gray-500">1080 × 1350 · 4:5 · {ja ? '左・右の2枚' : 'Left + right'}</span>
        {(['margin', 'gap'] as const).map(key => <label key={key} className="block">{key === 'margin' ? (ja ? '外側の余白' : 'Outer margin') : (ja ? '写真の間隔' : 'Photo spacing')}<span className="float-right text-gray-500">{state.instagram?.[key] ?? (key === 'margin' ? 32 : 24)} px</span><SnapRange defaultValueNumber={key === 'margin' ? 32 : 24} aria-label={key === 'margin' ? 'Instagram margin' : 'Instagram spacing'} min={key === 'margin' ? 24 : 16} max={key === 'margin' ? 100 : 40} value={state.instagram?.[key] ?? (key === 'margin' ? 32 : 24)} onChange={e => setState(previous => ({ ...previous, instagram: { margin: previous.instagram?.margin ?? 32, gap: previous.instagram?.gap ?? 24, [key]: Number(e.target.value) } }))} className="w-full accent-black" /></label>)}
        <button disabled={exporting} onClick={onInstagram} className="w-full border border-gray-300 py-2 flex items-center justify-center gap-2 disabled:opacity-50"><Instagram size={16} />{exporting ? (ja ? '作成中…' : 'Preparing...') : (ja ? '2枚を作成' : 'Prepare two images')}</button>
      </div></details>
    </div>
  </section>;
}
