import heic2any from 'heic2any';
import { v4 as uuidv4 } from 'uuid';
import { PhotoAsset } from '@/types';

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_LIBRARY_SIZE = 500;

export interface ImportResult {
  imported: PhotoAsset[];
  rejected: { filename: string; reason: string }[];
}

export class PhotoLibraryService {
  static async loadDefaultPhotos(): Promise<PhotoAsset[]> {
    const urls = Object.values(import.meta.glob('../assets/photos/*.{jpg,jpeg,png,JPG,JPEG,PNG}', { eager: true, query: '?url', import: 'default' })) as string[];
    
    const limitedUrls = urls.slice(0, MAX_LIBRARY_SIZE);
    
    const assets = await Promise.all(limitedUrls.map(async (url) => {
      const filename = url.split('/').pop() || 'default.jpg';
      let dimensions = { width: 800, height: 600 };
      try {
        dimensions = await this.getImageDimensions(url);
      } catch (e) {}
      
      return {
        id: uuidv4(),
        filename,
        localRef: url,
        naturalWidth: dimensions.width,
        naturalHeight: dimensions.height,
        sizeBytes: 0,
        importedAt: Date.now(),
      };
    }));
    return assets;
  }

  /**
   * Processes a FileList and imports valid images.
   * Performs client-side validation and HEIC conversion.
   */
  static async importFiles(files: FileList | File[], currentCount: number): Promise<ImportResult> {
    const result: ImportResult = { imported: [], rejected: [] };
    const fileArray = Array.from(files);
    
    // Sort files to preserve selection order generally
    let availableSlots = MAX_LIBRARY_SIZE - currentCount;

    for (const file of fileArray) {
      if (availableSlots <= 0) {
        result.rejected.push({ filename: file.name, reason: 'Library limit (500 photos) reached.' });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        result.rejected.push({ filename: file.name, reason: 'Exceeds 20 MB size limit.' });
        continue;
      }

      try {
        let processedFile = file;

        // Check if HEIC
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
        if (isHeic) {
          try {
            const blobResult = await heic2any({ blob: file, toType: 'image/jpeg' });
            const blob = Array.isArray(blobResult) ? blobResult[0] : blobResult;
            processedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
          } catch (err) {
            result.rejected.push({ filename: file.name, reason: 'HEIC conversion failed. Not supported in this browser.' });
            continue;
          }
        } else if (!file.type.startsWith('image/')) {
           result.rejected.push({ filename: file.name, reason: 'Unsupported file format.' });
           continue;
        }

        const objectUrl = URL.createObjectURL(processedFile);
        
        // Extract natural dimensions
        const dimensions = await this.getImageDimensions(objectUrl);

        const asset: PhotoAsset = {
          id: uuidv4(),
          filename: processedFile.name,
          localRef: objectUrl,
          naturalWidth: dimensions.width,
          naturalHeight: dimensions.height,
          sizeBytes: processedFile.size,
          importedAt: Date.now(),
        };

        result.imported.push(asset);
        availableSlots--;

      } catch (err) {
        result.rejected.push({ filename: file.name, reason: 'Could not read file.' });
      }
    }

    return result;
  }

  static revokeAsset(asset: PhotoAsset) {
    if (asset.localRef) {
      URL.revokeObjectURL(asset.localRef);
    }
  }

  private static getImageDimensions(url: string): Promise<{width: number, height: number}> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image to calculate dimensions'));
      img.src = url;
    });
  }
}
