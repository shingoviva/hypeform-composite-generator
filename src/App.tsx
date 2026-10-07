import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import Editor from './components/Editor';
import { DEFAULT_STATE, getInitialAppState } from './demoFixtures';
import { loadDraft, saveDraft } from './draftStorage';

export type UiLanguage = 'en' | 'ja';
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD?.trim() || '';

export default function App() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      if (viewport && viewport.scale === 1) {
        document.documentElement.style.setProperty('--app-height', `${viewport.height}px`);
      }
    };
    update();
    viewport?.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--app-height');
    };
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState(APP_PASSWORD === '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [highResolution, setHighResolution] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving');
  const [editorVersion, setEditorVersion] = useState(0);
  
  const [appState, setAppState] = useState<AppState>(() => getInitialAppState());

  useEffect(() => {
    let active = true;
    loadDraft().then(draft => {
      if (!active) {
        if (draft) for (const image of Object.values(draft.state.images)) {
          if (image.originalUrl) URL.revokeObjectURL(image.originalUrl);
          if (image.croppedUrl) URL.revokeObjectURL(image.croppedUrl);
        }
        if (draft?.state.watermark.imageUrl) URL.revokeObjectURL(draft.state.watermark.imageUrl);
        return;
      }
      if (draft) {
        setAppState(draft.state);
        setUiLanguage(draft.uiLanguage);
        setHighResolution(draft.highResolution);
      }
      setDraftReady(true);
    }).catch(error => {
      console.warn('Draft restore unavailable', error);
      if (active) { setSaveStatus('unavailable'); setDraftReady(true); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    let active = true;
    const draft = { state: appState, uiLanguage, highResolution };
    setSaveStatus('saving');
    const save = () => saveDraft(draft).then(() => {
      if (active) setSaveStatus('saved');
    }).catch(error => { console.warn('Draft save unavailable', error); if (active) setSaveStatus('unavailable'); });
    const timer = window.setTimeout(save, 350);
    const flush = () => { window.clearTimeout(timer); void save(); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [appState, uiLanguage, highResolution, draftReady]);

  const resetAll = async () => {
    const message = uiLanguage === 'ja'
      ? '写真・プロフィール・ウォーターマークを含むすべての設定と、この端末の保存データをリセットします。よろしいですか？'
      : 'Reset all photos, profile information, watermark settings, and the saved draft on this device?';
    if (!window.confirm(message)) return;
    const state = structuredClone(DEFAULT_STATE);
    setAppState(state);
    setUiLanguage('en');
    setHighResolution(false);
    setEditorVersion(version => version + 1);
    setSaveStatus('saving');
    try {
      await saveDraft({ state, uiLanguage: 'en', highResolution: false });
      setSaveStatus('saved');
    } catch { setSaveStatus('unavailable'); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans text-neutral-900">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-2 text-center">Hypeform</h1>
          <p className="text-neutral-500 text-sm mb-6 text-center">Enter the access password to open the composite generator.</p>
          
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-black'} focus:outline-none focus:ring-2 transition-all`}
              />
              {error && <p className="text-red-500 text-xs mt-1">Incorrect password</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white font-medium py-3 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell relative w-full bg-[#F8F8F8] text-[#1A1A1A] font-sans overflow-hidden flex flex-col">
      {draftReady ? <Editor key={editorVersion} state={appState} setState={setAppState} uiLanguage={uiLanguage} setUiLanguage={setUiLanguage} highResolution={highResolution} setHighResolution={setHighResolution} saveStatus={saveStatus} onReset={resetAll} />
        : <div className="m-auto text-sm text-neutral-500" role="status">Restoring draft...</div>}
    </div>
  );
}
