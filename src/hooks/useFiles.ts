import { useState } from 'react';

export type File = {
  id: string;
  name: string;
  path: string;
  user: Record<string, any>;
  type: string;
}

export function useFileManagement() {
  const [files, setFiles] = useState<File[]>([]);

  const uploadFile = async (file: Blob, extra: Record<string, any>): Promise<File> => {
    const formData = new FormData();
    formData.append('file', file);

    for (const key in extra) {
      formData.append(key, extra[key]);
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const newFile: File = await response.json();
      setFiles(prevFiles => [...prevFiles, newFile]);
      return newFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const deleteFile = async (fileId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  };

  return { files, uploadFile, deleteFile };
}