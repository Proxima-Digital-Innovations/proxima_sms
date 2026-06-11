
// Firebase stubs for transition.
// Typed loosely to prevent TypeScript errors in files that are not yet migrated.

export const serverTimestamp = () => new Date();
export const collection = (db: any, path: string) => ({ path } as any);
// doc stub: can be called with doc(db, path, id), doc(db, path), or doc(collectionRef)
export const doc = (dbOrCol: any, path?: string, id?: string) => ({
  path: path || dbOrCol?.path || '',
  id: id || dbOrCol?.id || 'mock-doc-id'
} as any);
export const query = (...args: any[]) => ({}) as any;
export const where = (...args: any[]) => ({}) as any;
export const orderBy = (...args: any[]) => ({}) as any;
export const limit = (...args: any[]) => ({}) as any;

export const Timestamp = {
  now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
  fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 })
};

export const getDocs = async (q: any): Promise<any> => ({
  docs: [] as any[],
  size: 0,
  empty: true,
  forEach: (cb: any) => {}
});

export const getDoc = async (d: any): Promise<any> => ({
  exists: () => false,
  data: () => ({} as any),
  id: d?.id || 'mock-id'
});

export const setDoc = async (...args: any[]) => {};
export const updateDoc = async (...args: any[]) => {};
export const addDoc = async (...args: any[]) => ({ id: 'mock-id' });
export const deleteDoc = async (...args: any[]) => {};
export const writeBatch = (...args: any[]) => ({
  set: (...args: any[]) => {},
  update: (...args: any[]) => {},
  delete: (...args: any[]) => {},
  commit: async (...args: any[]) => {}
});
export const onSnapshot = (q: any, cb: any, errCb?: any) => (() => {});
export const ref = (...args: any[]) => ({}) as any;
// Mock uploadBytes to return a structure containing a ref property for compatibility
export const uploadBytes = async (...args: any[]) => ({
  ref: {
    fullPath: 'mock-uploads/file.png',
    name: 'file.png'
  }
} as any);
export const getDownloadURL = async (...args: any[]) => '';
export const signInWithEmailAndPassword = async (...args: any[]) => ({ user: { uid: 'mock-uid' } });
export const createUserWithEmailAndPassword = async (...args: any[]) => ({ user: { uid: 'mock-uid' } });
export const onAuthStateChanged = (auth: any, cb: any) => (() => {});

