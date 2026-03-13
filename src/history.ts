export type PixelDelta = {
  chunkId: string;
  index: number;
  oldColor: number[];
  newColor: number[];
};

export const HistoryManager = {
  undoStack: [] as PixelDelta[][],
  redoStack: [] as PixelDelta[][],
  currentStroke: [] as PixelDelta[],
  modifiedInStroke: new Set<string>(), // Tracks unique pixels per stroke
  isDrawing: false,

  startStroke() {
    if (this.isDrawing) return;
    this.isDrawing = true;
    this.currentStroke = [];
    this.modifiedInStroke.clear();
  },

  record(chunkId: string, index: number, oldColor: number[], newColor: number[]) {
    if (!this.isDrawing) return;

    // Skip if visually identical
    if (oldColor[0] === newColor[0] && oldColor[1] === newColor[1] && oldColor[2] === newColor[2] && oldColor[3] === newColor[3]) return;

    const pixelKey = `${chunkId}-${index}`;
    
    // DEDUPLICATION: If we already altered this pixel in this stroke, update the newColor but keep the true oldColor.
    if (this.modifiedInStroke.has(pixelKey)) {
      const existingDelta = this.currentStroke.find(d => d.chunkId === chunkId && d.index === index);
      if (existingDelta) existingDelta.newColor = newColor;
      return;
    }

    this.modifiedInStroke.add(pixelKey);
    this.currentStroke.push({ chunkId, index, oldColor, newColor });
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
    if (this.isDrawing) this.endStroke(); // Prevent mid-stroke bugs
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