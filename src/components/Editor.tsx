import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { AppState } from '../types';
import Form from './Form';
import Preview from './Preview';
import jsPDF from 'jspdf';
import { renderComposite } from '../exportComposite';
import { Share2, Download, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import PreviewOptions from './PreviewOptions';
import ImageCropperModal from './ImageCropperModal';
import { UiLanguage } from '../App';

interface EditorProps {
  key?: React.Key;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  uiLanguage: UiLanguage;
  setUiLanguage: React.Dispatch<React.SetStateAction<UiLanguage>>;
  highResolution: boolean;
  setHighResolution: React.Dispatch<React.SetStateAction<boolean>>;
  saveStatus: 'saving' | 'saved' | 'unavailable';
  onReset: () => void;
}

const t = {
  en: {
    editProfile: 'Edit Profile',
    previewCanvas: 'Preview Canvas',
    exportPdf: 'Export PDF (A4)',
    exportJpeg: 'Export JPEG',
    exporting: 'Exporting...',
    previewing: 'Previewing',
    saved: 'Saved',
    highResolution: 'High Resolution (Slower)'
  },
  ja: {
    editProfile: 'プロフィール編集',
    previewCanvas: 'プレビュー',
    exportPdf: 'PDF(A4)を出力',
    exportJpeg: 'JPEGを出力',
    exporting: '出力中...',
    previewing: 'プレビュー',
    saved: '保存済み',
    highResolution: '高解像度出力 (処理が長くなります)'
  }
};

export default function Editor({ state, setState, uiLanguage, setUiLanguage, highResolution, setHighResolution, saveStatus, onReset }: EditorProps) {
  const lang = t[uiLanguage];
  const [isExporting, setIsExporting] = useState(false);
  const statusText = uiLanguage === 'ja'
    ? { saving: '端末に保存中…', saved: '端末に保存済み', unavailable: '端末への保存不可' }[saveStatus]
    : { saving: 'Saving locally...', saved: 'Saved on this device', unavailable: 'Local save unavailable' }[saveStatus];
  const [exportResult, setExportResult] = useState<{ file: File; url: string; format: 'pdf' | 'jpeg' } | null>(null);
  const [showPreviewOptions, setShowPreviewOptions] = useState(false);
  const [instagramResult, setInstagramResult] = useState<{ file: File; url: string; side: 'left' | 'right' }[] | null>(null);
  useEffect(() => () => {
    instagramResult?.forEach(result => URL.revokeObjectURL(result.url));
  }, [instagramResult]);
  const [shareError, setShareError] = useState('');
  useEffect(() => () => {
    if (exportResult) URL.revokeObjectURL(exportResult.url);
  }, [exportResult]);
  const shareExport = async () => {
    if (!exportResult) return;
    try {
      setShareError('');
      await navigator.share({ files: [exportResult.file] });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setShareError(uiLanguage === 'ja' ? '共有できませんでした。ダウンロード、または画像の長押しで保存してください。' : 'Sharing failed. Download the file, or touch and hold the image to save it.');
      }
    }
  };
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownedUrls = useRef(new Set<string>());
  const releaseTimer = useRef<number | undefined>(undefined);
  const imageLoadId = useRef(0);
  useEffect(() => {
    const active = new Set([tempImageUrl, state.watermark.imageUrl,
      ...Object.values(state.images).flatMap(image => [image.originalUrl, image.croppedUrl])]
      .filter((url): url is string => !!url?.startsWith('blob:')));
    for (const url of ownedUrls.current) if (!active.has(url)) URL.revokeObjectURL(url);
    ownedUrls.current = active;
  }, [state, tempImageUrl]);
  useEffect(() => {
    window.clearTimeout(releaseTimer.current);
    return () => {
      releaseTimer.current = window.setTimeout(() => {
        for (const url of ownedUrls.current) URL.revokeObjectURL(url);
      }, 0);
    };
  }, []);

  const handleImageClick = (imageId: string) => {
    setEditingImageId(imageId);
    const existingImageUrl = state.images[imageId as keyof typeof state.images]?.originalUrl;
    if (existingImageUrl) {
      setTempImageUrl(existingImageUrl);
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingImageId) {
      const url = URL.createObjectURL(file);
      const request = ++imageLoadId.current;
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (request !== imageLoadId.current) { URL.revokeObjectURL(url); return; }
        setTempImageUrl(url);
      } catch {
        URL.revokeObjectURL(url);
        alert(uiLanguage === 'ja' ? 'この写真を読み込めません。JPEGまたはPNG形式で選び直してください。' : 'This photo could not be opened. Please choose a JPEG or PNG file.');
      }
    }
  };

  const handleCropComplete = (
    croppedUrl: string,
    fitMode: 'cover' | 'contain',
    exposure: number,
    vibrance: number,
    crop: { x: number; y: number },
    zoom: number,
    cropArea?: { x: number; y: number; width: number; height: number }
  ) => {
    if (editingImageId) {
      setState(prev => ({
        ...prev,
        images: {
          ...prev.images,
          [editingImageId]: {
            ...prev.images[editingImageId as keyof typeof prev.images],
            originalUrl: tempImageUrl,
            croppedUrl: croppedUrl,
            fitMode: fitMode,
            exposure,
            vibrance,
            crop,
            zoom,
            cropArea
          }
        }
      }));
    }
    setEditingImageId(null);
    setTempImageUrl(null);
  };

  const performExport = async (format: 'pdf' | 'jpeg') => {
    setIsExporting(true);
    
      try {
        const canvasElement = document.getElementById('composite-canvas');
        if (!canvasElement) {
          throw new Error('Export canvas not found');
        }

        const canvas = await renderComposite(canvasElement, state, highResolution, format);
        const imgData = canvas.toDataURL('image/jpeg', highResolution ? 1 : .95);
        canvas.width = canvas.height = 0;
        let blob: Blob;

        if (format === 'pdf') {
          // A4 landscape = 297mm x 210mm
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });
          
          pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
          blob = pdf.output('blob');
        } else {
          blob = await (await fetch(imgData)).blob();
        }
        const file = new File([blob], `${state.profile.name || 'composite'}_zedcard.${format === 'pdf' ? 'pdf' : 'jpg'}`, { type: blob.type });
        const url = URL.createObjectURL(file);
        if (window.matchMedia('(max-width: 1023px)').matches || navigator.maxTouchPoints > 0) {
          setShareError('');
          setExportResult({ file, url, format });
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } catch (error: any) {
        console.error('Export failed:', error);
        alert(`Export failed: ${error?.message || String(error)}`);
      } finally {
        setIsExporting(false);
      }
  };

  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const performInstagramExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const results: NonNullable<typeof instagramResult> = [];
    try {
      const element = document.getElementById('composite-canvas');
      if (!element) throw new Error('Preview unavailable');
      for (const side of ['left', 'right'] as const) {
        const canvas = await renderComposite(element, state, false, 'jpeg', side);
        try {
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image export failed')), 'image/jpeg', .97));
          const file = new File([blob], `${state.profile.name || 'composite'}_instagram_${side}.jpg`, { type: 'image/jpeg' });
          results.push({ file, url: URL.createObjectURL(file), side });
        } finally { canvas.width = canvas.height = 0; }
      }
      setShareError('');
      setInstagramResult(results);
      setShowPreviewOptions(false);
    } catch (error) {
      results.forEach(result => URL.revokeObjectURL(result.url));
      alert(`${uiLanguage === 'ja' ? '出力できませんでした' : 'Export failed'}: ${(error as Error).message}`);
    } finally { setIsExporting(false); }
  };
  const shareInstagram = async (file: File) => {
    try { setShareError(''); await navigator.share({ files: [file] }); }
    catch (error) { if ((error as Error).name !== 'AbortError') setShareError(uiLanguage === 'ja' ? '共有できませんでした。画像の長押し、またはダウンロードで保存してください。' : 'Sharing failed. Touch and hold the image, or use Download.'); }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full absolute inset-0 overflow-hidden bg-white">
      {/* Mobile Tabs */}
      <div className="lg:hidden flex border-b border-[#E5E5E5] shrink-0 bg-white z-20">
        <button 
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest ${mobileTab === 'edit' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
          onClick={() => setMobileTab('edit')}
        >
          {lang.editProfile}
        </button>
        <button 
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest ${mobileTab === 'preview' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
          onClick={() => setMobileTab('preview')}
        >
          {lang.previewCanvas}
        </button>
      </div>

      {/* Left Sidebar */}
      <aside className={`${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 flex-1 min-h-0 lg:flex-none lg:h-full bg-white lg:border-r lg:border-[#E5E5E5] flex-col z-10 relative`}>
        <div className="p-6 border-b border-[#E5E5E5] shrink-0 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase">Composite Studio</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Professional Series v1.0</p>
          </div>
          <select 
            value={uiLanguage}
            onChange={(e) => setUiLanguage(e.target.value as UiLanguage)}
            className="lg:hidden text-[10px] uppercase font-bold tracking-widest bg-transparent border border-gray-200 px-2 py-1 rounded cursor-pointer outline-none hover:border-gray-400 transition-colors shrink-0 ml-2"
            title="Change UI Language"
          >
            <option value="en">EN</option>
            <option value="ja">JP</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-2 px-6 py-2 border-b border-[#E5E5E5] shrink-0">
          <span role="status" className={`text-[10px] ${saveStatus === 'unavailable' ? 'text-amber-700' : 'text-gray-500'}`} title={uiLanguage === 'ja' ? 'ブラウザのデータ削除や端末の空き容量によって保存データが消える場合があります。' : 'Browser data removal or low device storage may remove the saved draft.'}>{statusText}</span>
          <button onClick={onReset} className="flex items-center gap-1 text-xs text-gray-500 hover:text-black min-h-9 shrink-0" title={uiLanguage === 'ja' ? 'すべての設定をリセット' : 'Reset all settings'}><RotateCcw size={14} />{uiLanguage === 'ja' ? 'リセット' : 'Reset'}</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto w-full">
          <Form state={state} setState={setState} onImageClick={handleImageClick} uiLanguage={uiLanguage} />
        </div>
        {/* Desktop Export Buttons */}
        <div className="p-6 bg-gray-50 lg:flex flex-col gap-3 shrink-0 hidden relative z-20 border-t border-[#E5E5E5]">
          <label className="flex items-center gap-2 cursor-pointer mb-1 justify-center">
            <input 
              type="checkbox" 
              checked={highResolution}
              onChange={(e) => setHighResolution(e.target.checked)}
              className="w-3 h-3 cursor-pointer accent-black"
            />
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-600">{lang.highResolution}</span>
          </label>
          <button 
            onClick={() => performExport('pdf')}
            disabled={isExporting}
            className="w-full bg-black text-white py-3 text-xs uppercase font-bold tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? lang.exporting : lang.exportPdf}
          </button>
          <button 
            onClick={() => performExport('jpeg')}
            disabled={isExporting}
            className="w-full border border-black text-black py-3 text-xs uppercase font-bold tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? lang.exporting : lang.exportJpeg}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 flex-col relative overflow-hidden bg-[#F8F8F8] w-full`}>
        <header className="h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center space-y-1 overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-widest truncate">{lang.previewing}: {state.profile.name || 'Composite'}_zedcard.pdf</span>
          </div>
          <div className="flex space-x-4 shrink-0 pl-2">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowPreviewOptions(value => !value)} aria-expanded={showPreviewOptions} aria-controls="preview-options" aria-label={uiLanguage === 'ja' ? 'レイアウト調整' : 'Layout adjustments'} title={uiLanguage === 'ja' ? 'レイアウト調整' : 'Layout adjustments'} className={`p-2 rounded ${showPreviewOptions ? 'bg-gray-100 text-black' : 'text-gray-500 hover:text-black'}`}><SlidersHorizontal size={18} /></button>
              <select 
                value={uiLanguage}
                onChange={(e) => setUiLanguage(e.target.value as UiLanguage)}
                className="text-[10px] uppercase font-bold tracking-widest bg-transparent border border-gray-200 px-2 py-1 rounded cursor-pointer outline-none hover:border-gray-400 transition-colors"
                title="Change UI Language"
              >
                <option value="en">EN</option>
                <option value="ja">JP</option>
              </select>
              <div className="flex items-center text-[10px] uppercase font-bold">
                <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : 'bg-amber-500'} mr-2`}></span><span className="hidden sm:inline">{statusText}</span>
              </div>
            </div>
          </div>
        </header>
        {showPreviewOptions && <PreviewOptions state={state} setState={setState} language={uiLanguage} onClose={() => setShowPreviewOptions(false)} onInstagram={performInstagramExport} exporting={isExporting} />}

        <div className="flex-1 min-h-0 flex items-center justify-center p-4 lg:p-12 overflow-hidden relative">
          <Preview state={state} onImageClick={handleImageClick} />
        </div>
        
        <footer className="h-8 bg-black text-white hidden md:flex items-center px-6 text-[9px] uppercase tracking-widest shrink-0 relative z-10">
           <span>Composite Studio Professional</span>
           <span className="mx-4 text-gray-600">|</span>
           <span>A4 Standard Rendering Engine</span>
           <span className="ml-auto">Resolution: 300 DPI</span>
        </footer>
      </main>

      {/* Mobile Export Buttons */}
      <div 
        className="lg:hidden flex flex-col gap-3 p-4 bg-gray-50 border-t border-[#E5E5E5] shrink-0 z-50 w-full"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <label className="flex items-center gap-2 cursor-pointer justify-center mb-1">
          <input 
            type="checkbox" 
            checked={highResolution}
            onChange={(e) => setHighResolution(e.target.checked)}
            className="w-3 h-3 cursor-pointer accent-black shrink-0"
          />
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-600">{lang.highResolution}</span>
        </label>
        <div className="flex gap-3 w-full">
          <button 
            onClick={() => performExport('pdf')}
            disabled={isExporting}
            className="flex-1 bg-black text-white py-3 px-2 text-[10px] uppercase font-bold tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer text-center"
          >
            {isExporting ? lang.exporting : lang.exportPdf}
          </button>
          <button 
            onClick={() => performExport('jpeg')}
            disabled={isExporting}
            className="flex-1 border border-black text-black bg-white py-3 px-2 text-[10px] uppercase font-bold tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 cursor-pointer text-center"
          >
            {isExporting ? lang.exporting : lang.exportJpeg}
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {exportResult && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" role="presentation">
          <section className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="export-title">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 id="export-title" className="font-bold">{uiLanguage === 'ja' ? '書き出し完了' : 'Export ready'}</h2>
              <button onClick={() => setExportResult(null)} aria-label={uiLanguage === 'ja' ? '閉じる' : 'Close'} className="p-2"><X size={20} /></button>
            </div>
            {exportResult.format === 'jpeg' && <img src={exportResult.url} alt="Exported composite" className="w-full mb-4" />}
            <p className="text-sm mb-4 break-words">{uiLanguage === 'ja'
              ? (exportResult.format === 'jpeg' ? '共有メニューの「画像を保存」で写真アプリに保存できます。画像の長押しでも保存できます。' : '共有メニューの「ファイルに保存」で保存先を選べます。')
              : (exportResult.format === 'jpeg' ? 'Choose Save Image in the share menu to save to Photos. You can also touch and hold the image.' : 'Choose Save to Files in the share menu to select a destination.')}</p>
            {navigator.canShare?.({ files: [exportResult.file] }) && <button onClick={shareExport} className="w-full flex items-center justify-center gap-2 bg-black text-white p-3 mb-3"><Share2 size={18} />{uiLanguage === 'ja' ? '共有して保存' : 'Share and save'}</button>}
            <a href={exportResult.url} download={exportResult.file.name} className="flex items-center justify-center gap-2 border border-black p-3"><Download size={18} />{uiLanguage === 'ja' ? 'ダウンロード' : 'Download'}</a>
            {exportResult.format === 'pdf' && <a href={exportResult.url} target="_blank" rel="noopener noreferrer" className="block text-center underline mt-3">{uiLanguage === 'ja' ? 'PDFを開く' : 'Open PDF'}</a>}
            {shareError && <p role="alert" className="text-sm text-red-700 mt-3">{shareError}</p>}
          </section>
        </div>
      )}

      {instagramResult && <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="instagram-title" className="bg-white rounded-lg p-5 w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3"><h2 id="instagram-title" className="font-bold">Instagram · 1080 × 1350</h2><button onClick={() => setInstagramResult(null)} aria-label={uiLanguage === 'ja' ? '閉じる' : 'Close'} className="p-2"><X size={20} /></button></div>
          <div className="grid grid-cols-2 gap-3">{instagramResult.map(result => <div key={result.side} className="min-w-0">
            <p className="text-xs text-gray-500 mb-2">{result.side === 'left' ? (uiLanguage === 'ja' ? '1 · 左側' : '1 · Left') : (uiLanguage === 'ja' ? '2 · 右側' : '2 · Right')}</p>
            <img src={result.url} alt={`Instagram ${result.side}`} className="w-full border border-gray-100" />
            {navigator.canShare?.({ files: [result.file] }) && <button onClick={() => shareInstagram(result.file)} className="w-full text-xs py-3 flex items-center justify-center gap-2 mt-2 bg-black text-white"><Share2 size={16} />{uiLanguage === 'ja' ? '共有して保存' : 'Share and save'}</button>}
            <a href={result.url} download={result.file.name} className="w-full text-xs py-3 flex items-center justify-center gap-2 mt-2 border border-gray-300"><Download size={16} />{uiLanguage === 'ja' ? 'ダウンロード' : 'Download'}</a>
          </div>)}</div>
          <p className="text-xs text-gray-500 mt-4">{uiLanguage === 'ja' ? 'iPhoneでは共有メニューの「画像を保存」、または画像の長押しで写真アプリへ保存できます。' : 'On iPhone, choose Save Image from the share menu, or touch and hold each image to save to Photos.'}</p>
          {shareError && <p role="alert" className="text-sm text-red-700 mt-3">{shareError}</p>}
        </section>
      </div>}

      {tempImageUrl && editingImageId && (
        <ImageCropperModal
          key={tempImageUrl}
          isOpen={true}
          imageUrl={tempImageUrl}
          aspectRatio={editingImageId === 'main' ? 3/4 : 2/3}
          initialFitMode={state.images[editingImageId as keyof typeof state.images]?.fitMode || 'cover'}
          initialExposure={state.images[editingImageId as keyof typeof state.images]?.exposure}
          initialVibrance={state.images[editingImageId as keyof typeof state.images]?.vibrance}
          initialCrop={tempImageUrl === state.images[editingImageId as keyof typeof state.images]?.originalUrl ? state.images[editingImageId as keyof typeof state.images]?.crop : undefined}
          initialZoom={tempImageUrl === state.images[editingImageId as keyof typeof state.images]?.originalUrl ? state.images[editingImageId as keyof typeof state.images]?.zoom : 1}
          initialCropArea={tempImageUrl === state.images[editingImageId as keyof typeof state.images]?.originalUrl ? state.images[editingImageId as keyof typeof state.images]?.cropArea : undefined}
          onClose={() => {
            imageLoadId.current++;
            setTempImageUrl(null);
            setEditingImageId(null);
          }}
          onCropComplete={handleCropComplete}
          onChangeImage={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
              fileInputRef.current.click();
            }
          }}
          uiLanguage={uiLanguage}
        />
      )}
    </div>
  );
}
