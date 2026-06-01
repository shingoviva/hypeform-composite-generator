import React, { useState, useRef, ChangeEvent } from 'react';
import { AppState } from '../types';
import Form from './Form';
import Preview from './Preview';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import ImageCropperModal from './ImageCropperModal';
import { UiLanguage } from '../App';

interface EditorProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  uiLanguage: UiLanguage;
  setUiLanguage: React.Dispatch<React.SetStateAction<UiLanguage>>;
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

export default function Editor({ state, setState, uiLanguage, setUiLanguage }: EditorProps) {
  const lang = t[uiLanguage];
  const [isExporting, setIsExporting] = useState(false);
  const [highResolution, setHighResolution] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingImageId) {
      const url = URL.createObjectURL(file);
      setTempImageUrl(url);
    }
  };

  const handleCropComplete = (croppedUrl: string, fitMode: 'cover' | 'contain') => {
    if (editingImageId) {
      setState(prev => ({
        ...prev,
        images: {
          ...prev.images,
          [editingImageId]: {
            ...prev.images[editingImageId as keyof typeof prev.images],
            originalUrl: tempImageUrl,
            croppedUrl: croppedUrl,
            fitMode: fitMode
          }
        }
      }));
    }
    setEditingImageId(null);
    setTempImageUrl(null);
  };

  const performExport = async (format: 'pdf' | 'jpeg') => {
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const canvasElement = document.getElementById('composite-canvas');
        if (!canvasElement) {
          throw new Error('Export canvas not found');
        }

        const exportPixelRatio = highResolution ? 4 : 2;
        const imgData = await toJpeg(canvasElement, {
          quality: highResolution ? 1.0 : 0.95,
          pixelRatio: exportPixelRatio,
          backgroundColor: '#ffffff',
          width: 1123,
          height: 794,
          style: {
            transform: 'none',
            position: 'relative',
            boxShadow: 'none',
            margin: '0'
          }
        });

        if (format === 'pdf') {
          // A4 landscape = 297mm x 210mm
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });
          
          pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
          pdf.save(`${state.profile.name || 'composite'}_zedcard.pdf`);
        } else {
          // JPEG download
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `${state.profile.name || 'composite'}_zedcard.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error: any) {
        console.error('Export failed:', error);
        alert(`Export failed: ${error?.message || String(error)}`);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

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
      <aside className={`${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 shrink-0 h-full bg-white lg:border-r lg:border-[#E5E5E5] flex-col z-10 relative`}>
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
        <div className="flex-1 overflow-y-auto w-full">
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
      <main className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col relative overflow-hidden bg-[#F8F8F8] w-full`}>
        <header className="h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center space-y-1 overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-widest truncate">{lang.previewing}: {state.profile.name || 'Composite'}_zedcard.pdf</span>
          </div>
          <div className="flex space-x-4 shrink-0 pl-2">
            <div className="flex items-center gap-4">
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
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> {lang.saved}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 h-full flex items-center justify-center p-4 lg:p-12 overflow-hidden relative">
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

      {tempImageUrl && editingImageId && (
        <ImageCropperModal
          isOpen={true}
          imageUrl={tempImageUrl}
          aspectRatio={4/5}
          initialFitMode={state.images[editingImageId as keyof typeof state.images]?.fitMode || 'cover'}
          onClose={() => {
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
