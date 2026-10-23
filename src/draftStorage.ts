import { AppState } from './types';

export interface Draft {
  state: AppState;
  uiLanguage: 'en' | 'ja';
  highResolution: boolean;
}
export interface StoredDraft extends Draft {
  version: 1;
  assets: Record<string, { bytes: ArrayBuffer; type: string }>;
}
const key = new URLSearchParams(window.location.search).get('demo')
  ? `demo:${new URLSearchParams(window.location.search).get('demo')}` : 'current';
let database: Promise<IDBDatabase> | undefined;
let operations: Promise<unknown> = Promise.resolve();
const assetCache = new Map<string, { bytes: ArrayBuffer; type: string }>();

export function forgetDraftAssets(draft: Draft) {
  for (const url of imageUrls(draft.state)) if (url) assetCache.delete(url);
}

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

export function imageUrls(state: AppState) {
  return [state.watermark.imageUrl, ...Object.values(state.images).flatMap(image => [image.originalUrl, image.croppedUrl])];
}

export function replaceUrls(state: AppState, replace: (url: string | null) => string | null): AppState {
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
  return restoreStoredDraft(stored);
}

export function restoreStoredDraft(stored: StoredDraft): Draft {
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

export async function serializeDraft(draft: Draft): Promise<StoredDraft> {
    const assets: StoredDraft['assets'] = {};
    const references = new Map<string, string>();
    const urls = [...new Set(imageUrls(draft.state).filter((url): url is string => !!url))];
    // Start reads before a later edit can release an obsolete object URL.
    const reads = urls.map(async url => {
      const cached = assetCache.get(url);
      if (cached) return cached;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Photo unavailable');
      const blob = await response.blob();
      const asset = { bytes: await blob.arrayBuffer(), type: blob.type };
      assetCache.set(url, asset);
      return asset;
    });
    const loaded = await Promise.all(reads);
    for (const [index, url] of urls.entries()) {
      const reference = `asset:${references.size}`;
      references.set(url, reference);
      assets[reference] = loaded[index];
    }
    const record: StoredDraft = {
      ...draft, version: 1, assets,
      state: replaceUrls(draft.state, url => url ? references.get(url)! : null)
    };
    for (const url of assetCache.keys()) if (!references.has(url)) assetCache.delete(url);
    return record;
}

export function saveDraft(draft: Draft): Promise<void> {
  const prepared = serializeDraft(draft);
  void prepared.catch(() => {});
  // Serialize writes so a slow photo save cannot overwrite a later reset.
  const operation = operations.catch(() => {}).then(async () => {
    const record = await prepared;
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(record, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Draft save aborted'));
    });
  });
  operations = operation;
  return operation;
}
