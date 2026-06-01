import React, { useState } from 'react';
import { AppState } from './types';
import Editor from './components/Editor';

export type UiLanguage = 'en' | 'ja';
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD?.trim() || '';

const INITIAL_STATE: AppState = {
  profile: {
    name: 'ALEXA VERMONT',
    nameFont: '"Oswald", sans-serif',
    contact: '+1 (123) 456-7890',
    showContact: true,
    email: 'ALEXA@EMAIL.COM',
    showEmail: true,
    agency: 'VIVA AGENCY',
    height: '178',
    bust: '84',
    waist: '60',
    hips: '89',
    shoes: '24.5',
    hair: 'Black',
    eyes: 'Brown',
    nationality: 'American',
    showNationality: false,
    residence: 'Tokyo',
    showResidence: false,
    experience: 'Vogue, Harper\'s Bazaar',
    showExperience: false,
  },
  watermark: {
    enabled: false,
    type: 'text',
    text: '',
    font: '"Oswald", sans-serif',
    imageUrl: null,
    opacity: 50,
  },
  images: {
    main: { id: 'main', originalUrl: null, croppedUrl: null },
    sub1: { id: 'sub1', originalUrl: null, croppedUrl: null },
    sub2: { id: 'sub2', originalUrl: null, croppedUrl: null },
    sub3: { id: 'sub3', originalUrl: null, croppedUrl: null },
    sub4: { id: 'sub4', originalUrl: null, croppedUrl: null },
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(APP_PASSWORD === '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);

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
    <div className="h-screen w-full bg-[#F8F8F8] text-[#1A1A1A] font-sans overflow-hidden flex flex-col">
      <Editor state={appState} setState={setAppState} uiLanguage={uiLanguage} setUiLanguage={setUiLanguage} />
    </div>
  );
}
