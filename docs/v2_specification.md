# 🚀 Travel Log V2 System Specification & Architecture Document

---

## 1. Executive Summary

**Travel Log** is a browser-based photo collage authoring tool that enables users to compose, arrange, and export stylized photo layouts inspired by printed photography formats (e.g., Korean photo-booth strips, Polaroid collections). The core value proposition is a zero-installation, client-side experience that produces high-quality, shareable image exports.

### Core Objectives
- Allow users to import photos from local storage and compose them into one of several predefined frame templates.
- Enable expressive, non-destructive photo manipulation (position, scale, rotation) within a free-form canvas.
- Export composited artwork as a high-resolution raster image (PNG) entirely client-side.
- Deliver a fully responsive experience across desktop and mobile viewports.

### Target Audience
Individual travelers and photography enthusiasts who want to create keepsake-style photo prints or social-media-ready collages from a personal photo library, without requiring specialized software.

### Primary Use Cases
1. **Structured Collage (Strip Mode):** User fills a fixed N-slot vertical strip template (analogous to a photo-booth strip), producing a standardized, print-ready layout.
2. **Free-Form Collage (Canvas Mode):** User freely places, scales, and rotates multiple photos on a blank canvas of a chosen aspect ratio, producing an artistic, layered composition.
3. **Export:** User downloads the finished composition as a full-resolution PNG with a single action.

---

## 2. Core Functional Requirements

### 2.1 Photo Library Management

**Objective:** Allow the user to supply, browse, and manage a set of source photos for the session.

**User Flow:**
1. On first load, the system presents an empty photo library panel.
2. The user triggers an import action (file picker or drag-and-drop onto the panel).
3. The system reads selected files client-side, generates thumbnails, and displays them in the library grid.
4. Each photo displays a visual indicator when it has already been placed in the active frame.
5. The user may remove a photo from the library; doing so also removes all instances of it from the active frame, with a confirmation prompt.

**Business Rules:**
- Accepted formats: JPEG, PNG, WEBP, HEIC (with client-side conversion for HEIC).
- Maximum file size per photo: 20 MB. Files exceeding this limit are rejected with a user-visible error.
- Maximum photos per session library: 500. Excess imports are rejected gracefully.
- All photo data remains client-side. No bytes are transmitted to any server.
- Photo filenames are sanitized and used as the basis for accessibility alt text.
- Library state persists across frame-type switches within the same session.

---

### 2.2 Frame Template Selection

**Objective:** Allow the user to choose a frame layout that governs how photos are composed and exported.

**User Flow:**
1. A control panel (persistent, always visible) exposes a selector for Frame Type and Frame Color.
2. Changing the Frame Type switches the active canvas. Photo arrangements are preserved per frame type within a session (switching back restores the previous state).
3. Changing the Frame Color updates a background/border color theme (dark or light) in real time.

**Frame Types (V2 Required):**

| ID | Name | Aspect Ratio | Description |
|---|---|---|---|
| `strip` | Photo Strip | ~1:4.x | N fixed slots (default 4) arranged vertically; each slot has a fixed aspect ratio. |
| `square` | Square Canvas | 1:1 | Free-form canvas, square dimensions. |
| `portrait` | Portrait Canvas | 3:4 | Free-form canvas, portrait dimensions. |
| `landscape` | Landscape Canvas | 4:3 | Free-form canvas, landscape dimensions. *(New in V2)* |

**Frame Colors:**

| ID | Background | Foreground Text |
|---|---|---|
| `dark` | Near-black (`#18181b`) | White |
| `light` | White (`#ffffff`) | Near-black |

**Business Rules:**
- Frame type state (placed photos, positions, transforms) is stored independently per frame type in session memory.
- The strip frame slot count is configurable (2–6 slots) via the control panel.
- The strip frame's decorative text label must be a user-editable field (not hardcoded to a specific location name).
- Switching frame types does not clear the photo library.

---

### 2.3 Strip Frame Mode

**Objective:** Provide a structured, slot-based collage layout.

**User Flow:**
1. The strip frame renders N empty slots, each displaying an "add photo" placeholder.
2. The user clicks a photo in the library → it fills the next empty slot in order.
3. Alternatively, the user clicks a specific empty slot → the system prompts photo selection from the library (or opens a native file picker).
4. Clicking an occupied slot removes the photo from that slot (with undo support).
5. The user may drag a photo from one slot to another to reorder.
6. The decorative label text at the bottom is editable inline (double-click to activate).

**Business Rules:**
- Each slot maintains its own aspect ratio (configurable; default 3:2).
- A photo may only occupy one slot at a time within the strip frame.
- All slots must be filled before the Export action is enabled, OR the system exports with empty slots rendered as the background color (user preference toggle).
- Removing a photo from a slot marks it as "available" in the library.

---

### 2.4 Canvas Frame Mode

**Objective:** Provide a free-form photo composition canvas with per-photo transform controls.

**User Flow:**
1. Canvas renders as a blank bounded area (the frame).
2. The user clicks a photo in the library → a new photo item appears centered on the canvas with a slight random offset and rotation to suggest a "dropped" aesthetic.
3. The user selects a photo item on the canvas by clicking it.
4. When selected, the item shows:
   - A floating **toolbar** above the item: Zoom In, Zoom Out, Bring to Front, Send Backward, Remove.
   - A **rotation handle** below the item center for click-drag rotation.
   - A **selection outline** around the item.
5. The user drags the photo body to reposition it.
6. The user drags the rotation handle to rotate (with magnetic snap to 10° increments; hold Shift to lock to snap).
7. The user uses Zoom In/Out to scale the photo.
8. Clicking anywhere on the canvas background deselects all items.

**Business Rules:**
- Photo items are rendered as Polaroid-style cards: image + uniform white border + drop shadow.
- Scale bounds: minimum 0.3×, maximum 4.0×.
- Rotation: unconstrained (0–360°, wrapping).
- Z-order: each new photo is placed on top. "Bring to Front" promotes to `maxZIndex + 1`. "Send Backward" decrements by 1, floored at 1.
- A photo may be added to the canvas multiple times from the library (each instance is an independent item with its own transform).
- Items may be dragged partially outside the canvas boundary during editing, but are clipped by the frame border in the export.
- Canvas supports a minimum of 50 simultaneous photo items without performance degradation.

---

### 2.5 Export / Download

**Objective:** Render the current frame composition to a high-resolution PNG and trigger a browser download.

**User Flow:**
1. User clicks the "Save" / Export button.
2. The system renders the composition to an offscreen `<canvas>` element.
3. The canvas is encoded as a PNG data URL.
4. A download is triggered with a descriptive filename.
5. A brief success toast notification is shown.

**Business Rules:**
- Export is performed entirely client-side; no server round-trip.
- Export resolution: **2×** the logical frame dimensions (e.g., a 600×600 logical frame exports at 1200×1200px). V2 should support a user-selectable multiplier: 1×, 2×, 3×.
- All photo transforms (position, rotation, scale) applied in the editor must be faithfully reproduced in the export.
- Export clipping: any part of a photo item that falls outside the frame boundary is clipped in the output.
- The export renderer must **not** rely on querying the live DOM for image data. All image data must be sourced from in-memory `HTMLImageElement` objects managed by the application state.
- Strip frame: decorative label text uses the user-configured string and is rendered in a legible, styled font.
- Canvas frame: Polaroid borders and drop shadows are reproduced in the export.
- Filename convention: `travel-log-{frameType}-{YYYYMMDD}.png`.
- Export of an empty frame (no photos placed) is blocked; the Save button is disabled with a tooltip explaining the reason.

---

### 2.6 Session Management & Undo/Redo

**Objective:** Protect the user from accidental data loss and support iterative editing.

**User Flow:**
- The user can undo any placement, removal, or transform action via `Ctrl/Cmd+Z`.
- The user can redo via `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`.
- A "Clear All" action removes all placed photos from the active frame, with an undo step.

**Business Rules:**
- Undo/redo history depth: minimum 50 steps per frame type.
- History is maintained per frame type independently.
- Photo library changes (import/delete) are not part of the undo stack (they are persistent within the session).
- The session state (library + all frame arrangements) must be durably persisted to a client-side storage mechanism on every state change to survive accidental page refreshes. On reload, the system offers to restore the previous session. The storage mechanism must operate entirely within the browser with no network transmission.

---

## 3. Data Architecture & Entities

All entities are client-side, in-memory. No server persistence in V2.

### 3.1 `PhotoAsset`
Represents a source image imported by the user.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Stable unique identifier for the session. |
| `filename` | `string` | Original filename (sanitized). |
| `localRef` | `opaque` | A runtime-managed, client-side reference to the binary image data. This reference must be valid for the duration of the session and must be explicitly released when the asset is removed or the session ends, to prevent memory leaks. The implementation detail of how this reference is represented (e.g., an in-memory handle, a blob key) is an implementation concern. |
| `naturalWidth` | `number` | Intrinsic pixel width. |
| `naturalHeight` | `number` | Intrinsic pixel height. |
| `sizeBytes` | `number` | File size, for display. |
| `importedAt` | `number` | Unix timestamp ms. |

### 3.2 `Frame`
Represents one named frame template configuration.

| Field | Type | Description |
|---|---|---|
| `id` | `FrameType` | Enum: `strip` \| `square` \| `portrait` \| `landscape`. |
| `color` | `FrameColor` | `dark` \| `light`. |
| `logicalWidth` | `number` | Logical pixel width before display scaling. |
| `logicalHeight` | `number` | Logical pixel height. |

### 3.3 `StripSlot`
One slot within a strip frame.

| Field | Type | Description |
|---|---|---|
| `index` | `number` | 0-based position in the strip. |
| `photoId` | `string \| null` | ID of the occupying `PhotoAsset`, or `null` if empty. |
| `aspectRatio` | `number` | `width / height` ratio for this slot. |

### 3.4 `CanvasItem`
One photo item placed on a canvas frame.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique identifier for this placement instance. |
| `photoId` | `string` | FK → `PhotoAsset.id`. |
| `x` | `number` | Left edge position in logical frame coordinates. |
| `y` | `number` | Top edge position in logical frame coordinates. |
| `width` | `number` | Rendered width in logical px (before scale transform). |
| `rotation` | `number` | Rotation angle in degrees (clockwise). |
| `scale` | `number` | Uniform scale factor. |
| `zIndex` | `number` | Render order (higher = on top). |

### 3.5 `SessionState`
Top-level state container. Must be persistable to and restorable from a client-side durable storage mechanism.

| Field | Type | Description |
|---|---|---|
| `library` | `PhotoAsset[]` | All imported photos. |
| `activeFrameType` | `FrameType` | Currently displayed frame. |
| `frameColor` | `FrameColor` | Active color theme. |
| `stripState` | `{ slots: StripSlot[], labelText: string, slotCount: number }` | Strip frame state. |
| `canvasStates` | `Record<CanvasFrameType, CanvasItem[]>` | Canvas state per canvas frame type. |
| `undoStacks` | `Record<FrameType, HistoryEntry[]>` | Per-frame undo history. |

### Entity Relationships
```
SessionState
  ├── library: PhotoAsset[]
  ├── stripState → StripSlot[] → photoId → PhotoAsset.id
  └── canvasStates → CanvasItem[] → photoId → PhotoAsset.id
```

---

## 4. API & Interface Specifications

V2 is a fully client-side SPA. There are no external HTTP APIs. This section defines the internal module interface contracts.

### 4.1 PhotoLibrary Module

```typescript
interface PhotoLibraryService {
  // Import files from a FileList (e.g., from <input type="file"> or drop event)
  importFiles(files: FileList): Promise<ImportResult>;
  // Remove a photo from the library (and from all frames)
  removePhoto(photoId: string): void;
  // Get all photos
  getAll(): PhotoAsset[];
  // Check if a photo is used in the currently active frame
  isUsed(photoId: string): boolean;
}

interface ImportResult {
  imported: PhotoAsset[];  // Successfully imported assets
  rejected: { filename: string; reason: string }[];  // Failed imports with reasons
}
```

### 4.2 Frame State Module

```typescript
interface FrameStateService {
  // Get current strip state
  getStripState(): StripState;
  // Place a photo into the next available strip slot
  placeInStrip(photoId: string): void;
  // Place a photo into a specific strip slot
  placeInStripSlot(slotIndex: number, photoId: string): void;
  // Remove photo from strip slot
  clearStripSlot(slotIndex: number): void;
  // Reorder strip slots
  swapStripSlots(fromIndex: number, toIndex: number): void;
  // Update strip label text
  setStripLabel(text: string): void;

  // Get canvas items for a given frame type
  getCanvasItems(frameType: CanvasFrameType): CanvasItem[];
  // Add a new canvas item
  addCanvasItem(frameType: CanvasFrameType, photoId: string): CanvasItem;
  // Update transform properties of an existing item
  updateCanvasItem(frameType: CanvasFrameType, itemId: string, props: Partial<CanvasItemTransform>): void;
  // Remove a canvas item
  removeCanvasItem(frameType: CanvasFrameType, itemId: string): void;
  // Clear all items from a frame
  clearFrame(frameType: FrameType): void;
}

interface CanvasItemTransform {
  x: number; y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}
```

### 4.3 Export Module

```typescript
interface ExportService {
  // Render and download the active frame
  export(options: ExportOptions): Promise<void>;
}

interface ExportOptions {
  frameType: FrameType;
  frameColor: FrameColor;
  scaleFactor: 1 | 2 | 3;  // Pixel density multiplier
  stripState?: StripState;
  canvasItems?: CanvasItem[];
  resolvedPhotos: ResolvedPhotoCache;  // Opaque, pre-resolved image data keyed by PhotoAsset.id; implementation chooses the appropriate in-memory structure
}
```

### 4.4 Interaction Events (UI → State)

| User Action | Event | State Mutation |
|---|---|---|
| Click photo in library (strip) | `library:select` | `placeInStrip(photoId)` |
| Click photo in library (canvas) | `library:select` | `addCanvasItem(frameType, photoId)` |
| Drag canvas item | `item:dragEnd` | `updateCanvasItem(..., {x, y})` |
| Drag rotate handle | `item:rotate` | `updateCanvasItem(..., {rotation})` |
| Toolbar: Zoom In/Out | `toolbar:scale` | `updateCanvasItem(..., {scale})` |
| Toolbar: Bring to Front | `toolbar:bringToFront` | `updateCanvasItem(..., {zIndex})` |
| Toolbar: Send Backward | `toolbar:sendBackward` | `updateCanvasItem(..., {zIndex})` |
| Toolbar: Remove | `toolbar:remove` | `removeCanvasItem(...)` |
| Click strip slot (occupied) | `strip:slotClick` | `clearStripSlot(index)` |
| Drag strip slot onto another | `strip:slotDrop` | `swapStripSlots(from, to)` |
| Click "Clear All" | `frame:clear` | `clearFrame(activeFrameType)` |
| Click "Save" | `frame:export` | `ExportService.export(...)` |
| `Ctrl+Z` | `history:undo` | Pop undo stack, restore previous state |
| `Ctrl+Shift+Z` | `history:redo` | Pop redo stack, re-apply state |

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **Initial Load Time:** Time to Interactive (TTI) < 2 seconds on a broadband connection. Photos are never bundled into the application; they are loaded from user's local disk at runtime.
- **Photo Rendering:** Thumbnail images in the library panel must use responsive `srcset` or canvas-generated thumbnails capped at 200px wide to avoid loading high-resolution data for display purposes.
- **Canvas Interaction:** Drag, rotate, and scale operations must maintain ≥ 60 fps on a mid-range device. Transform state updates should be applied via CSS transforms (not re-render triggers) during active gestures; state is committed to the store only on gesture end.
- **Export Rendering:** Export of a canvas with 20 photo items at 2× scale must complete in < 3 seconds.
- **Photo Library:** The library panel must render smoothly with up to 500 photos without blocking the main thread or creating an excessive number of active DOM nodes. The implementation must ensure that scrolling through the full library remains fluid and that initial render time does not scale linearly with library size.

### 5.2 Scalability

- V2 is a fully client-side SPA; there is no server to scale. However, the architecture must allow a future V3 backend integration (e.g., user accounts, cloud storage, sharing) without requiring a full rewrite.
- The state management module must be fully decoupled from the UI rendering layer (no direct DOM manipulation in state logic).
- Frame types and their configurations must be data-driven (a registry pattern), not hardcoded in conditional branches, so new frame types can be added by registering a new config object.

### 5.3 Security

- **No external requests:** The application must not make any network requests during normal operation (except loading fonts from an approved CDN at startup). No photo data leaves the browser.
- **Content Security Policy:** The application must define a strict CSP that blocks inline scripts (except those explicitly nonce-tagged by the build tool) and disallows `eval`.
- **Object URL lifecycle:** `URL.createObjectURL()` URLs created for imported photos must be explicitly revoked (`URL.revokeObjectURL()`) when the corresponding `PhotoAsset` is removed from the library or the page unloads, to prevent memory leaks.
- **Canvas `toDataURL` tainting:** All image sources used in export rendering must be same-origin or have correct CORS headers to prevent `SecurityError`. Since V2 uses only user-imported local files (loaded as Object URLs), this is inherently safe; documentation must forbid the use of external URL strings as image sources in the export pipeline.
- **Input validation:** File type must be validated by inspecting the file's magic bytes (not just the MIME type or filename extension) to prevent malicious file uploads disguised as images.
- **XSS:** Any user-provided text (e.g., the strip label) must be treated as plain text and rendered via text nodes or `textContent`, never inserted via `innerHTML`.

### 5.4 Accessibility

- All interactive controls (buttons, selects, library items) must be keyboard-focusable and operable via keyboard.
- Photo items in the library must have descriptive `alt` text derived from filenames.
- The application must pass WCAG 2.1 AA color contrast requirements for all text elements.
- Focus management: when a photo toolbar appears, focus should move to the first toolbar button; when dismissed, focus returns to the triggering element.
- Drag-and-drop interactions must have keyboard equivalents (e.g., arrow keys to nudge selected canvas items; bracket keys to rotate).

### 5.5 Responsive Design

- **Desktop (≥ 1024px):** Full two-panel layout (sidebar library + workspace). Frame displayed at logical size.
- **Tablet (768px–1023px):** Library panel collapses to a bottom sheet / drawer. Workspace takes full width. Frame scales to fit available width.
- **Mobile (< 768px):** Library is a horizontally scrollable bottom tray. Frame always scaled to fit viewport width minus padding. Controls bar compacts to icon-only buttons with tooltips.
- **Display Scaling:** The frame's logical dimensions are always maintained as the export target. When the available display area is narrower than the frame's logical width, the frame must be scaled down to fit while preserving its aspect ratio, such that no horizontal scrolling is required and no content is clipped in the viewport. The display scale must be recalculated dynamically whenever the workspace dimensions change. The export output is always produced at the full logical resolution, regardless of the current display scale.

### 5.6 Browser Compatibility

- Target: Latest two major versions of Chrome, Firefox, Safari, Edge.
- Required APIs: `File API`, `URL.createObjectURL`, `Canvas 2D API`, `ResizeObserver`, `PointerEvents`, `CSS Custom Properties`.
- No IE11 support required.

---

## 6. Edge Cases & Error Handling

### 6.1 Photo Import Failures

| Scenario | System Response |
|---|---|
| File exceeds 20 MB | Display per-file error in a results summary toast. Other valid files in the batch proceed normally. |
| Unsupported file format (magic bytes mismatch) | Rejected with message: "Unsupported file format." |
| HEIC file without browser native support | Attempt client-side HEIC→JPEG conversion; on failure, display a specific "HEIC not supported in this browser" message with a suggestion to convert first. |
| Duplicate photo (same filename & size) | Warn the user and offer to skip or import as a new copy. |
| 500-photo limit reached | Block import of excess files and display count of rejected files. |
| `FileReader` error (e.g., file permission revoked) | Display a generic "Could not read file" error for the affected file. |

### 6.2 Canvas Export Failures

| Scenario | System Response |
|---|---|
| Canvas is tainted (cross-origin image source) | Should be architecturally impossible in V2, as all image data is sourced from user-imported local files held in client-side memory. If nevertheless encountered, display: "Export failed: image source error" and log details to the browser console. |
| `toDataURL` returns empty or null | Display: "Export failed. Please try again." Do not crash the application. |
| Browser blocks download (popup blocker) | Fallback: Open the PNG in a new browser tab with instructions to long-press/right-click to save. |
| Out of memory during high-resolution export | Catch the error, display: "Export at this resolution failed. Try a lower resolution." Offer 1× fallback. |

### 6.3 State & Session Failures

| Scenario | System Response |
|---|---|
| Client-side storage unavailable or quota exceeded | Silently skip session persistence; in-memory state remains fully functional. Log a warning. Do not interrupt the user's active session. |
| Corrupted session data on restore | Discard corrupted data, start a fresh session, and notify the user. |
| A resolved photo reference becomes invalid before export | Show a placeholder in the export canvas for that item and display a warning after export: "One or more photos could not be rendered." |
| User navigates away with unsaved changes | Show a native browser confirmation dialog: "Your composition will be lost." |

### 6.4 Interaction Edge Cases

| Scenario | System Response |
|---|---|
| Rotate gesture crosses 0°/360° boundary | Normalize angle to `[0, 360)` range; no visual jump. |
| Photo dragged entirely outside canvas bounds | Constrain the item so that at least 20px of it remains within the frame bounds after drag-end. |
| Rapid repeated photo additions (stress) | Debounce photo add events at 100ms. Each item still receives a unique ID. |
| Strip slot drag-and-drop: drop onto same slot | No-op; state unchanged. |
| Undo stack empty | "Undo" button is disabled; keyboard shortcut is silently ignored. |
| All photos removed from library while canvas has items | Canvas items remain until explicitly removed. Library shows an empty state with an import prompt. |
| Orientation change on mobile mid-session | `ResizeObserver` triggers scale recalculation; frame rescales within ~16ms. Layout reflows without clearing state. |
