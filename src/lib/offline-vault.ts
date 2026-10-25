/**
 * Proxima Exam & Assessment Offline Vault (IndexedDB & LocalStorage fallback)
 * Resilient client-side caching to survive campus Wi-Fi / cellular network disconnections.
 */

const DB_NAME = 'proxima_exam_offline_vault';
const DB_VERSION = 1;
const STORE_NAME = 'active_exam_drafts';

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'examKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export interface CachedExamState {
  examKey: string;
  examTitle?: string;
  answers?: Record<string, any>;
  essayText?: string;
  lastSavedAt: number;
  timeLeftSeconds?: number;
  status: 'DIRTY' | 'SYNCED';
}

/**
 * Save draft state to IndexedDB with LocalStorage backup
 */
export async function saveExamDraft(examKey: string, data: Partial<CachedExamState>): Promise<void> {
  if (!examKey) return;
  const payload: CachedExamState = {
    examKey,
    lastSavedAt: Date.now(),
    status: 'DIRTY',
    ...data,
  };

  try {
    // 1. LocalStorage instantaneous backup
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`cbt_draft_${examKey}`, JSON.stringify(payload));
    }

    // 2. IndexedDB persistent storage
    const db = await openDatabase();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(payload);
    }
  } catch (err) {
    console.warn('[OfflineVault] Save draft warning:', err);
  }
}

/**
 * Retrieve cached draft if student refreshed or reconnected after network drop
 */
export async function loadExamDraft(examKey: string): Promise<CachedExamState | null> {
  if (!examKey) return null;

  try {
    const db = await openDatabase();
    if (db) {
      const result: CachedExamState | null = await new Promise<CachedExamState | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(examKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (result) return result;
    }

    // Fallback to LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(`cbt_draft_${examKey}`);
      if (item) return JSON.parse(item);
    }
  } catch (err) {
    console.warn('[OfflineVault] Load draft warning:', err);
  }

  return null;
}

/**
 * Clear cached draft upon successful online submission confirmation
 */
export async function clearExamDraft(examKey: string): Promise<void> {
  if (!examKey) return;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`cbt_draft_${examKey}`);
    }

    const db = await openDatabase();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(examKey);
    }
  } catch (err) {
    console.warn('[OfflineVault] Clear draft warning:', err);
  }
}
