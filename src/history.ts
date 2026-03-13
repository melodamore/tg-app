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
  modifiedInStroke: new Set<string>(),
  isDrawing: false,

  startStroke() {
    if (this.isDrawing) return;
    this.isDrawing = true;
    this.currentStroke = [];
    this.modifiedInStroke.clear();
  },

  record(chunkId: string, index: number, oldColor: number[], newColor: number[]) {
    if (!this.isDrawing) return;

    if (oldColor[0] === newColor[0] && oldColor[1] === newColor[1] && oldColor[2] === newColor[2] && oldColor[3] === newColor[3]) return;

    const pixelKey = `${chunkId}-${index}`;
    
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