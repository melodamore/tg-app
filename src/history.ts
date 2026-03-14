export type PixelDelta = {
  layerId: string;
  chunkId: string;
  index: number;
  oldColor: number[];
  newColor: number[];
};

export const HistoryManager = {
  undoStack: [] as PixelDelta[][],
  redoStack: [] as PixelDelta[][],
  currentStroke: [] as PixelDelta[],
  modifiedInStroke: new Set<string>(),
  isDrawing: false,

  startStroke() {
    if (this.isDrawing) return;
    this.isDrawing = true;
    this.currentStroke = [];
    this.modifiedInStroke.clear();
  },

  record(layerId: string, chunkId: string, index: number, oldColor: number[], newColor: number[]) {
    if (!this.isDrawing) return;
    if (oldColor[0] === newColor[0] && oldColor[1] === newColor[1] && oldColor[2] === newColor[2] && oldColor[3] === newColor[3]) return;

    const pixelKey = `${layerId}-${chunkId}-${index}`;
    if (this.modifiedInStroke.has(pixelKey)) {
      const existingDelta = this.currentStroke.find(d => d.layerId === layerId && d.chunkId === chunkId && d.index === index);
      if (existingDelta) existingDelta.newColor = newColor;
      return;
    }

    this.modifiedInStroke.add(pixelKey);
    this.currentStroke.push({ layerId, chunkId, index, oldColor, newColor });
  },

  endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length > 0) {
      this.undoStack.push([...this.currentStroke]);
      this.redoStack = []; 
    }
    this.currentStroke = [];
    this.modifiedInStroke.clear();
  },

  undo() {
    if (this.isDrawing) this.endStroke(); 
    const stroke = this.undoStack.pop();
    if (!stroke) return;
    this.redoStack.push(stroke);
    window.dispatchEvent(new CustomEvent('historyApply', { detail: { stroke, isUndo: true } }));
  },

  redo() {
    if (this.isDrawing) this.endStroke();
    const stroke = this.redoStack.pop();
    if (!stroke) return;
    this.undoStack.push(stroke);
    window.dispatchEvent(new CustomEvent('historyApply', { detail: { stroke, isUndo: false } }));
  }
};

export const LineManager = {
  startX: null as number | null,
  startY: null as number | null
};

// NEW: Handles Floating Pixel Selections
export const SelectionManager = {
  isSelecting: false,
  isFloating: false,
  startX: 0, startY: 0,
  endX: 0, endY: 0,
  offsetX: 0, offsetY: 0,
  floatingPixels: [] as {x: number, y: number, color: number[]}[],

  getBounds() {
    return {
      minX: Math.min(this.startX, this.endX),
      maxX: Math.max(this.startX, this.endX),
      minY: Math.min(this.startY, this.endY),
      maxY: Math.max(this.startY, this.endY),
    };
  },
  
  clear() {
     this.isSelecting = false;
     this.isFloating = false;
     this.floatingPixels = [];
     this.offsetX = 0; 
     this.offsetY = 0;
  }
};