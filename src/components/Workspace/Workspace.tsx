import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ExportService } from '@/services/export';
import StripFrame from '@/components/Frame/StripFrame';
import CanvasFrame from '@/components/Frame/CanvasFrame';
import styles from './Workspace.module.css';

// Logical sizes for frames
const FRAME_SIZES = {
  strip: { width: 600, height: 1800 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1440, height: 1080 },
};

const Workspace: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeFrameType, frameColor, stripState, canvasStates, library } = useAppStore();
  const [scale, setScale] = useState(1);

  const logicalSize = FRAME_SIZES[activeFrameType];

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
      
      const padding = 48; // 24px padding on all sides
      const availableW = containerW - padding * 2;
      const availableH = containerH - padding * 2;
      
      const scaleW = availableW / logicalSize.width;
      const scaleH = availableH / logicalSize.height;
      
      // Scale to fit within container
      let newScale = Math.min(scaleW, scaleH);
      
      // Don't scale up past 1x unless it's a very large screen
      if (newScale > 1) newScale = 1; 
      
      setScale(newScale);
    };

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    updateScale();
    return () => observer.disconnect();
  }, [logicalSize]);

  useEffect(() => {
    // Attach export handler to the button in ControlPanel via DOM
    // This is a small hack to avoid prop drilling or complex context for the Save button.
    const exportBtn = document.getElementById('export-trigger-btn');
    const handleExport = async () => {
      try {
        exportBtn?.setAttribute('disabled', 'true');
        
        // Resolve images into an object
        const resolvedPhotos: Record<string, HTMLImageElement> = {};
        await Promise.all(library.map(p => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => { resolvedPhotos[p.id] = img; resolve(); };
            img.onerror = () => resolve();
            img.src = p.localRef;
          });
        }));

        await ExportService.export({
          frameType: activeFrameType,
          frameColor: frameColor,
          scaleFactor: 2, // Default 2x export
          stripState: activeFrameType === 'strip' ? stripState : undefined,
          canvasItems: activeFrameType !== 'strip' ? canvasStates[activeFrameType] : undefined,
          resolvedPhotos
        }, logicalSize.width, logicalSize.height);
        
        // Brief success indication
        const span = exportBtn?.querySelector('span');
        if(span) {
           const orig = span.textContent;
           span.textContent = 'Saved!';
           setTimeout(() => { span.textContent = orig; }, 2000);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Export failed');
      } finally {
        exportBtn?.removeAttribute('disabled');
      }
    };

    exportBtn?.addEventListener('click', handleExport);
    return () => exportBtn?.removeEventListener('click', handleExport);
  }, [activeFrameType, frameColor, stripState, canvasStates, library, logicalSize]);

  return (
    <div className={styles.workspaceContainer} ref={containerRef}>
      <div 
        className={`${styles.frameWrapper} ${styles[frameColor]}`}
        style={{
          width: logicalSize.width,
          height: logicalSize.height,
          transform: `scale(${scale})`,
        }}
      >
        {activeFrameType === 'strip' 
          ? <StripFrame logicalWidth={logicalSize.width} logicalHeight={logicalSize.height} />
          : <CanvasFrame logicalWidth={logicalSize.width} logicalHeight={logicalSize.height} containerScale={scale} />
        }
      </div>
    </div>
  );
};

export default Workspace;
