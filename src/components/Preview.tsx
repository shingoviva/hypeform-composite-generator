import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '../types';

interface PreviewProps {
  state: AppState;
  onImageClick: (imageId: string) => void;
}

export default function Preview({ state, onImageClick }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const A4_WIDTH = 1123;
  const A4_HEIGHT = 794;
  const WATERMARK_BOX_WIDTH = 190;
  const WATERMARK_BOX_HEIGHT = 56;
  const WATERMARK_MIN_HEIGHT = 24;
  const WATERMARK_MIN_TEXT_SIZE = 20;
  const WATERMARK_MAX_TEXT_SIZE = 38;

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
  const watermarkSize = state.watermark.size ?? 100;
  const watermarkScale = Math.min(Math.max(watermarkSize, 40), 140);
  const watermarkRatio = (watermarkScale - 40) / 100;
  const watermarkHeight = WATERMARK_MIN_HEIGHT + watermarkRatio * (WATERMARK_BOX_HEIGHT - WATERMARK_MIN_HEIGHT);
  const watermarkTextSize = WATERMARK_MIN_TEXT_SIZE + watermarkRatio * (WATERMARK_MAX_TEXT_SIZE - WATERMARK_MIN_TEXT_SIZE);

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
      <h1 
        className={`font-sans ${((profile.name || 'NAME').trim().includes(' ') || (profile.name || 'NAME').length > 10) ? 'text-[3.2rem] leading-[0.95]' : 'text-[3.8rem] leading-[0.9]'} font-black tracking-tighter uppercase mb-2 ${profile.nameItalic ? 'italic' : ''}`}
        style={{ fontFamily: profile.nameFont || '"Oswald", sans-serif' }}
      >
        {profile.name || 'NAME'}
      </h1>
      {contactParts.length > 0 && (
        <p className="font-sans text-[0.6rem] font-bold tracking-normal uppercase flex justify-center gap-1.5 whitespace-nowrap">
          {contactParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <span>{part}</span>
              {idx < contactParts.length - 1 && <span className="text-gray-400">|</span>}
            </React.Fragment>
          ))}
        </p>
      )}
    </>
  );

  const renderAttributesInfo = () => {
    const experienceParts = [profile.experience, profile.experience2, profile.experience3, profile.experience4].filter(Boolean);
    const experienceText = experienceParts.join(' | ');
    
    return (
    <>
      <div className="font-sans text-[0.52rem] font-bold tracking-wider uppercase flex justify-center gap-x-2 w-full whitespace-nowrap">
        <span className="flex gap-1"><span className="text-gray-400">HEIGHT</span><span>{formatMeasurement(profile.height, 'height')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">BUST</span><span>{formatMeasurement(profile.bust, 'generic')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">WAIST</span><span>{formatMeasurement(profile.waist, 'generic')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">HIPS</span><span>{formatMeasurement(profile.hips, 'generic')}</span></span>
        <span className="flex gap-1"><span className="text-gray-400">SHOES</span><span>{formatMeasurement(profile.shoes, 'shoes')}</span></span>
      </div>
      <div className="font-sans text-[0.52rem] font-bold tracking-wider uppercase flex flex-wrap justify-center gap-x-2 gap-y-0.5 w-full whitespace-normal">
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
          {profile.nameAtBottom ? (
            <div className="flex flex-col w-full h-full p-12">
              <div className="flex w-full gap-12 flex-1 min-h-0">
                <div className="w-[49%] flex flex-col">
                  <div 
                    className="flex-1 w-full bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onImageClick('main')}
                  >
                    {images.main.croppedUrl ? (
                      images.main.fitMode === 'contain' ? (
                        <img src={images.main.originalUrl || images.main.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Main composite" />
                      ) : (
                        <img src={images.main.croppedUrl} className="w-full h-full object-cover" alt="Main composite" />
                      )
                    ) : (
                      <MainImagePlaceholder />
                    )}
                  </div>
                </div>

                <div className="w-[51%] flex flex-col">
                  <div className="grid grid-cols-2 grid-rows-2 gap-[14px] w-full h-full">
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onImageClick('sub1')}
                    >
                      {images.sub1.croppedUrl ? (
                        images.sub1.fitMode === 'contain' ? (
                          <img src={images.sub1.originalUrl || images.sub1.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 1" />
                        ) : (
                          <img src={images.sub1.croppedUrl} className="w-full h-full object-cover" alt="Sub 1" />
                        )
                      ) : <SubImagePlaceholder index={1} />}
                    </div>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onImageClick('sub2')}
                    >
                      {images.sub2.croppedUrl ? (
                        images.sub2.fitMode === 'contain' ? (
                          <img src={images.sub2.originalUrl || images.sub2.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 2" />
                        ) : (
                          <img src={images.sub2.croppedUrl} className="w-full h-full object-cover" alt="Sub 2" />
                        )
                      ) : <SubImagePlaceholder index={2} />}
                    </div>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onImageClick('sub3')}
                    >
                      {images.sub3.croppedUrl ? (
                        images.sub3.fitMode === 'contain' ? (
                          <img src={images.sub3.originalUrl || images.sub3.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 3" />
                        ) : (
                          <img src={images.sub3.croppedUrl} className="w-full h-full object-cover" alt="Sub 3" />
                        )
                      ) : <SubImagePlaceholder index={3} />}
                    </div>
                    <div 
                      className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onImageClick('sub4')}
                    >
                      {images.sub4.croppedUrl ? (
                        images.sub4.fitMode === 'contain' ? (
                          <img src={images.sub4.originalUrl || images.sub4.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 4" />
                        ) : (
                          <img src={images.sub4.croppedUrl} className="w-full h-full object-cover" alt="Sub 4" />
                        )
                      ) : <SubImagePlaceholder index={4} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-12 mt-4 shrink-0 items-end">
                <div className="w-[49%] text-center">
                  {renderNameAndContact()}
                </div>
                <div className="w-[51%] text-center flex flex-col justify-center gap-1.5 border-t border-black pt-3 pb-1 overflow-hidden">
                  {renderAttributesInfo()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full h-full p-12 gap-12">
            
            {/* Left Column */}
            <div className="w-[49%] h-full flex flex-col">
              <div className="mb-6 text-center shrink-0">
                {renderNameAndContact()}
              </div>
              
              <div 
                className="flex-1 w-full bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick('main')}
              >
                {images.main.croppedUrl ? (
                  images.main.fitMode === 'contain' ? (
                    <img src={images.main.originalUrl || images.main.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Main composite" />
                  ) : (
                    <img src={images.main.croppedUrl} className="w-full h-full object-cover" alt="Main composite" />
                  )
                ) : (
                  <MainImagePlaceholder />
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="w-[51%] h-full flex flex-col pb-1">
              <div className="grid grid-cols-2 grid-rows-2 gap-[14px] flex-1 min-h-0">
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick('sub1')}
                >
                  {images.sub1.croppedUrl ? (
                    images.sub1.fitMode === 'contain' ? (
                      <img src={images.sub1.originalUrl || images.sub1.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 1" />
                    ) : (
                      <img src={images.sub1.croppedUrl} className="w-full h-full object-cover" alt="Sub 1" />
                    )
                  ) : <SubImagePlaceholder index={1} />}
                </div>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick('sub2')}
                >
                  {images.sub2.croppedUrl ? (
                    images.sub2.fitMode === 'contain' ? (
                      <img src={images.sub2.originalUrl || images.sub2.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 2" />
                    ) : (
                      <img src={images.sub2.croppedUrl} className="w-full h-full object-cover" alt="Sub 2" />
                    )
                  ) : <SubImagePlaceholder index={2} />}
                </div>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick('sub3')}
                >
                  {images.sub3.croppedUrl ? (
                    images.sub3.fitMode === 'contain' ? (
                      <img src={images.sub3.originalUrl || images.sub3.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 3" />
                    ) : (
                      <img src={images.sub3.croppedUrl} className="w-full h-full object-cover" alt="Sub 3" />
                    )
                  ) : <SubImagePlaceholder index={3} />}
                </div>
                <div 
                  className="bg-gray-200 relative overflow-hidden shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick('sub4')}
                >
                  {images.sub4.croppedUrl ? (
                    images.sub4.fitMode === 'contain' ? (
                      <img src={images.sub4.originalUrl || images.sub4.croppedUrl!} className="w-full h-full object-contain bg-white" alt="Sub 4" />
                    ) : (
                      <img src={images.sub4.croppedUrl} className="w-full h-full object-cover" alt="Sub 4" />
                    )
                  ) : <SubImagePlaceholder index={4} />}
                </div>
              </div>
              
              <div className="mt-4 text-center flex flex-col justify-center gap-1.5 w-full border-t border-black pt-3 pb-1 shrink-0 overflow-hidden">
                {renderAttributesInfo()}
              </div>
            </div>

          </div>
          )}

          {state.watermark.enabled && (
            <div 
              className={`absolute bottom-6 right-6 pointer-events-none z-50 flex items-end justify-end ${state.watermark.type === 'image' ? 'overflow-hidden' : ''}`}
              style={{
                opacity: state.watermark.opacity / 100,
                width: state.watermark.type === 'image' ? WATERMARK_BOX_WIDTH : undefined,
                height: state.watermark.type === 'image' ? WATERMARK_BOX_HEIGHT : undefined,
              }}
            >
              {state.watermark.type === 'text' && state.watermark.text && (
                <div 
                  style={{ 
                    fontFamily: state.watermark.font,
                    fontSize: `${watermarkTextSize}px`,
                    lineHeight: 1,
                  }}
                  className="font-bold tracking-widest text-black text-right"
                >
                  {state.watermark.text}
                </div>
              )}
              {state.watermark.type === 'image' && state.watermark.imageUrl && (
                <img 
                  src={state.watermark.imageUrl} 
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
