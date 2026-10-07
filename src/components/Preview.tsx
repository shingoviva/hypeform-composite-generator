import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from '../types';
import { getImageFilter } from '../imageAdjustments';
import ImageAdjustmentFilter from './ImageAdjustmentFilter';
import { getNameTypography, NAME_FONTS } from '../nameTypography';
import { getCompositeLayout } from '../compositeLayout';
import { applyCompositeTypography } from '../compositeTypography';
import LogoImage from './LogoImage';

interface PreviewProps {
  state: AppState;
  onImageClick: (imageId: string) => void;
}

export default function Preview({ state, onImageClick }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const A4_WIDTH = 1123;
  const A4_HEIGHT = 794;
  const WATERMARK_BOX_WIDTH = 160;
  const WATERMARK_BOX_HEIGHT = 32;
  const WATERMARK_MIN_HEIGHT = 32 * 40 / 140;

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // If container is hidden (e.g. mobile tab not active), skip update to prevent negative scaling
        if (clientWidth === 0 || clientHeight === 0) return;
        
        // Ensure scale values don't go negative
        const scaleX = Math.max(clientWidth / A4_WIDTH, 0.05);
        const scaleY = Math.max(clientHeight / A4_HEIGHT, 0.05);
        
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    // Use ResizeObserver to detect when the container becomes visible or resizes
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, []);

  const { profile, images } = state;
  const nameTypography = getNameTypography(profile);
  const detailLength = [profile.hair, profile.eyes, profile.showNationality ? profile.nationality : '', profile.showResidence ? profile.residence : '', ...(profile.showExperience ? [profile.experience, profile.experience2, profile.experience3, profile.experience4] : [])].join(' ').length;
  const layout = getCompositeLayout(state.compositeMargin, state.watermark.enabled, detailLength);
  const nameAtBottom = profile.nameAtBottom ?? true;
  const watermarkFont = NAME_FONTS.find(font => font.family === state.watermark.font) || NAME_FONTS[0];
  const layoutStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 1, width: layout.width, height: A4_HEIGHT - layout.margin * 2,
    left: (A4_WIDTH - layout.width) / 2, top: layout.margin,
  };
  useLayoutEffect(() => {
    let active = true;
    const fitName = () => {
      if (!active) return;
      const name = containerRef.current?.querySelector<HTMLElement>('[data-composite="name"]');
      const band = name?.parentElement;
      if (!name || !band || !band.clientHeight) return;
      const root = containerRef.current?.querySelector<HTMLElement>('#composite-canvas');
      if (root) applyCompositeTypography(root, state);
    };
    fitName();
    document.fonts.ready.then(fitName);
    document.fonts.addEventListener('loadingdone', fitName);
    const observer = new ResizeObserver(fitName);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fitName); };
  }, [state, scale]);
  const watermarkSize = state.watermark.size ?? 100;
  const watermarkScale = Math.min(Math.max(watermarkSize, 40), 140);
  const watermarkRatio = (watermarkScale - 40) / 100;
  const watermarkHeight = WATERMARK_MIN_HEIGHT + watermarkRatio * (WATERMARK_BOX_HEIGHT - WATERMARK_MIN_HEIGHT);
  const watermarkTextSize = Math.min(38, Math.max(16, state.watermark.textSize ?? 31));

  const MainImagePlaceholder = () => (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-sans text-sm">
      Main Photo
    </div>
  );
  
  const SubImagePlaceholder = ({ index }: { index: number }) => (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-sans text-sm">
      Sub {index}
    </div>
  );

  const formatMeasurement = (val: string, type: 'height' | 'bust' | 'shoes' | 'generic') => {
    if (val.toLowerCase().includes('cm') || val.toLowerCase().includes('"')) return val.toUpperCase();
    
    const num = parseFloat(val);
    if (isNaN(num)) return val.toUpperCase(); 
    
    if (type === 'height') {
      const totalInches = num / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${num} CM / ${feet}'${inches}"`;
    } else if (type === 'shoes') {
      const usSize = num - 16; 
      return `${num} CM / ${usSize} US`;
    } else {
      const inches = Math.round(num / 2.54);
      return `${num} CM / ${inches}"`;
    }
  };

  const contactParts = [];
  if (profile.showContact && profile.contact) contactParts.push(`CONTACT: ${profile.contact}`);
  if (profile.showEmail && profile.email) contactParts.push(`EMAIL: ${profile.email}`);
  if (profile.agency) contactParts.push(`REPRESENTED BY: ${profile.agency}`);

  const renderNameAndContact = () => (
    <>
      <h1 data-composite="name"
        className={`uppercase mb-2 shrink-0 ${profile.nameItalic ? 'italic' : ''}`}
        style={{ fontFamily: nameTypography.font.family, fontWeight: nameTypography.font.weight, fontSize: nameTypography.size, letterSpacing: `${nameTypography.spacing}em`, lineHeight: 1.15, overflowWrap: 'anywhere', padding: '2px 6px', fontKerning: 'normal' }}
      >
        {profile.name || 'NAME'}
      </h1>
      {contactParts.length > 0 && (
        <p data-composite="contact" className="font-sans text-[0.6rem] font-bold tracking-normal uppercase flex flex-wrap justify-center gap-x-1.5 gap-y-1 whitespace-normal break-words shrink-0" style={{ lineHeight: 1.5, paddingBottom: 4 }}>
          {contactParts.map(part => <span key={part}>{part}</span>)}
        </p>
      )}
    </>
  );

  const renderAttributesInfo = () => {
    const experienceParts = [profile.experience, profile.experience2, profile.experience3, profile.experience4].filter(Boolean);
    const experienceText = experienceParts.join(' | ');
    
    return (
    <>
      <div data-composite="measurements" className="font-sans text-[0.52rem] font-bold uppercase flex flex-wrap justify-center gap-x-2 gap-y-0.5 w-full">
        <span className="flex gap-1"><span className="text-gray-400">HEIGHT</span><span>{formatMeasurement(profile.height, 'height')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">BUST</span><span>{formatMeasurement(profile.bust, 'generic')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">WAIST</span><span>{formatMeasurement(profile.waist, 'generic')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">HIPS</span><span>{formatMeasurement(profile.hips, 'generic')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">SHOES</span><span>{formatMeasurement(profile.shoes, 'shoes')}</span></span>
      </div>
      <div data-composite="details" className="font-sans text-[0.52rem] font-bold tracking-wider uppercase flex flex-wrap justify-center gap-x-2 gap-y-0.5 w-full whitespace-normal">
        <span className="flex gap-1 shrink-0"><span className="text-gray-400">HAIR</span><span>{profile.hair}</span></span>
        <span className="flex gap-1 shrink-0"><span className="text-gray-400">EYES</span><span>{profile.eyes}</span></span>
        {profile.showNationality && profile.nationality && <span className="flex gap-1 shrink-0"><span className="text-gray-400">NATIONALITY</span><span>{profile.nationality}</span></span>}
        {profile.showResidence && profile.residence && <span className="flex gap-1 shrink-0"><span className="text-gray-400">BASE</span><span>{profile.residence}</span></span>}
        {profile.showExperience && experienceParts.length > 0 && <span className="flex gap-1 shrink"><span className="text-gray-400 shrink-0">EXP</span><span className="break-words text-left">{experienceText}</span></span>}
      </div>
    </>
  );
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full h-full overflow-hidden">
      <style>{'#composite-canvas img { object-fit: contain; background: white; }'}</style>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <div 
          id="composite-canvas"
          className="bg-white shadow-2xl border border-gray-100"
          style={{ 
            width: A4_WIDTH, 
            height: A4_HEIGHT,
            position: 'relative'
          }}
        >
          {Object.values(images).map((image) => (
            <ImageAdjustmentFilter
              key={`preview-filter-${image.id}`}
              id={`preview-image-adjustment-${image.id}`}
              exposure={image.exposure}
              vibrance={image.vibrance}
            />
          ))}
          {nameAtBottom ? (
            <div className="flex flex-col" style={layoutStyle}>
              <div className="flex w-full min-h-0 shrink-0" style={{ gap: layout.columnGap, height: layout.photoHeight }}>
                <div className="min-w-0 flex flex-col shrink-0" style={{ width: layout.mainWidth }}>
                  <div 
                    className="flex-1 min-h-0 w-full bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                    data-composite="main" onClick={() => onImageClick('main')}
                  >
                    {images.main.croppedUrl ? (
                      images.main.fitMode === 'contain' ? (
                        <img src={images.main.originalUrl || images.main.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-main', images.main) }} alt="Main composite" />
                      ) : (
                        <img src={images.main.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-main', images.main) }} alt="Main composite" />
                      )
                    ) : (
                      <MainImagePlaceholder />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex flex-col shrink-0" style={{ width: layout.galleryWidth }}>
                  <div data-composite="gallery" className="grid grid-cols-2 grid-rows-2 w-full h-full" style={{ gap: layout.photoGap }}>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                      onClick={() => onImageClick('sub1')}
                    >
                      {images.sub1.croppedUrl ? (
                        images.sub1.fitMode === 'contain' ? (
                          <img src={images.sub1.originalUrl || images.sub1.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub1', images.sub1) }} alt="Sub 1" />
                        ) : (
                          <img src={images.sub1.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub1', images.sub1) }} alt="Sub 1" />
                        )
                      ) : <SubImagePlaceholder index={1} />}
                    </div>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                      onClick={() => onImageClick('sub2')}
                    >
                      {images.sub2.croppedUrl ? (
                        images.sub2.fitMode === 'contain' ? (
                          <img src={images.sub2.originalUrl || images.sub2.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub2', images.sub2) }} alt="Sub 2" />
                        ) : (
                          <img src={images.sub2.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub2', images.sub2) }} alt="Sub 2" />
                        )
                      ) : <SubImagePlaceholder index={2} />}
                    </div>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                      onClick={() => onImageClick('sub3')}
                    >
                      {images.sub3.croppedUrl ? (
                        images.sub3.fitMode === 'contain' ? (
                          <img src={images.sub3.originalUrl || images.sub3.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub3', images.sub3) }} alt="Sub 3" />
                        ) : (
                          <img src={images.sub3.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub3', images.sub3) }} alt="Sub 3" />
                        )
                      ) : <SubImagePlaceholder index={3} />}
                    </div>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                      onClick={() => onImageClick('sub4')}
                    >
                      {images.sub4.croppedUrl ? (
                        images.sub4.fitMode === 'contain' ? (
                          <img src={images.sub4.originalUrl || images.sub4.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub4', images.sub4) }} alt="Sub 4" />
                        ) : (
                          <img src={images.sub4.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub4', images.sub4) }} alt="Sub 4" />
                        )
                      ) : <SubImagePlaceholder index={4} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 items-start" style={{ height: layout.footerHeight, gap: layout.columnGap, marginTop: 12 }}>
                <div className="min-w-0 text-center flex flex-col justify-center overflow-hidden shrink-0" style={{ height: layout.footerHeight, width: layout.mainWidth }}>
                  {renderNameAndContact()}
                </div>
                <div data-composite="attributes" className="min-w-0 text-center flex flex-col gap-1 pt-1 pb-1 overflow-hidden shrink-0 justify-start" style={{ width: layout.galleryWidth, height: layout.footerHeight }}>
                  {renderAttributesInfo()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex" style={{ ...layoutStyle, gap: layout.columnGap }}>
            
            {/* Left Column */}
            <div className="min-w-0 h-full flex flex-col shrink-0" style={{ width: layout.mainWidth }}>
              <div className="mb-3 text-center shrink-0 flex flex-col justify-center overflow-hidden" style={{ height: layout.footerHeight }}>
                {renderNameAndContact()}
              </div>
              
              <div 
                className="flex-1 min-h-0 w-full bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                data-composite="main" onClick={() => onImageClick('main')}
              >
                {images.main.croppedUrl ? (
                  images.main.fitMode === 'contain' ? (
                    <img src={images.main.originalUrl || images.main.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-main', images.main) }} alt="Main composite" />
                  ) : (
                    <img src={images.main.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-main', images.main) }} alt="Main composite" />
                  )
                ) : (
                  <MainImagePlaceholder />
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="min-w-0 h-full flex flex-col pb-1 shrink-0" style={{ width: layout.galleryWidth }}>
              <div data-composite="gallery" className="grid grid-cols-2 grid-rows-2 shrink-0 min-h-0" style={{ height: layout.photoHeight, gap: layout.photoGap }}>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                  onClick={() => onImageClick('sub1')}
                >
                  {images.sub1.croppedUrl ? (
                    images.sub1.fitMode === 'contain' ? (
                      <img src={images.sub1.originalUrl || images.sub1.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub1', images.sub1) }} alt="Sub 1" />
                    ) : (
                      <img src={images.sub1.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub1', images.sub1) }} alt="Sub 1" />
                    )
                  ) : <SubImagePlaceholder index={1} />}
                </div>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                  onClick={() => onImageClick('sub2')}
                >
                  {images.sub2.croppedUrl ? (
                    images.sub2.fitMode === 'contain' ? (
                      <img src={images.sub2.originalUrl || images.sub2.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub2', images.sub2) }} alt="Sub 2" />
                    ) : (
                      <img src={images.sub2.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub2', images.sub2) }} alt="Sub 2" />
                    )
                  ) : <SubImagePlaceholder index={2} />}
                </div>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                  onClick={() => onImageClick('sub3')}
                >
                  {images.sub3.croppedUrl ? (
                    images.sub3.fitMode === 'contain' ? (
                      <img src={images.sub3.originalUrl || images.sub3.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub3', images.sub3) }} alt="Sub 3" />
                    ) : (
                      <img src={images.sub3.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub3', images.sub3) }} alt="Sub 3" />
                    )
                  ) : <SubImagePlaceholder index={3} />}
                </div>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer"
                  onClick={() => onImageClick('sub4')}
                >
                  {images.sub4.croppedUrl ? (
                    images.sub4.fitMode === 'contain' ? (
                      <img src={images.sub4.originalUrl || images.sub4.croppedUrl!} className="w-full h-full object-contain bg-white" style={{ filter: getImageFilter('preview-image-adjustment-sub4', images.sub4) }} alt="Sub 4" />
                    ) : (
                      <img src={images.sub4.croppedUrl} className="w-full h-full object-cover" style={{ filter: getImageFilter('preview-image-adjustment-sub4', images.sub4) }} alt="Sub 4" />
                    )
                  ) : <SubImagePlaceholder index={4} />}
                </div>
              </div>
              
              <div data-composite="attributes" className="mt-3 text-center flex flex-col justify-start gap-1 w-full pt-1 pb-1 shrink-0 overflow-hidden" style={{ height: layout.footerHeight }}>
                {renderAttributesInfo()}
              </div>
            </div>

          </div>
          )}

          {state.watermark.enabled && (
            <div 
              data-composite="watermark" className={`absolute pointer-events-none z-0 flex items-end justify-end ${state.watermark.type === 'image' ? 'overflow-hidden' : ''}`}
              style={{
                opacity: state.watermark.opacity / 100,
                right: 12,
                bottom: 4,
                maxWidth: 240,
                maxHeight: state.watermark.type === 'image' ? WATERMARK_BOX_HEIGHT : 44,
                overflow: state.watermark.type === 'image' ? 'hidden' : 'visible',
                width: state.watermark.type === 'image' ? WATERMARK_BOX_WIDTH : undefined,
                height: state.watermark.type === 'image' ? WATERMARK_BOX_HEIGHT : 44,
              }}
            >
              {state.watermark.type === 'text' && state.watermark.text && (
                <div 
                  style={{ 
                    fontFamily: watermarkFont.family,
                    fontWeight: watermarkFont.weight,
                    letterSpacing: `${state.watermark.textSpacing ?? watermarkFont.spacing}em`,
                    fontSize: `${watermarkTextSize}px`,
                    lineHeight: 1.2,
                    padding: '2px 4px',
                    overflowWrap: 'anywhere',
                  }}
                  className={`text-black text-right ${state.watermark.textItalic ? 'italic' : ''}`}
                >
                  {state.watermark.text}
                </div>
              )}
              {state.watermark.type === 'image' && state.watermark.imageUrl && (
                <LogoImage
                  src={state.watermark.imageUrl} 
                  onLoad={() => {
                    const root = containerRef.current?.querySelector<HTMLElement>('#composite-canvas');
                    if (root) applyCompositeTypography(root, state);
                  }}
                  alt="Agency Logo" 
                  className="block w-auto object-contain object-right-bottom"
                  style={{
                    height: watermarkHeight,
                    maxWidth: WATERMARK_BOX_WIDTH,
                    maxHeight: WATERMARK_BOX_HEIGHT,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
