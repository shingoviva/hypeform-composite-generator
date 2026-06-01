import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { UiLanguage } from '../App';

// Helper to extract image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fitMode: 'cover' | 'contain' = 'cover',
  aspectRatio: number = 1
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  if (fitMode === 'contain') {
    // Generate a padded white background image
    let canvasWidth, canvasHeight;
    const imgAspect = image.width / image.height;
    
    if (imgAspect > aspectRatio) {
      canvasWidth = image.width;
      canvasHeight = image.width / aspectRatio;
    } else {
      canvasHeight = image.height;
      canvasWidth = image.height * aspectRatio;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    const dx = (canvasWidth - image.width) / 2;
    const dy = (canvasHeight - image.height) / 2;
    ctx.drawImage(image, dx, dy, image.width, image.height);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((file) => {
        if (file) {
          resolve(URL.createObjectURL(file));
        } else {
          reject(new Error('Canvas is empty'));
        }
      }, 'image/jpeg');
    });
  }

  // Cover mode (default cropping)
  // set canvas size to match the bounding box
  canvas.width = image.width;
  canvas.height = image.height;

  // draw image
  ctx.drawImage(image, 0, 0);

  // cropped area
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No 2d context');
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((file) => {
      if (file) {
        resolve(URL.createObjectURL(file));
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg');
  });
}

interface ImageCropperModalProps {
  isOpen: boolean;
  imageUrl: string;
  aspectRatio: number;
  initialFitMode?: 'cover' | 'contain';
  onClose: () => void;
  onCropComplete: (croppedUrl: string, fitMode: 'cover' | 'contain') => void;
  onChangeImage: () => void;
  uiLanguage: UiLanguage;
}

const t = {
  en: {
    cropImage: 'Crop Image',
    zoom: 'Zoom',
    fitToFrame: 'Fit entire image (Show borders)',
    changeImage: 'Change Image',
    cancel: 'Cancel',
    applyCrop: 'Apply Crop'
  },
  ja: {
    cropImage: '画像のトリミング',
    zoom: 'ズーム',
    fitToFrame: '全体を収める（余白あり）',
    changeImage: '画像を変更',
    cancel: 'キャンセル',
    applyCrop: '適用する'
  }
};

export default function ImageCropperModal({ isOpen, imageUrl, aspectRatio, initialFitMode = 'cover', onClose, onCropComplete, onChangeImage, uiLanguage }: ImageCropperModalProps) {
  const lang = t[uiLanguage];
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>(initialFitMode);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    // We need croppedAreaPixels if it's cover mode.
    // If it's contain mode, getCroppedImg ignores croppedAreaPixels.
    if (croppedAreaPixels || fitMode === 'contain') {
      try {
        // Fallback for croppedAreaPixels to make TypeScript happy if it happens to be null in contain mode
        const area = croppedAreaPixels || { x: 0, y: 0, width: 0, height: 0 };
        const croppedImage = await getCroppedImg(imageUrl, area, fitMode, aspectRatio);
        onCropComplete(croppedImage, fitMode);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95dvh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-lg">{lang.cropImage}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-black">
            ✕
          </button>
        </div>
        <div className="relative w-full flex-1 min-h-[40vh] sm:min-h-[500px] bg-neutral-900 flex items-center justify-center overflow-hidden">
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
                  <img src={imageUrl} alt="Padded Preview" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          ) : (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1 flex items-center gap-4">
              <span className="text-sm font-medium text-neutral-600">{lang.zoom}</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-black disabled:opacity-50"
                disabled={fitMode === 'contain'}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={fitMode === 'contain'}
                onChange={(e) => setFitMode(e.target.checked ? 'contain' : 'cover')}
                className="w-4 h-4 cursor-pointer accent-black"
              />
              <span className="text-sm text-neutral-600 font-medium">{lang.fitToFrame}</span>
            </label>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-center w-full gap-3">
            <button onClick={onChangeImage} className="w-full lg:w-auto px-5 py-2 rounded-lg font-medium text-black border border-black hover:bg-neutral-100 transition-colors">
              {lang.changeImage}
            </button>
            <div className="flex gap-3 w-full lg:w-auto">
              <button onClick={onClose} className="flex-1 lg:flex-none px-5 py-2 rounded-lg font-medium text-neutral-600 hover:bg-neutral-200 transition-colors text-center">
                {lang.cancel}
              </button>
              <button onClick={handleSave} className="flex-1 lg:flex-none px-5 py-2 rounded-lg font-medium bg-black text-white hover:bg-neutral-800 transition-colors text-center">
                {lang.applyCrop}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
