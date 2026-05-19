import { ExportOptions, FrameColor, CanvasItem } from '@/types';

export class ExportService {
  /**
   * Renders the current frame configuration to an offscreen canvas and triggers download.
   */
  static async export(options: ExportOptions, frameLogicalWidth: number, frameLogicalHeight: number): Promise<void> {
    const { frameType, frameColor, scaleFactor, resolvedPhotos } = options;
    
    const exportWidth = frameLogicalWidth * scaleFactor;
    const exportHeight = frameLogicalHeight * scaleFactor;

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    // Draw background
    ctx.fillStyle = frameColor === 'dark' ? '#18181b' : '#ffffff';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    if (frameType === 'strip') {
      if (!options.stripState) throw new Error('Strip state missing for export');
      this.drawStripFrame(ctx, options.stripState, exportWidth, exportHeight, scaleFactor, resolvedPhotos, frameColor);
    } else {
      if (!options.canvasItems) throw new Error('Canvas items missing for export');
      this.drawCanvasFrame(ctx, options.canvasItems, scaleFactor, resolvedPhotos);
    }

    // Convert to Data URL and Trigger Download
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').split('T')[0];
      const filename = `travel-log-${frameType}-${timestamp}.png`;
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      throw new Error('Export failed. Canvas tainted or too large.');
    }
  }

  private static drawStripFrame(
    ctx: CanvasRenderingContext2D, 
    stripState: Exclude<ExportOptions['stripState'], undefined>, 
    width: number, 
    height: number, 
    scale: number, 
    images: Record<string, HTMLImageElement>,
    frameColor: FrameColor
  ) {
    const PADDING = 25 * scale;
    const LABEL_SPACE = 80 * scale;
    
    const availableHeightForSlots = height - (PADDING * 2) - LABEL_SPACE;
    const slotCount = stripState.slotCount;
    // Assuming uniform aspect ratio for all slots in this calculation, typically 3:2.
    // We compute available width and height.
    const gap = 10 * scale;
    
    const contentWidth = width - (PADDING * 2);
    
    // Each slot gets a fraction of available height
    const slotHeight = (availableHeightForSlots - (gap * (slotCount - 1))) / slotCount;
    
    stripState.slots.forEach((slot, index) => {
      const y = PADDING + (index * (slotHeight + gap));
      const x = PADDING;
      
      if (slot.photoId && images[slot.photoId]) {
        const img = images[slot.photoId];
        this.drawImageCover(ctx, img, x, y, contentWidth, slotHeight);
      } else {
         // Empty slot
         ctx.fillStyle = frameColor === 'dark' ? '#27272a' : '#f4f4f5';
         ctx.fillRect(x, y, contentWidth, slotHeight);
      }
    });

    // Draw Label Text
    ctx.fillStyle = frameColor === 'dark' ? '#ffffff' : '#18181b';
    ctx.font = `${24 * scale}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stripState.labelText, width / 2, height - PADDING - (LABEL_SPACE / 2));
  }

  private static drawCanvasFrame(
    ctx: CanvasRenderingContext2D, 
    items: CanvasItem[], 
    scale: number, 
    images: Record<string, HTMLImageElement>
  ) {
    // Sort items by zIndex
    const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);

    for (const item of sortedItems) {
      if (!images[item.photoId]) continue;
      const img = images[item.photoId];

      ctx.save();
      
      const cx = (item.x + (item.width / 2)) * scale;
      const cy = (item.y + ((item.width * (img.naturalHeight / img.naturalWidth)) / 2)) * scale;
      
      ctx.translate(cx, cy);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.scale, item.scale);
      
      const renderW = item.width * scale;
      const renderH = renderW * (img.naturalHeight / img.naturalWidth);
      
      // Draw Polaroid Border & Drop Shadow
      const border = 10 * scale;
      const shadowBlur = 15 * scale;
      
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = 5 * scale;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-renderW/2 - border, -renderH/2 - border, renderW + border*2, renderH + border*2); // Removed extra bottom space
      
      // Reset shadow for image
      ctx.shadowColor = 'transparent';
      ctx.drawImage(img, -renderW/2, -renderH/2, renderW, renderH);
      
      ctx.restore();
    }
  }

  private static drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const slotRatio = w / h;
    let sWidth = img.naturalWidth;
    let sHeight = img.naturalHeight;
    let sx = 0;
    let sy = 0;

    if (imgRatio > slotRatio) {
      sWidth = sHeight * slotRatio;
      sx = (img.naturalWidth - sWidth) / 2;
    } else {
      sHeight = sWidth / slotRatio;
      sy = (img.naturalHeight - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  }
}
