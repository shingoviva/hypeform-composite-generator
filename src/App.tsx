import React, { useEffect, useState } from 'react';
import Editor from './components/Editor';
import { useMobileInputVisibility } from './useMobileInputVisibility';
import { useAgencyWorkspace } from './useAgencyWorkspace';
import AgencyToolbar from './components/AgencyToolbar';

export type UiLanguage = 'en' | 'ja';
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD?.trim() || '';

export default function App() {
  useMobileInputVisibility();
  const [isAuthenticated, setIsAuthenticated] = useState(APP_PASSWORD === '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const workspace = useAgencyWorkspace();
  const [showWorking,setShowWorking]=useState(false);
  useEffect(()=>{
    if(!workspace.busy){setShowWorking(false);return;}
    const timer=window.setTimeout(()=>setShowWorking(true),180);
    return()=>window.clearTimeout(timer);
  },[workspace.busy]);
  const { state: appState, uiLanguage, highResolution } = workspace.draft;

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
          <h1 className="text-xl font-bold mb-2 text-center">Hypeform Composite Generator</h1>
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
      {workspace.ready && <AgencyToolbar controller={workspace} />}
      {workspace.busy && <div role={showWorking?'status':undefined} aria-hidden={!showWorking} className={`absolute inset-0 z-[95] bg-white/85 flex items-center justify-center text-sm ${showWorking?'opacity-100':'opacity-0'}`}>{uiLanguage === 'ja' ? '処理中…' : 'Working…'} {workspace.progress}</div>}
      <div className="flex-1 min-h-0 relative">
      {workspace.ready ? <Editor key={workspace.editorVersion} state={appState} setState={change => workspace.updateDraft(previous => ({...previous,state:typeof change === 'function' ? change(previous.state) : change}))} uiLanguage={uiLanguage} setUiLanguage={change => workspace.updateDraft(previous => ({...previous,uiLanguage:typeof change === 'function' ? change(previous.uiLanguage) : change}))} highResolution={highResolution} setHighResolution={change => workspace.updateDraft(previous => ({...previous,highResolution:typeof change === 'function' ? change(previous.highResolution) : change}))} saveStatus={workspace.saveStatus} onReset={() => void workspace.reset()} />
        : <div className="m-auto text-sm text-neutral-500" role="status">Restoring draft...</div>}
      </div>
    </div>
  );
}
