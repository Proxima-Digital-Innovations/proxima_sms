
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase'; // Import the initialized storage instance

const uploadFile = async (filePath: string, file: File): Promise<{ downloadURL:string, storagePath: string }> => {
    const storageRef = ref(storage, filePath);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    return { downloadURL, storagePath: uploadResult.ref.fullPath };
};
    
const getFileDownloadURL = async (storagePath: string): Promise<string> => {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
};

export const storageService = {
    uploadFile,
    getDownloadURL: getFileDownloadURL,
};
