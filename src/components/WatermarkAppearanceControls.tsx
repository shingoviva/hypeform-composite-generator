import { AppState } from '../types';
import SnapRange from './SnapRange';

interface Props {
  watermark: AppState['watermark'];
  onChange: (patch: Partial<AppState['watermark']>) => void;
  japanese: boolean;
}

export default function WatermarkAppearanceControls({ watermark, onChange, japanese }: Props) {
  const fields = watermark.type === 'image' ? ['size', 'opacity'] as const : ['opacity'] as const;
  return <div className="space-y-3 text-xs">
    {fields.map(key => {
      const label = key === 'size' ? (japanese ? 'ロゴサイズ' : 'Logo size') : (japanese ? '不透明度' : 'Opacity');
      const value = key === 'size' ? watermark.size ?? 100 : watermark.opacity;
      return <label key={key} className="block"><span>{label}</span><span className="float-right text-gray-500 tabular-nums">{value}%</span>
        <SnapRange name={key} aria-label={key === 'size' ? (japanese ? 'ウォーターマークのサイズ' : 'Watermark size') : (japanese ? 'ウォーターマークの不透明度' : 'Watermark opacity')} defaultValueNumber={key === 'size' ? 100 : 50} min={key === 'size' ? 40 : 0} max={key === 'size' ? 140 : 100} value={value} onChange={event => onChange({ [key]: Number(event.target.value) })} className="w-full accent-black" />
      </label>;
    })}
  </div>;
}
