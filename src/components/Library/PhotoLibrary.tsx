import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PhotoLibraryService } from '@/services/photoLibrary';
import { Upload, X, CheckCircle2 } from 'lucide-react';
import styles from './PhotoLibrary.module.css';
import { PhotoAsset } from '@/types';

const PhotoLibrary: React.FC = () => {
  const { library, addPhotos, removePhoto, activeFrameType, stripState, canvasStates } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (library.length === 0 && !localStorage.getItem('travel_log_session_v2')) {
      PhotoLibraryService.loadDefaultPhotos().then(assets => {
        if (assets.length > 0) {
          addPhotos(assets);
        }
      });
    }
  }, [library.length, addPhotos]);

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const result = await PhotoLibraryService.importFiles(files, library.length);
    
    if (result.imported.length > 0) {
      addPhotos(result.imported);
    }
    
    if (result.rejected.length > 0) {
      alert(`Failed to import ${result.rejected.length} files.\nReasons:\n${result.rejected.map(r => `- ${r.filename}: ${r.reason}`).join('\n')}`);
    }
  };

  const handlePhotoClick = (photo: PhotoAsset) => {
    // Determine action based on active frame type
    if (activeFrameType === 'strip') {
      const firstEmptySlot = stripState.slots.findIndex(s => s.photoId === null);
      if (firstEmptySlot !== -1) {
        useAppStore.getState().placeInStripSlot(firstEmptySlot, photo.id);
      }
    } else {
      useAppStore.getState().addCanvasItem(activeFrameType, photo.id);
    }
  };

  const isPhotoUsed = (photoId: string) => {
    if (activeFrameType === 'strip') {
      return stripState.slots.some(s => s.photoId === photoId);
    } else {
      return canvasStates[activeFrameType].some(i => i.photoId === photoId);
    }
  };

  return (
    <aside 
      className={styles.libraryContainer}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleImport(e.dataTransfer.files);
      }}
    >
      <div className={styles.header}>
        <h2>Photos</h2>
        <span className={styles.count}>{library.length}/500</span>
      </div>

      <div className={styles.grid}>
        {library.length < 500 && (
          <button 
            className={`${styles.importBtn} ${isDragging ? styles.dragging : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} />
            <span>Add Photos</span>
          </button>
        )}

        {library.map((photo) => {
          const used = isPhotoUsed(photo.id);
          return (
            <div key={photo.id} className={styles.photoWrapper} onClick={() => handlePhotoClick(photo)}>
              <img src={photo.localRef} alt={photo.filename} className={styles.thumbnail} />
              {used && <div className={styles.usedBadge}><CheckCircle2 size={16} /></div>}
              <button 
                className={styles.deleteBtn} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Remove photo from library and all frames?')) {
                    removePhoto(photo.id);
                  }
                }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/*,.heic" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleImport(e.target.files)}
      />
    </aside>
  );
};

export default PhotoLibrary;
