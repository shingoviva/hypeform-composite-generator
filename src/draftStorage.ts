import { AppState } from './types';

export interface Draft {
  state: AppState;
  uiLanguage: 'en' | 'ja';
  highResolution: boolean;
}
interface StoredDraft extends Draft {
  version: 1;
  assets: Record<string, { bytes: ArrayBuffer; type: string }>;
}
const key = new URLSearchParams(window.location.search).get('demo')
  ? `demo:${new URLSearchParams(window.location.search).get('demo')}` : 'current';
let database: Promise<IDBDatabase> | undefined;
let operations: Promise<unknown> = Promise.resolve();
const assetCache = new Map<string, { bytes: ArrayBuffer; type: string }>();

function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('hypeform-composite-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); database = undefined; };
      resolve(request.result);
    };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error('Draft storage blocked')); };
  });
  return database;
}

function imageUrls(state: AppState) {
  return [state.watermark.imageUrl, ...Object.values(state.images).flatMap(image => [image.originalUrl, image.croppedUrl])];
}

function replaceUrls(state: AppState, replace: (url: string | null) => string | null): AppState {
  const next = structuredClone(state);
  next.watermark.imageUrl = replace(next.watermark.imageUrl);
  for (const image of Object.values(next.images)) {
    image.originalUrl = replace(image.originalUrl);
    image.croppedUrl = replace(image.croppedUrl);
  }
  return next;
}

export async function loadDraft(): Promise<Draft | null> {
  const db = await openDatabase();
  const stored = await new Promise<StoredDraft | undefined>((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!stored) return null;
  if (stored.version !== 1 || !stored.state?.profile || !stored.state?.watermark ||
      !['main', 'sub1', 'sub2', 'sub3', 'sub4'].every(id => stored.state.images?.[id])) {
    throw new Error('Invalid saved draft');
  }
  const urls = new Map<string, string>();
  try {
    const state = replaceUrls(stored.state, reference => {
      if (!reference) return null;
      if (!urls.has(reference)) {
        const asset = stored.assets[reference];
        if (!(asset?.bytes instanceof ArrayBuffer)) throw new Error('Saved photo unavailable');
        const blob = new Blob([asset.bytes], { type: asset.type });
        const url = URL.createObjectURL(blob);
        urls.set(reference, url);
        assetCache.set(url, asset);
      }
      return urls.get(reference)!;
    });
    return { state, uiLanguage: stored.uiLanguage === 'ja' ? 'ja' : 'en', highResolution: !!stored.highResolution };
  } catch (error) {
    for (const url of urls.values()) { URL.revokeObjectURL(url); assetCache.delete(url); }
    throw error;
  }
}

export function saveDraft(draft: Draft): Promise<void> {
  // Serialize writes so a slow photo save cannot overwrite a later reset.
  const operation = operations.catch(() => {}).then(async () => {
    const db = await openDatabase();
    const assets: StoredDraft['assets'] = {};
    const references = new Map<string, string>();
    for (const url of imageUrls(draft.state)) {
      if (!url || references.has(url)) continue;
      const reference = `asset:${references.size}`;
      let asset = assetCache.get(url);
      if (!asset) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Photo unavailable');
        const blob = await response.blob();
        asset = { bytes: await blob.arrayBuffer(), type: blob.type };
        assetCache.set(url, asset);
      }
      references.set(url, reference);
      assets[reference] = asset;
    }
    const record: StoredDraft = {
      ...draft, version: 1, assets,
      state: replaceUrls(draft.state, url => url ? references.get(url)! : null)
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(record, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Draft save aborted'));
    });
    for (const url of assetCache.keys()) if (!references.has(url)) assetCache.delete(url);
  });
  operations = operation;
  return operation;
}
