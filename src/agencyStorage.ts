import { Draft, StoredDraft, restoreStoredDraft } from './draftStorage';
import { ProfileData } from './types';

export interface AgencyEntry {
  key: string;
  collection: string;
  id: string;
  name: string;
  updatedAt: string;
  revision: number;
  sourceProfile: ProfileData;
}
export interface AgencyWorkspace {
  version: 1;
  id: string;
  collection: string;
  title: string;
  enabled: boolean;
  modelIds: string[];
}
export interface AgencyRecord { draft: StoredDraft; entry: AgencyEntry }
export class AgencyConflict extends Error {
  constructor() { super('This model was updated in another tab.'); this.name = 'AgencyConflict'; }
}
let connection: Promise<IDBDatabase> | undefined;
function open() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('hypeform-agency-workspaces', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('workspace');
      db.createObjectStore('models');
      db.createObjectStore('entries', { keyPath: 'key' }).createIndex('collection', 'collection');
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); connection = undefined; };
      resolve(request.result);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('Workspace storage blocked')); };
  });
  return connection;
}
export const modelKey = (workspace: AgencyWorkspace, id: string) => `${workspace.collection}/${id}`;

export async function readWorkspace(): Promise<AgencyWorkspace | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction('workspace').objectStore('workspace').get('current');
    request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error);
  });
}
export async function writeWorkspace(workspace: AgencyWorkspace) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('workspace', 'readwrite'); tx.objectStore('workspace').put(workspace, 'current');
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error);
  });
}
export async function readEntries(workspace: AgencyWorkspace): Promise<AgencyEntry[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction('entries').objectStore('entries').index('collection').getAll(workspace.collection);
    request.onsuccess = () => {
      const entries = new Map<string, AgencyEntry>(request.result.map(entry => [entry.id, entry]));
      resolve(workspace.modelIds.map(id => entries.get(id)).filter((entry): entry is AgencyEntry => !!entry));
    }; request.onerror = () => reject(request.error);
  });
}
export async function readModel(key: string): Promise<AgencyRecord> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction('models').objectStore('models').get(key);
    request.onsuccess = () => request.result ? resolve(request.result) : reject(new Error('Saved model unavailable'));
    request.onerror = () => reject(request.error);
  });
}
export async function loadModel(key: string): Promise<{ draft: Draft; entry: AgencyEntry }> {
  const record = await readModel(key);
  return { draft: restoreStoredDraft(record.draft), entry: record.entry };
}
export async function writeModel(entry: AgencyEntry, draft: StoredDraft, expectedRevision?: number): Promise<AgencyEntry> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['models', 'entries'], 'readwrite');
    let conflict = false;
    let next: AgencyEntry;
    const request = tx.objectStore('models').get(entry.key);
    request.onsuccess = () => {
      const previous = request.result as AgencyRecord | undefined;
      if ((expectedRevision === undefined && previous) || (expectedRevision !== undefined && previous?.entry.revision !== expectedRevision)) {
        conflict = true; tx.abort(); return;
      }
      next = { ...entry, name: draft.state.profile.name, revision: (previous?.entry.revision ?? 0) + 1 };
      tx.objectStore('models').put({ entry: next, draft }, entry.key);
      tx.objectStore('entries').put(next);
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = tx.onerror = () => reject(conflict ? new AgencyConflict() : tx.error || new Error('Model save failed'));
  });
}
export async function discardStaging(keys: string[]) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['models', 'entries'], 'readwrite');
    for (const key of keys) { tx.objectStore('models').delete(key); tx.objectStore('entries').delete(key); }
    tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error);
  });
}
