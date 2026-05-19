import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './StripFrame.module.css';

interface StripFrameProps {
  logicalWidth: number;
  logicalHeight: number;
}

const StripFrame: React.FC<StripFrameProps> = ({ logicalWidth, logicalHeight }) => {
  const { stripState, library, clearStripSlot, swapStripSlots, setStripLabel } = useAppStore();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  // Calculate slot dimensions based on logical dimensions and slot count
  const PADDING = 25;
  const LABEL_SPACE = 80;
  const GAP = 10;
  
  const contentWidth = logicalWidth - (PADDING * 2);
  const availableHeight = logicalHeight - (PADDING * 2) - LABEL_SPACE;
  const slotCount = stripState.slotCount;
  
  const slotHeight = (availableHeight - (GAP * (slotCount - 1))) / slotCount;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Small transparent image for drag ghost to keep it clean
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== index) {
      swapStripSlots(draggedIdx, index);
    }
    setDraggedIdx(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className={styles.stripContainer} style={{ padding: PADDING, gap: GAP }}>
      {stripState.slots.map((slot, index) => {
        const photo = slot.photoId ? library.find(p => p.id === slot.photoId) : null;
        
        return (
          <div 
            key={index}
            className={`${styles.slot} ${draggedIdx === index ? styles.dragging : ''}`}
            style={{ width: contentWidth, height: slotHeight }}
            draggable={!!photo}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => {
              if (photo) clearStripSlot(index);
            }}
          >
            {photo ? (
              <img src={photo.localRef} alt="slot" className={styles.slotImage} />
            ) : (
              <div className={styles.emptySlot}>
                <span>Click a photo in library</span>
              </div>
            )}
            {photo && (
              <div className={styles.slotOverlay}>
                <span>Remove</span>
              </div>
            )}
          </div>
        );
      })}
      
      <div className={styles.labelContainer} style={{ height: LABEL_SPACE }}>
        <input 
          type="text" 
          className={styles.labelInput}
          value={stripState.labelText}
          onChange={(e) => setStripLabel(e.target.value)}
          placeholder="Enter a label..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default StripFrame;
