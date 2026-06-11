
import * as fs from 'fs';
import * as path from 'path';

// Storage Service to manage uploading and deleting files on the local filesystem offline.
export const storageService = {
    /**
     * Uploads a file by writing its array buffer content to the public/uploads directory.
     * Creates any parent directories recursively if they do not exist.
     * 
     * @param filePath - The target relative path (including filename) inside the uploads folder.
     * @param file - The File object to upload.
     * @returns An object containing the download URL and the storage path.
     */
    uploadFile: async (filePath: string, file: File) => {
        // Resolve the absolute path to save the file inside public/uploads
        const absolutePath = path.join(process.cwd(), 'public', 'uploads', filePath);
        
        // Extract the directory portion of the absolute path
        const directory = path.dirname(absolutePath);
        
        // Ensure the target directory exists by creating it recursively
        await fs.promises.mkdir(directory, { recursive: true });
        
        // Extract the array buffer bytes from the File object
        const arrayBuffer = await file.arrayBuffer();
        
        // Convert the array buffer to a Node.js Buffer for writing to disk
        const buffer = Buffer.from(arrayBuffer);
        
        // Write the buffer to the target location on disk
        await fs.promises.writeFile(absolutePath, buffer);
        
        // Return the download URL and the original relative path as storagePath
        return {
            downloadURL: `/uploads/${filePath}`,
            storagePath: filePath
        };
    },

    /**
     * Deletes a file from the public/uploads directory by unlinking it.
     * 
     * @param filePath - The path of the file to delete (either storagePath or downloadURL).
     */
    deleteFile: async (filePath: string) => {
        // Clean the file path if it starts with '/uploads/' or 'uploads/'
        let cleanPath = filePath;
        if (filePath.startsWith('/uploads/')) {
            cleanPath = filePath.replace(/^\/uploads\//, '');
        } else if (filePath.startsWith('uploads/')) {
            cleanPath = filePath.replace(/^uploads\//, '');
        }
        
        // Resolve the absolute path to the file inside public/uploads
        const absolutePath = path.join(process.cwd(), 'public', 'uploads', cleanPath);
        
        try {
            // Delete the file from the filesystem
            await fs.promises.unlink(absolutePath);
        } catch (error: any) {
            // Silence the error if the file was already deleted or doesn't exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    },
};

