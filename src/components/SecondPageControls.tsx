import React from 'react';
import { AppState } from '../types';
import { enableSecondPage, SECOND_PAGE_IDS } from '../secondPage';
import { getImageFilter } from '../imageAdjustments';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onImageClick: (id: string) => void;
  japanese: boolean;
}

export default function SecondPageControls({ state, setState, onImageClick, japanese }: Props) {
  return <section className="border-t border-gray-200 pt-4">
    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
      <input type="checkbox" name="secondPageEnabled" checked={!!state.secondPageEnabled} onChange={event => setState(previous => enableSecondPage(previous, event.target.checked))} aria-controls="second-page-photos" aria-expanded={!!state.secondPageEnabled} className="accent-black" />
      {japanese ? '2枚目を追加' : 'Add a second page'}
    </label>
    {state.secondPageEnabled && <div id="second-page-photos" className="mt-4 space-y-4">
      {[0, 1].map(side => <div key={side}>
        <h3 className="text-[10px] uppercase text-gray-400 mb-2">{japanese ? (side ? '右側' : '左側') : (side ? 'Right side' : 'Left side')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {SECOND_PAGE_IDS.slice(side * 4, side * 4 + 4).map((id, index) => {
            const image = state.images[id];
            const label = `${japanese ? '2枚目・写真' : 'Page 2 photo'} ${side * 4 + index + 1}`;
            const source = image?.fitMode === 'contain' ? image.originalUrl || image.croppedUrl : image?.croppedUrl;
            return <div key={id}>
              <button type="button" aria-label={label} onClick={() => onImageClick(id)} className="w-full aspect-[4/5] bg-gray-100 border border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center hover:bg-gray-200">
                {source ? <img src={source} alt={label} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter(`form-image-adjustment-${id}`, image) }} /> : <span className="text-xs text-gray-400">+ {side * 4 + index + 1}</span>}
              </button>
              <label className="flex items-center gap-1.5 mt-2 text-[9px] text-gray-500">
                <input type="checkbox" checked={image?.fitMode === 'contain'} onChange={event => setState(previous => ({ ...previous, images: { ...previous.images, [id]: { ...previous.images[id], fitMode: event.target.checked ? 'contain' : 'cover' } } }))} />
                {japanese ? '全体を収める（余白あり）' : 'Fit entire image'}
              </label>
            </div>;
          })}
        </div>
      </div>)}
    </div>}
  </section>;
}
