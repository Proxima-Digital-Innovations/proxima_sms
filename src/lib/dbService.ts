
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  writeBatch,
  DocumentReference,
  Firestore,
  CollectionReference,
  WhereFilterOp,
  OrderByDirection
} from 'firebase/firestore';
import { db } from './firebase'; // Import the initialized db instance

export type QueryConstraint =
  | { type: 'where'; fieldPath: string; opStr: WhereFilterOp; value: any }
  | { type: 'orderBy'; fieldPath: string; direction: OrderByDirection }
  | { type: 'limit'; limitCount: number };

const applyQueryConstraints = (collectionRef: CollectionReference, constraints?: QueryConstraint[]) => {
    let q = query(collectionRef);
    if (constraints) {
        constraints.forEach(c => {
            if (c.type === 'where' && c.opStr) {
                q = query(q, where(c.fieldPath, c.opStr, c.value));
            } else if (c.type === 'orderBy' && c.direction) {
                q = query(q, orderBy(c.fieldPath, c.direction));
            } else if (c.type === 'limit' && c.limitCount) {
                q = query(q, limit(c.limitCount));
            }
        });
    }
    return q;
};


const getDocData = async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as T) : null;
};

const getDocsData = async <T>(collectionName: string, constraints?: QueryConstraint[]): Promise<T[]> => {
    const collectionRef = collection(db, collectionName);
    const q = applyQueryConstraints(collectionRef, constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

const addDocData = async (collectionName: string, data: any): Promise<string> => {
    const newDocRef = await addDoc(collection(db, collectionName), data);
    return newDocRef.id;
};

const setDocData = async (collectionName: string, id: string, data: any): Promise<void> => {
    await setDoc(doc(db, collectionName, id), data, { merge: true });
};

const updateDocData = async (collectionName: string, id: string, data: any): Promise<void> => {
    await updateDoc(doc(db, collectionName, id), data);
};

const deleteDocData = async (collectionName: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, collectionName, id));
};

const getCount = async (collectionName: string, constraints?: QueryConstraint[]): Promise<number> => {
    const collectionRef = collection(db, collectionName);
    const q = applyQueryConstraints(collectionRef, constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

const createBatch = () => {
    const batch = writeBatch(db);

    return {
        set: (collectionName: string, id: string | null, data: any) => {
            const collectionRef = collection(db, collectionName);
            const docRef = id ? doc(collectionRef, id) : doc(collectionRef);
            batch.set(docRef, data);
        },
        update: (collectionName: string, id: string, data: any) => {
            batch.update(doc(db, collectionName, id), data);
        },
        delete: (collectionName: string, id: string) => {
            batch.delete(doc(db, collectionName, id));
        },
        commit: () => batch.commit(),
    };
};

export const dbService = {
  getDoc: getDocData,
  getDocs: getDocsData,
  addDoc: addDocData,
  setDoc: setDocData,
  updateDoc: updateDocData,
  deleteDoc: deleteDocData,
  getCountFromServer: getCount,
  createBatch: createBatch,
};
