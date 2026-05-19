import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, LayoutPanelTop, MonitorSmartphone, Layers, Maximize } from 'lucide-react';
import styles from './ControlPanel.module.css';

const ControlPanel: React.FC = () => {
  const { 
    activeFrameType, setFrameType, 
    frameColor, setFrameColor, 
    clearFrame 
  } = useAppStore();

  return (
    <div className={styles.panelContainer}>
      <div className={styles.group}>
        <div className={styles.btnGroup}>
          <button 
            className={`${styles.toggleBtn} ${activeFrameType === 'strip' ? styles.active : ''}`}
            onClick={() => setFrameType('strip')}
            title="Photo Strip"
          >
            <LayoutPanelTop size={18} />
          </button>
          <button 
            className={`${styles.toggleBtn} ${activeFrameType === 'square' ? styles.active : ''}`}
            onClick={() => setFrameType('square')}
            title="Square Canvas"
          >
            <Maximize size={18} />
          </button>
          <button 
            className={`${styles.toggleBtn} ${activeFrameType === 'portrait' ? styles.active : ''}`}
            onClick={() => setFrameType('portrait')}
            title="Portrait Canvas"
          >
            <MonitorSmartphone size={18} />
          </button>
          <button 
            className={`${styles.toggleBtn} ${activeFrameType === 'landscape' ? styles.active : ''}`}
            onClick={() => setFrameType('landscape')}
            title="Landscape Canvas"
          >
            <Layers size={18} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.btnGroup}>
          <button 
            className={`${styles.toggleBtn} ${frameColor === 'light' ? styles.active : ''}`}
            onClick={() => setFrameColor('light')}
          >
            Light
          </button>
          <button 
            className={`${styles.toggleBtn} ${frameColor === 'dark' ? styles.active : ''}`}
            onClick={() => setFrameColor('dark')}
          >
            Dark
          </button>
        </div>
      </div>

      <div className={styles.group}>
        <button 
          className={styles.clearBtn} 
          onClick={() => {
            if(confirm('Clear all photos from this frame?')) clearFrame(activeFrameType);
          }}
        >
          Clear All
        </button>
        <button className={styles.saveBtn} id="export-trigger-btn">
          <Download size={18} />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
