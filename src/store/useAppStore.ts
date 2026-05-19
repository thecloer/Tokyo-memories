import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  SessionState, 
  FrameType, 
  FrameColor, 
  PhotoAsset, 
  CanvasItem, 
  CanvasItemTransform
} from '@/types';
import { SessionService } from '@/services/session';

const MAX_HISTORY = 50;

interface AppStore extends SessionState {
  // Library Actions
  addPhotos: (photos: PhotoAsset[]) => void;
  removePhoto: (photoId: string) => void;
  
  // Settings Actions
  setFrameType: (type: FrameType) => void;
  setFrameColor: (color: FrameColor) => void;
  
  // Strip Actions
  placeInStripSlot: (slotIndex: number, photoId: string) => void;
  clearStripSlot: (slotIndex: number) => void;
  swapStripSlots: (fromIndex: number, toIndex: number) => void;
  setStripLabel: (text: string) => void;
  setStripSlotCount: (count: number) => void;
  
  // Canvas Actions
  addCanvasItem: (frameType: Exclude<FrameType, 'strip'>, photoId: string) => void;
  updateCanvasItem: (frameType: Exclude<FrameType, 'strip'>, itemId: string, props: Partial<CanvasItemTransform>) => void;
  removeCanvasItem: (frameType: Exclude<FrameType, 'strip'>, itemId: string) => void;
  
  // Global Actions
  clearFrame: (frameType: FrameType) => void;
  undo: (frameType: FrameType) => void;
  
  // Internal
  _saveHistory: (frameType: FrameType) => void;
}

const defaultStripState = {
  slots: Array.from({ length: 4 }).map((_, i) => ({ index: i, photoId: null, aspectRatio: 3/2 })),
  labelText: 'Tokyo Memories',
  slotCount: 4,
};

const initialState: Omit<SessionState, 'undoStacks'> = {
  library: [],
  activeFrameType: 'strip',
  frameColor: 'light',
  stripState: defaultStripState,
  canvasStates: {
    square: [],
    portrait: [],
    landscape: []
  }
};

export const useAppStore = create<AppStore>((set, get) => {
  const loadState = SessionService.loadState();
  const baseState = loadState || initialState;

  return {
    ...baseState,
    undoStacks: { strip: [], square: [], portrait: [], landscape: [] },

    _saveHistory: (frameType) => set((state) => {
      const snapshot: Omit<SessionState, 'undoStacks'> = {
        library: state.library,
        activeFrameType: state.activeFrameType,
        frameColor: state.frameColor,
        stripState: state.stripState,
        canvasStates: state.canvasStates,
      };
      const stack = state.undoStacks[frameType];
      const newStack = [...stack, { stateSnapshot: JSON.parse(JSON.stringify(snapshot)), timestamp: Date.now() }].slice(-MAX_HISTORY);
      
      const nextState = { undoStacks: { ...state.undoStacks, [frameType]: newStack } };
      
      // Persist state silently on every change that causes history save
      setTimeout(() => SessionService.saveState({ ...snapshot, ...nextState }), 0);
      return nextState;
    }),

    addPhotos: (photos) => set((state) => {
      const newState = { library: [...state.library, ...photos] };
      SessionService.saveState({ ...state, ...newState, undoStacks: undefined } as any);
      return newState;
    }),

    removePhoto: (photoId) => set((state) => {
      const newLibrary = state.library.filter(p => p.id !== photoId);
      
      // Remove from active strip
      const newStripState = {
        ...state.stripState,
        slots: state.stripState.slots.map(s => s.photoId === photoId ? { ...s, photoId: null } : s)
      };

      // Remove from all canvases
      const newCanvasStates = {
        square: state.canvasStates.square.filter(i => i.photoId !== photoId),
        portrait: state.canvasStates.portrait.filter(i => i.photoId !== photoId),
        landscape: state.canvasStates.landscape.filter(i => i.photoId !== photoId),
      };

      const newState = { library: newLibrary, stripState: newStripState, canvasStates: newCanvasStates };
      SessionService.saveState({ ...state, ...newState, undoStacks: undefined } as any);
      return newState;
    }),

    setFrameType: (type) => set({ activeFrameType: type }),
    setFrameColor: (color) => set({ frameColor: color }),

    placeInStripSlot: (slotIndex, photoId) => {
      get()._saveHistory('strip');
      set((state) => ({
        stripState: {
          ...state.stripState,
          slots: state.stripState.slots.map((s, i) => i === slotIndex ? { ...s, photoId } : s)
        }
      }));
    },

    clearStripSlot: (slotIndex) => {
      get()._saveHistory('strip');
      set((state) => ({
        stripState: {
          ...state.stripState,
          slots: state.stripState.slots.map((s, i) => i === slotIndex ? { ...s, photoId: null } : s)
        }
      }));
    },

    swapStripSlots: (fromIndex, toIndex) => {
      get()._saveHistory('strip');
      set((state) => {
        const newSlots = [...state.stripState.slots];
        const temp = newSlots[fromIndex].photoId;
        newSlots[fromIndex].photoId = newSlots[toIndex].photoId;
        newSlots[toIndex].photoId = temp;
        return { stripState: { ...state.stripState, slots: newSlots } };
      });
    },

    setStripLabel: (text) => {
      get()._saveHistory('strip');
      set((state) => ({ stripState: { ...state.stripState, labelText: text } }));
    },

    setStripSlotCount: (count) => {
      get()._saveHistory('strip');
      set((state) => {
        const slots = Array.from({ length: count }).map((_, i) => {
          return state.stripState.slots[i] || { index: i, photoId: null, aspectRatio: 3/2 };
        });
        return { stripState: { ...state.stripState, slotCount: count, slots } };
      });
    },

    addCanvasItem: (frameType, photoId) => {
      get()._saveHistory(frameType);
      set((state) => {
        const items = state.canvasStates[frameType];
        const maxZ = items.reduce((max, item) => Math.max(max, item.zIndex), 0);
        const newItem: CanvasItem = {
          id: uuidv4(),
          photoId,
          x: 300 + (Math.random() * 100 - 50),
          y: 300 + (Math.random() * 100 - 50),
          width: 450,
          rotation: (Math.random() * 20 - 10), // slight random rotation
          scale: 1,
          zIndex: maxZ + 1
        };
        return { canvasStates: { ...state.canvasStates, [frameType]: [...items, newItem] } };
      });
    },

    updateCanvasItem: (frameType, itemId, props) => {
      get()._saveHistory(frameType);
      set((state) => {
        const items = state.canvasStates[frameType];
        return {
          canvasStates: {
            ...state.canvasStates,
            [frameType]: items.map(item => item.id === itemId ? { ...item, ...props } : item)
          }
        };
      });
    },

    removeCanvasItem: (frameType, itemId) => {
      get()._saveHistory(frameType);
      set((state) => ({
        canvasStates: {
          ...state.canvasStates,
          [frameType]: state.canvasStates[frameType].filter(item => item.id !== itemId)
        }
      }));
    },

    clearFrame: (frameType) => {
      get()._saveHistory(frameType);
      set((state) => {
        if (frameType === 'strip') {
          return { stripState: { ...state.stripState, slots: state.stripState.slots.map(s => ({ ...s, photoId: null })) } };
        } else {
          return { canvasStates: { ...state.canvasStates, [frameType]: [] } };
        }
      });
    },

    undo: (frameType) => set((state) => {
      const stack = state.undoStacks[frameType];
      if (stack.length === 0) return state; // nothing to undo
      
      const lastEntry = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);
      
      const restoredState = lastEntry.stateSnapshot;
      
      return {
        ...restoredState,
        undoStacks: {
          ...state.undoStacks,
          [frameType]: newStack
        }
      };
    }),

  };
});
