export type FrameType = 'strip' | 'square' | 'portrait' | 'landscape';
export type FrameColor = 'dark' | 'light';

export interface PhotoAsset {
  id: string; // UUID
  filename: string;
  localRef: string; // ObjectURL representing the image
  naturalWidth: number;
  naturalHeight: number;
  sizeBytes: number;
  importedAt: number; // Unix timestamp
}

export interface StripSlot {
  index: number;
  photoId: string | null;
  aspectRatio: number;
}

export interface StripState {
  slots: StripSlot[];
  labelText: string;
  slotCount: number;
}

export interface CanvasItem {
  id: string; // UUID for this placement instance
  photoId: string;
  x: number;
  y: number;
  width: number; // Rendered logical width
  rotation: number;
  scale: number;
  zIndex: number;
}

export interface SessionState {
  library: PhotoAsset[];
  activeFrameType: FrameType;
  frameColor: FrameColor;
  stripState: StripState;
  canvasStates: Record<Exclude<FrameType, 'strip'>, CanvasItem[]>;
  undoStacks: Record<FrameType, SessionHistoryEntry[]>;
}

export interface SessionHistoryEntry {
  // Omit undoStacks from the stored snapshot to avoid infinite recursion
  stateSnapshot: Omit<SessionState, 'undoStacks'>;
  timestamp: number;
}

export interface CanvasItemTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export interface ExportOptions {
  frameType: FrameType;
  frameColor: FrameColor;
  scaleFactor: 1 | 2 | 3;
  stripState?: StripState;
  canvasItems?: CanvasItem[];
  resolvedPhotos: Record<string, HTMLImageElement>;
}
