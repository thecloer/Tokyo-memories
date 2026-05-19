import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { FrameType, CanvasItem } from '@/types';
import { ZoomIn, ZoomOut, MoveUp, MoveDown, Trash2, RotateCw } from 'lucide-react';
import styles from './CanvasFrame.module.css';

interface CanvasFrameProps {
  logicalWidth: number;
  logicalHeight: number;
  containerScale?: number;
}

const CanvasFrame: React.FC<CanvasFrameProps> = ({ logicalWidth, logicalHeight, containerScale = 1 }) => {
  const { activeFrameType, canvasStates } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const frameType = activeFrameType as Exclude<FrameType, 'strip'>;
  const items = canvasStates[frameType] || [];

  const handleBackgroundClick = () => {
    setSelectedId(null);
  };

  return (
    <div 
      className={styles.canvasContainer} 
      style={{ 
        width: logicalWidth, 
        height: logicalHeight,
        overflow: selectedId ? 'visible' : 'hidden'
      }}
      onPointerDown={handleBackgroundClick}
    >
      {items.map(item => (
        <DraggableCanvasItem 
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          onSelect={() => setSelectedId(item.id)}
          frameType={frameType}
          containerWidth={logicalWidth}
          containerHeight={logicalHeight}
          containerScale={containerScale}
        />
      ))}
    </div>
  );
};

export default CanvasFrame;

interface DraggableProps {
  item: CanvasItem;
  isSelected: boolean;
  onSelect: () => void;
  frameType: Exclude<FrameType, 'strip'>;
  containerWidth: number;
  containerHeight: number;
  containerScale: number;
}

const DraggableCanvasItem: React.FC<DraggableProps> = ({ item, isSelected, onSelect, frameType, containerWidth, containerHeight, containerScale }) => {
  const { library, updateCanvasItem, removeCanvasItem, canvasStates } = useAppStore();
  const photo = library.find(p => p.id === item.photoId);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Local state for smooth dragging
  const [localTransform, setLocalTransform] = useState({ x: item.x, y: item.y, rotation: item.rotation });
  const isDragging = useRef(false);
  const isRotating = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startTransform = useRef({ x: 0, y: 0, rotation: 0 });

  useEffect(() => {
    // Sync local state when store changes externally (like undo)
    if (!isDragging.current && !isRotating.current) {
      setLocalTransform({ x: item.x, y: item.y, rotation: item.rotation });
    }
  }, [item.x, item.y, item.rotation]);

  if (!photo) return null;

  const aspectRatio = photo.naturalWidth / photo.naturalHeight;
  const renderWidth = item.width;
  const renderHeight = renderWidth / aspectRatio;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    
    // Only drag with left click and if not clicking a button
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    
    const isRotateHandle = (e.target as HTMLElement).closest(`.${styles.rotateHandle}`);
    
    if (isRotateHandle) {
      isRotating.current = true;
    } else {
      isDragging.current = true;
    }
    
    startPos.current = { x: e.clientX, y: e.clientY };
    startTransform.current = { ...localTransform };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    // We must calculate movement relative to the scaled container
    // Since the container is scaled via CSS transform, mouse movement pixels don't 1:1 match logical pixels
    // We can find the container's scale by checking its bounding box
    const container = elementRef.current?.parentElement;
    let scale = 1;
    if (container) {
      scale = container.getBoundingClientRect().width / containerWidth;
    }

    const dx = (e.clientX - startPos.current.x) / scale;
    const dy = (e.clientY - startPos.current.y) / scale;

    if (isDragging.current) {
      setLocalTransform({
        ...startTransform.current,
        x: startTransform.current.x + dx,
        y: startTransform.current.y + dy,
      });
    } else if (isRotating.current && elementRef.current) {
      // Calculate rotation based on center of image
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      
      // Offset by 90 deg because handle is at bottom
      let newRot = angle - 90;
      
      // Magnetic snap to 10 degrees unless shift is held
      if (!e.shiftKey) {
        newRot = Math.round(newRot / 10) * 10;
      }
      
      // Wrap 0-360
      newRot = (newRot + 360) % 360;

      setLocalTransform({ ...startTransform.current, rotation: newRot });
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    isRotating.current = false;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    
    // Commit to store
    // Ensure item is not dragged entirely off-canvas
    setLocalTransform(current => {
      let finalX = current.x;
      let finalY = current.y;
      
      // Constrain to keep at least 20px in bounds
      if (finalX > containerWidth - 20) finalX = containerWidth - 20;
      if (finalX + renderWidth < 20) finalX = 20 - renderWidth;
      if (finalY > containerHeight - 20) finalY = containerHeight - 20;
      if (finalY + renderHeight < 20) finalY = 20 - renderHeight;
      
      updateCanvasItem(frameType, item.id, { x: finalX, y: finalY, rotation: current.rotation });
      return { ...current, x: finalX, y: finalY };
    });
  };

  const handleScale = (factor: number) => {
    let newScale = item.scale * factor;
    if (newScale < 0.3) newScale = 0.3;
    if (newScale > 4.0) newScale = 4.0;
    updateCanvasItem(frameType, item.id, { scale: newScale });
  };

  const handleZIndex = (dir: 1 | -1) => {
    const items = canvasStates[frameType];
    const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0);
    let newZ = item.zIndex + dir;
    if (dir === 1) newZ = maxZ + 1; // Bring to front
    if (newZ < 1) newZ = 1;
    updateCanvasItem(frameType, item.id, { zIndex: newZ });
  };

  // Calculate inverse scale to keep UI controls a constant physical size on screen
  const visualScale = item.scale * containerScale;
  const uiScale = 1 / visualScale;

  return (
    <div
      ref={elementRef}
      className={`${styles.canvasItem} ${isSelected ? styles.selected : ''}`}
      style={{
        width: renderWidth,
        height: renderHeight,
        transform: `translate(${localTransform.x}px, ${localTransform.y}px) rotate(${localTransform.rotation}deg) scale(${item.scale})`,
        zIndex: item.zIndex,
      }}
      onPointerDown={handlePointerDown}
    >
      <div className={styles.polaroidContainer}>
        <img src={photo.localRef} alt="canvas item" draggable={false} />
      </div>

      {isSelected && (
        <>
          <div 
            className={styles.toolbar} 
            onPointerDown={(e) => e.stopPropagation()}
            style={{ transform: `translateX(-50%) scale(${uiScale})`, transformOrigin: 'bottom center' }}
          >
            <button onClick={() => handleScale(1.1)} title="Zoom In"><ZoomIn size={16} /></button>
            <button onClick={() => handleScale(0.9)} title="Zoom Out"><ZoomOut size={16} /></button>
            <button onClick={() => handleZIndex(1)} title="Bring to Front"><MoveUp size={16} /></button>
            <button onClick={() => handleZIndex(-1)} title="Send Backward"><MoveDown size={16} /></button>
            <button onClick={() => removeCanvasItem(frameType, item.id)} title="Remove" className={styles.dangerBtn}>
              <Trash2 size={16} />
            </button>
          </div>
          <div 
            className={styles.rotateHandle} 
            title="Drag to Rotate" 
            style={{ transform: `translateX(-50%) scale(${uiScale})`, transformOrigin: 'center center' }}
          >
            <RotateCw size={12} />
          </div>
        </>
      )}
    </div>
  );
};
