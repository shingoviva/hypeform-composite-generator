import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { UiLanguage } from '../App';
import {
  DEFAULT_EXPOSURE,
  DEFAULT_VIBRANCE,
  getImageFilter
} from '../imageAdjustments';
import ImageAdjustmentFilter from './ImageAdjustmentFilter';
import { cropPhoto } from '../photoCanvas';
import SnapRange from './SnapRange';
import { X } from 'lucide-react';

// Contain mode uses the original file without a redundant padded copy.

interface ImageCropperModalProps {
  key?: React.Key;
  isOpen: boolean;
  imageUrl: string;
  aspectRatio: number;
  initialFitMode?: 'cover' | 'contain';
  initialExposure?: number;
  initialVibrance?: number;
  initialCrop?: Point;
  initialZoom?: number;
  initialCropArea?: Area;
  onClose: () => void;
  onCropComplete: (
    croppedUrl: string,
    fitMode: 'cover' | 'contain',
    exposure: number,
    vibrance: number,
    crop: Point,
    zoom: number,
    cropArea?: Area
  ) => void;
  onChangeImage: () => void;
  uiLanguage: UiLanguage;
}

const t = {
  en: {
    cropImage: 'Crop Image',
    zoom: 'Zoom',
    exposure: 'Exposure',
    vibrance: 'Vibrance',
    resetAdjustments: 'Reset adjustments',
    fitToFrame: 'Fit entire image (Show borders)',
    changeImage: 'Change Image',
    cancel: 'Cancel',
    applyCrop: 'Apply Crop'
  },
  ja: {
    cropImage: '画像のトリミング',
    zoom: 'ズーム',
    exposure: '露出',
    vibrance: '自然な彩度',
    resetAdjustments: '調整をリセット',
    fitToFrame: '全体を収める（余白あり）',
    changeImage: '画像を変更',
    cancel: 'キャンセル',
    applyCrop: '適用する'
  }
};

export default function ImageCropperModal({
  isOpen,
  imageUrl,
  aspectRatio,
  initialFitMode = 'cover',
  initialExposure = DEFAULT_EXPOSURE,
  initialVibrance = DEFAULT_VIBRANCE,
  initialCrop = { x: 0, y: 0 },
  initialZoom = 1,
  initialCropArea,
  onClose,
  onCropComplete,
  onChangeImage,
  uiLanguage
}: ImageCropperModalProps) {
  const lang = t[uiLanguage];
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState(initialZoom);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>(initialFitMode);
  const [exposure, setExposure] = useState(initialExposure);
  const [vibrance, setVibrance] = useState(initialVibrance);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropArea, setCropArea] = useState<Area | undefined>(initialCropArea);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [isOpen]);
  const imageFilterId = 'cropper-image-adjustment';
  const imageFilter = getImageFilter(imageFilterId, { exposure, vibrance });

  const handleCropComplete = useCallback((area: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
    setCropArea(area);
  }, []);

  const handleSave = async () => {
    if (saving) return;
    // We need croppedAreaPixels if it's cover mode.
    // If it's contain mode, getCroppedImg ignores croppedAreaPixels.
    if (croppedAreaPixels || fitMode === 'contain') {
      try {
        setSaving(true);
        setError('');
        // Fallback for croppedAreaPixels to make TypeScript happy if it happens to be null in contain mode
        const area = croppedAreaPixels || { x: 0, y: 0, width: 0, height: 0 };
        const croppedImage = fitMode === 'contain' ? imageUrl : await cropPhoto(imageUrl, area);
        onCropComplete(croppedImage, fitMode, exposure, vibrance, crop, zoom, cropArea);
      } catch (e) {
        console.error(e);
        setError(uiLanguage === 'ja' ? '写真を読み込めません。JPEGまたはPNGの写真を選び直してください。' : 'Unable to process this photo. Please choose a JPEG or PNG image.');
      } finally {
        setSaving(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cropper-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="crop-title" onKeyDown={event => {
        if (event.key === 'Escape' && !saving) { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const nodes = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
          const controls = (Array.from(nodes ?? []) as HTMLElement[]).filter(control => control.getClientRects().length > 0);
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }} className="cropper-modal-panel bg-white rounded-lg w-full max-w-2xl shadow-2xl flex flex-col">
        <ImageAdjustmentFilter
          id={imageFilterId}
          exposure={exposure}
          vibrance={vibrance}
        />
        <div className="cropper-modal-header p-4 border-b border-neutral-200 flex justify-between items-center shrink-0">
          <h3 id="crop-title" className="font-semibold text-lg">{lang.cropImage}</h3>
          <button onClick={onClose} disabled={saving} aria-label={lang.cancel} className="text-neutral-500 hover:text-black min-w-11 min-h-11">
            <X size={20} className="mx-auto" />
          </button>
        </div>
        <div className="cropper-modal-stage relative w-full shrink-0 bg-neutral-900 flex items-center justify-center overflow-hidden">
          {fitMode === 'contain' ? (
            <div className="absolute inset-4 sm:inset-12 flex items-center justify-center pointer-events-none">
              <div className="relative shadow-2xl bg-white inline-block max-w-full max-h-full rounded-sm overflow-hidden">
                <svg 
                  width={aspectRatio * 1000} 
                  height={1000} 
                  viewBox={`0 0 ${aspectRatio * 1000} 1000`} 
                  className="max-w-full max-h-full opacity-0 pointer-events-none" 
                  style={{ display: 'block' }}
                />
                <div className="absolute inset-0">
                  <img
                    src={imageUrl}
                    alt="Padded Preview"
                    className="w-full h-full object-contain"
                    style={{ filter: imageFilter }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Cropper
              initialCroppedAreaPercentages={initialCropArea}
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
              style={{ mediaStyle: { filter: imageFilter } }}
            />
          )}
        </div>
        <div className="cropper-modal-controls p-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <div className="cropper-control-list space-y-3 mb-4">
            <div className="cropper-control-row flex items-center gap-3">
              <span className="cropper-control-label w-24 text-sm font-medium text-neutral-600">{lang.zoom}</span>
              <SnapRange
                defaultValueNumber={1}
                snapRadius={0.004}
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                aria-label={lang.zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-black disabled:opacity-50"
                disabled={fitMode === 'contain'}
              />
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-neutral-500">{zoom.toFixed(2)}x</span>
            </div>
            <div className="cropper-control-row flex items-center gap-3">
              <span className="cropper-control-label w-24 text-sm font-medium text-neutral-600">{lang.exposure}</span>
              <SnapRange
                defaultValueNumber={DEFAULT_EXPOSURE}
                value={exposure}
                min={-1}
                max={1}
                step={0.1}
                aria-label={lang.exposure}
                onInput={(e) => setExposure(Number(e.currentTarget.value))}
                className="w-full accent-black"
              />
              <span className="w-11 text-right text-xs tabular-nums text-neutral-500">
                {exposure > 0 ? '+' : ''}{exposure.toFixed(1)}
              </span>
            </div>
            <div className="cropper-control-row flex items-center gap-3">
              <span className="cropper-control-label w-24 text-sm font-medium text-neutral-600">{lang.vibrance}</span>
              <SnapRange
                defaultValueNumber={DEFAULT_VIBRANCE}
                value={vibrance}
                min={-50}
                max={50}
                step={1}
                aria-label={lang.vibrance}
                onInput={(e) => setVibrance(Number(e.currentTarget.value))}
                className="w-full accent-black"
              />
              <span className="w-11 text-right text-xs tabular-nums text-neutral-500">
                {vibrance > 0 ? '+' : ''}{vibrance}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitMode === 'contain'}
                  onChange={(e) => setFitMode(e.target.checked ? 'contain' : 'cover')}
                  className="w-4 h-4 cursor-pointer accent-black"
                />
                <span className="text-sm text-neutral-600 font-medium">{lang.fitToFrame}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setExposure(DEFAULT_EXPOSURE);
                  setVibrance(DEFAULT_VIBRANCE);
                }}
                disabled={exposure === DEFAULT_EXPOSURE && vibrance === DEFAULT_VIBRANCE}
                className="text-xs font-medium text-neutral-500 hover:text-black disabled:opacity-40 disabled:cursor-default"
              >
                {lang.resetAdjustments}
              </button>
            </div>
          </div>
          <div className="cropper-action-row flex flex-col sm:flex-row justify-between items-center w-full gap-3">
            <button onClick={onChangeImage} disabled={saving} className="w-full sm:w-auto px-5 py-2 rounded-lg font-medium text-black border border-black hover:bg-neutral-100 transition-colors">
              {lang.changeImage}
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onClose} disabled={saving} className="flex-1 sm:flex-none px-5 py-2 rounded-lg font-medium text-neutral-600 hover:bg-neutral-200 transition-colors text-center">
                {lang.cancel}
              </button>
              <button onClick={handleSave} disabled={saving || (!croppedAreaPixels && fitMode !== 'contain')} className="flex-1 sm:flex-none px-5 py-2 rounded-lg font-medium bg-black text-white hover:bg-neutral-800 transition-colors text-center disabled:opacity-50">
                {lang.applyCrop}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
