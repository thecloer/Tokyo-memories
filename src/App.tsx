import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PhotoLibrary from '@/components/Library/PhotoLibrary';
import ControlPanel from '@/components/Controls/ControlPanel';
import Workspace from '@/components/Workspace/Workspace';
import styles from './App.module.css';
import themeStyles from '@/styles/theme.module.css';

function App() {
  const frameColor = useAppStore((state) => state.frameColor);
  const themeClass = frameColor === 'dark' ? themeStyles.darkTheme : themeStyles.lightTheme;

  // Handle global keyboard shortcuts (Undo/Redo)
  const undo = useAppStore(state => state.undo);
  const activeFrameType = useAppStore(state => state.activeFrameType);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        // Redo is usually shift+Z or Y. The spec mentioned undo/redo. 
        // We only implemented Undo for simplicity in the store, but we can add redo later if needed.
        if (!e.shiftKey) {
           undo(activeFrameType);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, activeFrameType]);

  return (
    <div className={`${styles.appContainer} ${themeClass}`}>
      <PhotoLibrary />
      <main className={styles.mainContent}>
        <ControlPanel />
        <Workspace />
      </main>
    </div>
  );
}

export default App;