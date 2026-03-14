import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import WebApp from '@twa-dev/sdk';
import { Pencil, PaintBucket, Pipette, Eraser, Ruler, FlipHorizontal, Undo, Redo, Trash, Layers as LayersIcon, Download, Eye, EyeOff, Plus, Circle, Square, MousePointer2, Triangle, Pentagon, Hexagon, Octagon, Star, ArrowRight, Diamond, RectangleHorizontal, Copy, Scissors, ClipboardPaste, Trash2, CopyPlus, FlipVertical, RotateCw, RotateCcw, Check, Type, Save, FolderOpen, Palette, Image as ImageIcon, ChevronDown, X } from 'lucide-react';
import PixelChunk, { type Layer } from './PixelChunk';
import { HistoryManager, SelectionManager } from './history';

const SIZES = [8, 16, 32, 64, 128, 256, 512, 1024, 2048];

const TOOLS = [
  { id: 'pencil', icon: Pencil, label: 'Draw' },
  { id: 'bucket', icon: PaintBucket, label: 'Fill' },
  { id: 'eyedropper', icon: Pipette, label: 'Pick' },
  { id: 'eraser', icon: Eraser, label: 'Erase' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'line', icon: Ruler, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rect' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
  { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
  { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { id: 'octagon', icon: Octagon, label: 'Octagon' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'parallelogram', icon: RectangleHorizontal, label: 'Parallelogram' },
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'symmetry', icon: FlipHorizontal, label: 'Mirror' }
];

const SHAPE_TOOLS = ['rect', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'arrow', 'parallelogram'];

const actionBtn = { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

let clipboardPixels: {x: number, y: number, color: number[]}[] = [];

const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};
const PALETTES = Array.from({length: 52}, (_, i) => {
    const h = (i * 137.5) % 360;
    return {
        name: `Theme ${i+1}`,
        colors: [
            hslToHex(h, 80, 15), hslToHex(h, 80, 40), hslToHex(h, 80, 65), hslToHex(h, 80, 90),
            hslToHex((h+45)%360, 70, 50), hslToHex((h+180)%360, 70, 50), '#000000', '#ffffff'
        ]
    }
});

function CameraController({ targetPos, targetZoom }: any) {
  useFrame((state) => {
    state.camera.position.lerp(new THREE.Vector3(targetPos.current.x, targetPos.current.y, 100), 0.2);
    // @ts-ignore
    state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, targetZoom.current, 0.2);
    state.camera.updateProjectionMatrix();
  });
  return null;
}

function ShapePreview() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [visible, setVisible] = useState(false);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const handlePreview = (e: Event) => {
      const { visible, points, color } = (e as CustomEvent).detail;
      if (!visible) {
        setVisible(false);
        return;
      }
      setVisible(true);
      if (meshRef.current && points) {
        meshRef.current.count = points.length;
        points.forEach((p: {x: number, y: number}, i: number) => {
          dummy.position.set(p.x + 0.5, p.y + 0.5, 0.5);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        // @ts-ignore
        meshRef.current.material.color.set(color);
      }
    };
    window.addEventListener('shapePreview', handlePreview);
    return () => window.removeEventListener('shapePreview', handlePreview);
  }, [dummy]);

  return (
    // @ts-ignore
    <instancedMesh ref={meshRef} args={[undefined, undefined, 20000]} visible={visible} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial depthTest={false} transparent opacity={0.6} />
    </instancedMesh>
  );
}

function SelectionOverlay() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
     const update = () => setTick(t => t + 1);
     window.addEventListener('selectionUpdate', update);
     return () => window.removeEventListener('selectionUpdate', update);
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
     if (SelectionManager.isFloating && meshRef.current) {
         const pixels = SelectionManager.floatingPixels;
         meshRef.current.count = pixels.length;
         pixels.forEach((p, i) => {
             dummy.position.set(p.x + SelectionManager.offsetX + 0.5, p.y + SelectionManager.offsetY + 0.5, 0.6);
             dummy.updateMatrix();
             meshRef.current!.setMatrixAt(i, dummy.matrix);
             tempColor.setRGB(p.color[0]/255, p.color[1]/255, p.color[2]/255);
             meshRef.current!.setColorAt(i, tempColor);
         });
         meshRef.current.instanceMatrix.needsUpdate = true;
         if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
     }
  });

  const b = SelectionManager.getBounds();
  const bx = b.minX + SelectionManager.offsetX;
  const by = b.minY + SelectionManager.offsetY;
  const bw = Math.max(1, b.maxX - b.minX + 1);
  const bh = Math.max(1, b.maxY - b.minY + 1);

  return (
     <group>
        {(SelectionManager.isSelecting || SelectionManager.isFloating) && (
            <mesh position={[bx + bw/2, by + bh/2, 0.7]}>
               <planeGeometry args={[bw, bh]} />
               <meshBasicMaterial color="#00FFCC" transparent opacity={0.3} depthTest={false} />
            </mesh>
        )}
        {/* @ts-ignore */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, 30000]} visible={SelectionManager.isFloating} frustumCulled={false} renderOrder={1000}>
           <planeGeometry args={[1, 1]} />
           <meshBasicMaterial depthTest={false} transparent />
        </instancedMesh>
     </group>
  );
}

export const exportTrigger = { current: null as ((filename: string) => void) | null };

function ExportManager({ canvasSize }: { canvasSize: number }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    exportTrigger.current = (filename: string) => {
      const exportCam = new THREE.OrthographicCamera(
        -canvasSize / 2, canvasSize / 2,
        canvasSize / 2, -canvasSize / 2,
        0.1, 1000
      );
      exportCam.position.set(0, 0, 100);
      exportCam.updateProjectionMatrix();

      const renderTarget = new THREE.WebGLRenderTarget(canvasSize, canvasSize);
      gl.setRenderTarget(renderTarget);
      gl.render(scene, exportCam);

      const buffer = new Uint8Array(canvasSize * canvasSize * 4);
      gl.readRenderTargetPixels(renderTarget, 0, 0, canvasSize, canvasSize, buffer);
      gl.setRenderTarget(null);

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasSize;
      exportCanvas.height = canvasSize;
      const ctx = exportCanvas.getContext('2d')!;
      const imageData = ctx.createImageData(canvasSize, canvasSize);

      for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
          const srcIdx = (y * canvasSize + x) * 4;
          const destIdx = ((canvasSize - 1 - y) * canvasSize + x) * 4;
          imageData.data[destIdx] = buffer[srcIdx];
          imageData.data[destIdx + 1] = buffer[srcIdx + 1];
          imageData.data[destIdx + 2] = buffer[srcIdx + 2];
          imageData.data[destIdx + 3] = buffer[srcIdx + 3];
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const finalCanvas = document.createElement('canvas');
      const finalSize = Math.max(4096, canvasSize); 
      finalCanvas.width = finalSize;
      finalCanvas.height = finalSize;
      const finalCtx = finalCanvas.getContext('2d')!;
      finalCtx.imageSmoothingEnabled = false; 
      finalCtx.drawImage(exportCanvas, 0, 0, canvasSize, canvasSize, 0, 0, finalSize, finalSize);

      finalCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `${filename}.png`;
        const isTMA = WebApp.platform !== 'unknown';
        
        // Smart Download: Prefer native share in Telegram Mobile Webview
        if (isTMA && navigator.share) {
            try {
                const file = new File([blob], fileName, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: fileName });
                    return;
                }
            } catch (e) {
                console.warn("Share API failed", e);
            }
        }

        // Standard Web Download Fallback
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 'image/png');
    };
  }, [gl, scene, canvasSize]);

  return null;
}

export default function App() {
  const [color, setColor] = useState('#00FFCC');
  const [canvasSize, setCanvasSize] = useState(64);
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.2);
  const [gridColor, setGridColor] = useState('#222222'); 
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff'); 
  const [activeTool, setActiveTool] = useState('pencil');
  const [symMode, setSymMode] = useState<'X' | 'Y' | 'XY'>('X');
  const [shapeFill, setShapeFill] = useState(false); 
  
  const [layers, setLayers] = useState<Layer[]>([{ id: 'layer-1', name: 'Background', visible: true, opacity: 1 }]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showPalettePanel, setShowPalettePanel] = useState(false);

  // Custom UI States
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'main'|'grid'|'bg'|null>(null);
  const [tempColorHex, setTempColorHex] = useState('');

  // Modals & Toasts
  const [toasts, setToasts] = useState<{id: number, msg: string}[]>([]);
  const [confirmModal, setConfirmModal] = useState<{title: string, text: string, onConfirm: () => void} | null>(null);
  const [saveModal, setSaveModal] = useState<{type: 'project'|'image', defaultName: string} | null>(null);
  const [saveName, setSaveName] = useState('');

  const [refImage, setRefImage] = useState<string | null>(null);
  const [refOpacity, setRefOpacity] = useState(0.5);

  const [hasSelection, setHasSelection] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);

  const targetPos = useRef({ x: 0, y: 0 });
  const targetZoom = useRef(1);
  const initialPinchDist = useRef<number | null>(null);
  const isPanning = useRef(false);

  const refTex = useMemo(() => refImage ? new THREE.TextureLoader().load(refImage) : null, [refImage]);

  // Announcement System
  const announce = (msg: string) => {
      const id = Date.now();
      setToasts(prev => [...prev, {id, msg}]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    const handleUp = () => HistoryManager.endStroke();
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    const updateSelectState = () => setHasSelection(SelectionManager.isSelecting || SelectionManager.isFloating);
    window.addEventListener('selectionUpdate', updateSelectState);

    if (WebApp.ready && typeof WebApp.ready === 'function') { 
      WebApp.ready(); 
      WebApp.expand(); 
    }

    return () => {
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('selectionUpdate', updateSelectState);
    }
  }, []);

  const resetView = () => {
    targetPos.current = { x: 0, y: 0 };
    targetZoom.current = (window.innerWidth * 0.9) / canvasSize;
  };
  
  useEffect(() => { resetView(); }, [canvasSize]);

  const hexToRgbArr = (hex: string) => {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, 255];
  };

  const handleCommit = () => {
    if (SelectionManager.isFloating) {
        window.dispatchEvent(new CustomEvent('commitSelection', { detail: { targetLayer: activeLayerId } }));
        HistoryManager.endStroke();
        SelectionManager.clear();
        window.dispatchEvent(new CustomEvent('selectionUpdate'));
    }
  };

  const handleSelectAction = (action: string) => {
    if (hasSelection && !SelectionManager.isFloating && action !== 'paste' && action !== 'commit') {
        SelectionManager.isSelecting = false;
        SelectionManager.isFloating = true;
        HistoryManager.startStroke();
        window.dispatchEvent(new CustomEvent('extractSelection', { detail: { targetLayer: activeLayerId } }));
    }

    const pixels = SelectionManager.floatingPixels;

    switch(action) {
        case 'delete':
            setConfirmModal({
                title: 'Delete Selection',
                text: 'Are you sure you want to delete these pixels?',
                onConfirm: () => {
                    SelectionManager.floatingPixels = [];
                    handleCommit(); 
                    announce('Selection deleted');
                }
            });
            break;
        case 'copy':
            clipboardPixels = JSON.parse(JSON.stringify(pixels));
            setHasClipboard(true);
            announce('Selection copied');
            break;
        case 'cut':
            clipboardPixels = JSON.parse(JSON.stringify(pixels));
            setHasClipboard(true);
            SelectionManager.floatingPixels = [];
            handleCommit();
            announce('Selection cut');
            break;
        case 'paste':
            if (clipboardPixels.length > 0) {
                if (SelectionManager.isFloating) handleCommit();
                SelectionManager.isSelecting = false;
                SelectionManager.isFloating = true;
                SelectionManager.floatingPixels = JSON.parse(JSON.stringify(clipboardPixels));
                SelectionManager.offsetX = 0;
                SelectionManager.offsetY = 0;
                window.dispatchEvent(new CustomEvent('selectionUpdate'));
                announce('Pasted from clipboard');
            }
            break;
        case 'duplicate':
            clipboardPixels = JSON.parse(JSON.stringify(pixels));
            setHasClipboard(true);
            handleCommit();
            SelectionManager.isSelecting = false;
            SelectionManager.isFloating = true;
            SelectionManager.floatingPixels = JSON.parse(JSON.stringify(clipboardPixels));
            SelectionManager.offsetX += 5; 
            SelectionManager.offsetY -= 5;
            window.dispatchEvent(new CustomEvent('selectionUpdate'));
            announce('Selection cloned');
            break;
        case 'flipH':
            if (pixels.length > 0) {
                const minX = Math.min(...pixels.map(p => p.x));
                const maxX = Math.max(...pixels.map(p => p.x));
                const cx = (minX + maxX) / 2;
                pixels.forEach(p => p.x = Math.round(cx - (p.x - cx)));
                window.dispatchEvent(new CustomEvent('selectionUpdate'));
                announce('Flipped horizontal');
            }
            break;
        case 'flipV':
            if (pixels.length > 0) {
                const minY = Math.min(...pixels.map(p => p.y));
                const maxY = Math.max(...pixels.map(p => p.y));
                const cy = (minY + maxY) / 2;
                pixels.forEach(p => p.y = Math.round(cy - (p.y - cy)));
                window.dispatchEvent(new CustomEvent('selectionUpdate'));
                announce('Flipped vertical');
            }
            break;
        case 'rotateCW':
            if (pixels.length > 0) {
                const minX = Math.min(...pixels.map(p => p.x));
                const maxX = Math.max(...pixels.map(p => p.x));
                const minY = Math.min(...pixels.map(p => p.y));
                const maxY = Math.max(...pixels.map(p => p.y));
                const cx = (minX + maxX) / 2;
                const cy = (minY + maxY) / 2;
                pixels.forEach(p => {
                    const dx = p.x - cx;
                    const dy = p.y - cy;
                    p.x = Math.round(cx + dy);
                    p.y = Math.round(cy - dx);
                });
                window.dispatchEvent(new CustomEvent('selectionUpdate'));
                announce('Rotated 90° CW');
            }
            break;
        case 'rotateCCW':
            if (pixels.length > 0) {
                const minX = Math.min(...pixels.map(p => p.x));
                const maxX = Math.max(...pixels.map(p => p.x));
                const minY = Math.min(...pixels.map(p => p.y));
                const maxY = Math.max(...pixels.map(p => p.y));
                const cx = (minX + maxX) / 2;
                const cy = (minY + maxY) / 2;
                pixels.forEach(p => {
                    const dx = p.x - cx;
                    const dy = p.y - cy;
                    p.x = Math.round(cx - dy);
                    p.y = Math.round(cy + dx);
                });
                window.dispatchEvent(new CustomEvent('selectionUpdate'));
                announce('Rotated 90° CCW');
            }
            break;
        case 'fill':
            if (pixels.length > 0) {
                const fillColor = hexToRgbArr(color);
                pixels.forEach(p => p.color = fillColor);
                window.dispatchEvent(new CustomEvent('selectionUpdate'));
                announce('Selection filled');
            }
            break;
        case 'commit':
            handleCommit();
            announce('Selection applied');
            break;
    }
  };

  const executeSaveProject = (name: string) => {
    handleCommit(); 
    // @ts-ignore
    window.projectExportBuffer = [];
    window.dispatchEvent(new CustomEvent('gatherChunkData'));
    announce(`Saving project "${name}"...`);

    setTimeout(async () => {
        // @ts-ignore
        const projectData = { canvasSize, chunks: window.projectExportBuffer };
        const blob = new Blob([JSON.stringify(projectData)], { type: "application/json" });
        const fileName = `${name}.pxm`;
        const isTMA = WebApp.platform !== 'unknown';
        
        if (isTMA && navigator.share) {
            try {
                const file = new File([blob], fileName, { type: 'application/json' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: fileName });
                    announce('Project saved successfully');
                    return;
                }
            } catch (e) {
                console.warn("Share API failed", e);
            }
        }

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        announce('Project saved successfully');
    }, 150); 
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const project = JSON.parse(ev.target?.result as string);
        if (project.canvasSize && project.chunks) {
            setCanvasSize(project.canvasSize);
            const newLayers = project.chunks[0].layers.map((l: any, i: number) => ({
                id: l.id, name: `Layer ${i+1}`, visible: true, opacity: 1
            }));
            setLayers(newLayers);
            setActiveLayerId(newLayers[0].id);

            // @ts-ignore
            window.projectImportBuffer = project.chunks;
            setTimeout(() => window.dispatchEvent(new CustomEvent('applyChunkData')), 200);
            announce('Project loaded successfully');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              setRefImage(ev.target?.result as string);
              announce('Reference image loaded');
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const executeExportImage = (name: string) => {
    handleCommit(); 
    const prevGrid = showGrid;
    setShowGrid(false); 
    announce(`Exporting ${name}.png...`);
    setTimeout(() => {
      if (exportTrigger.current) exportTrigger.current(name);
      setShowGrid(prevGrid);
      announce('Image exported successfully');
    }, 100);
  };

  const handleToolChange = (id: string) => {
    if (activeTool === 'select' && id !== 'select') handleCommit();
    setActiveTool(id);
    announce(`${TOOLS.find(t => t.id === id)?.label || id} tool selected`);
  };

  const handleUndo = () => { HistoryManager.undo(); announce('Undo'); };
  const handleRedo = () => { HistoryManager.redo(); announce('Redo'); };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (initialPinchDist.current) {
        const delta = dist - initialPinchDist.current;
        targetZoom.current = Math.max(0.01, targetZoom.current + delta * (targetZoom.current * 0.02));
      }
      initialPinchDist.current = dist;
    }
  };
  const handleTouchEnd = () => { initialPinchDist.current = null; };

  const handleMinimapPan = (e: React.PointerEvent) => {
    if (!isPanning.current && e.type !== 'pointerdown') return;
    isPanning.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = -((e.clientY - rect.top) / rect.height - 0.5);
    targetPos.current = { x: x * canvasSize * 2, y: y * canvasSize * 2 };
  };

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    const nextNum = layers.reduce((max, l) => {
      const match = l.name.match(/Layer (\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1) + 1;
    
    setLayers([{ id: newId, name: `Layer ${nextNum}`, visible: true, opacity: 1 }, ...layers]);
    setActiveLayerId(newId);
    announce(`Added Layer ${nextNum}`);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    const lName = layers.find(l => l.id === id)?.name;
    setConfirmModal({
        title: 'Delete Layer',
        text: `Are you sure you want to delete ${lName}? This cannot be undone.`,
        onConfirm: () => {
            const newLayers = layers.filter(l => l.id !== id);
            setLayers(newLayers);
            if (activeLayerId === id) setActiveLayerId(newLayers[0].id);
            announce(`${lName} deleted`);
        }
    });
  };

  const toggleLayerVis = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const updateLayerOpac = (id: string, opacity: number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, opacity } : l));
  };

  const setCustomColor = (hex: string, target: 'main'|'grid'|'bg') => {
      if (target === 'main') { setColor(hex); handleToolChange('pencil'); }
      if (target === 'grid') setGridColor(hex);
      if (target === 'bg') setCanvasBgColor(hex);
      setColorPickerTarget(null);
  };

  const chunksPerRow = Math.ceil(canvasSize / 256);
  const actualChunkSize = canvasSize < 256 ? canvasSize : 256;

  const chunks = useMemo(() => {
    const grid = [];
    for (let x = 0; x < chunksPerRow; x++) {
      for (let y = 0; y < chunksPerRow; y++) {
        const posX = (x - (chunksPerRow - 1) / 2) * 256;
        const posY = -(y - (chunksPerRow - 1) / 2) * 256;
        grid.push(
          <PixelChunk 
            key={`${canvasSize}-${x}-${y}`} 
            position={[posX, posY, 0]} 
            color={color} 
            chunkSize={actualChunkSize} 
            activeTool={activeTool} 
            symMode={symMode}
            shapeFill={shapeFill}
            layers={layers}
            activeLayerId={activeLayerId}
            onPickColor={(c) => { handleToolChange('pencil'); setColor(c); announce(`Picked color ${c}`); }} 
          />
        );
      }
    }
    return grid;
  }, [color, canvasSize, chunksPerRow, actualChunkSize, activeTool, symMode, shapeFill, layers, activeLayerId]);

  const selectBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, transition: '0.2s' };
  const dividerStyle = { width: '1px', background: '#444', margin: '0 4px', flexShrink: 0 };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0A0A0C', color: '#fff', touchAction: 'none', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui' }} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
      
      {/* Toast Announcements */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
          {toasts.map(t => (
              <div key={t.id} style={{ background: 'rgba(0,255,204,0.9)', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadein 0.2s ease-out' }}>
                  {t.msg}
              </div>
          ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: '300px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                  <Trash2 size={32} color="#ff4444" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{confirmModal.title}</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#aaa' }}>{confirmModal.text}</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button onClick={() => setConfirmModal(null)} style={{ background: 'transparent', border: '1px solid #555', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                      <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} style={{ background: '#ff4444', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                  </div>
              </div>
          </div>
      )}

      {/* Save/Export Modal */}
      {saveModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: '300px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', textAlign: 'center' }}>{saveModal.type === 'project' ? 'Save Project' : 'Export Image'}</h3>
                  <input 
                      autoFocus
                      type="text" 
                      value={saveName} 
                      onChange={(e) => setSaveName(e.target.value)} 
                      placeholder="File name..."
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0A0A0C', border: '1px solid #444', color: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '20px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button onClick={() => setSaveModal(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #555', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                      <button onClick={() => { 
                          if (!saveName.trim()) return;
                          saveModal.type === 'project' ? executeSaveProject(saveName) : executeExportImage(saveName);
                          setSaveModal(null); 
                      }} style={{ flex: 1, background: '#00FFCC', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{saveModal.type === 'project' ? 'Save' : 'Export'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Color Picker Popover */}
      {colorPickerTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setColorPickerTarget(null)}>
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '16px', width: '260px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Choose Color</span>
                      <button onClick={() => setColorPickerTarget(null)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: tempColorHex || '#000', border: '1px solid #444' }} />
                      <input 
                          type="text" 
                          value={tempColorHex} 
                          onChange={(e) => setTempColorHex(e.target.value)}
                          placeholder="#HEXCODE"
                          style={{ flex: 1, background: '#0A0A0C', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '8px', outline: 'none', textTransform: 'uppercase' }}
                      />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {PALETTES[0].colors.map((c, i) => (
                          <div key={i} onClick={() => setTempColorHex(c)} style={{ width: '24px', height: '24px', borderRadius: '4px', background: c, cursor: 'pointer', border: '1px solid #444' }} />
                      ))}
                  </div>
                  <button onClick={() => setCustomColor(tempColorHex, colorPickerTarget)} style={{ width: '100%', background: '#00FFCC', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Apply Color</button>
              </div>
          </div>
      )}

      {/* TOP HUD */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        
        {/* Custom Canvas Size Dropdown */}
        <div style={{ position: 'relative' }}>
            <div onClick={() => setShowSizeDropdown(!showSizeDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15,15,20,0.85)', padding: '8px 12px', borderRadius: '12px', border: '1px solid #222', cursor: 'pointer' }}>
                <span style={{ color: '#00FFCC', fontWeight: 'bold', fontSize: '14px' }}>{canvasSize}px</span>
                <ChevronDown size={14} color="#888" />
            </div>
            {showSizeDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#1A1A24', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {SIZES.map(s => (
                        <button key={s} onClick={() => { setCanvasSize(s); setShowSizeDropdown(false); announce(`Canvas resized to ${s}px`); }} style={{ background: canvasSize === s ? '#2A2A35' : 'transparent', color: canvasSize === s ? '#00FFCC' : '#fff', border: 'none', padding: '10px 20px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>{s}px</button>
                    ))}
                </div>
            )}
        </div>

        <div style={{ display: 'flex', gap: '12px', background: 'rgba(15,15,20,0.85)', padding: '8px 12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={actionBtn}>
             <FolderOpen size={18} />
             <input type="file" accept=".pxm" onChange={handleLoadProject} style={{display: 'none'}} />
          </label>
          <button onClick={() => { setSaveName('MyProject'); setSaveModal({type: 'project', defaultName: 'MyProject'}); }} style={actionBtn}><Save size={18} /></button>
          <div style={dividerStyle} />
          <button onClick={() => { setSaveName('PixelArt'); setSaveModal({type: 'image', defaultName: 'PixelArt'}); }} style={actionBtn}><Download size={18} /></button>
          <button onClick={handleUndo} style={actionBtn}><Undo size={18} /></button>
          <button onClick={handleRedo} style={actionBtn}><Redo size={18} /></button>
          <button onClick={() => setShowLayersPanel(!showLayersPanel)} style={{...actionBtn, color: showLayersPanel ? '#00FFCC' : '#fff'}}><LayersIcon size={18} /></button>
        </div>
      </div>

      {/* Layer Panel */}
      {showLayersPanel && (
        <div style={{ position: 'absolute', top: '60px', right: '10px', zIndex: 20, width: '220px', background: 'rgba(20,20,25,0.95)', border: '1px solid #333', borderRadius: '12px', padding: '10px', backdropFilter: 'blur(10px)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #333' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa' }}>LAYERS</span>
              <button onClick={addLayer} style={{ background: '#00FFCC', color: '#000', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex' }}><Plus size={14} /></button>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {layers.map(layer => (
                 <div key={layer.id} onClick={() => setActiveLayerId(layer.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: activeLayerId === layer.id ? '#2A2A35' : 'transparent', border: `1px solid ${activeLayerId === layer.id ? '#00FFCC' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer' }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleLayerVis(layer.id); }} style={{ background: 'transparent', border: 'none', color: layer.visible ? '#fff' : '#444', cursor: 'pointer', display: 'flex', padding: 0 }}>
                       {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <span style={{ fontSize: '12px', flexGrow: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{layer.name}</span>
                    <input type="range" min="0" max="1" step="0.1" value={layer.opacity} onClick={(e) => e.stopPropagation()} onChange={(e) => updateLayerOpac(layer.id, Number(e.target.value))} style={{ width: '40px', accentColor: '#00FFCC' }} />
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', padding: 0, opacity: layers.length > 1 ? 1 : 0.3 }} disabled={layers.length <= 1}>
                       <Trash size={14} />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Palette Panel */}
      {showPalettePanel && (
        <div style={{ position: 'absolute', bottom: '80px', left: '10px', zIndex: 20, width: '320px', background: 'rgba(20,20,25,0.95)', border: '1px solid #333', borderRadius: '12px', padding: '15px', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', display: 'block', marginBottom: '10px' }}>52 PRESET THEMES</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {PALETTES.map((pal, i) => (
                    <div key={i} style={{ display: 'flex', border: '1px solid #444', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setShowPalettePanel(false)}>
                        {pal.colors.map((c, j) => (
                            <div key={j} onClick={() => { setColor(c); handleToolChange('pencil'); announce(`Color picked from Theme ${i+1}`); }} style={{ width: '16px', height: '16px', background: c }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* LEFT EDGE: Grid, BG, and Ref Image */}
      <div style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(15,15,20,0.85)', padding: '15px 8px', borderRadius: '24px', border: '1px solid #222', alignItems: 'center' }}>
        <button onClick={() => { setShowGrid(!showGrid); announce(`Grid ${!showGrid ? 'enabled' : 'disabled'}`); }} style={{ background: 'transparent', border: 'none', color: showGrid ? '#00FFCC' : '#666', fontSize: '10px', writingMode: 'vertical-rl', fontWeight: 'bold' }}>GRID</button>
        <div onClick={() => { setTempColorHex(gridColor); setColorPickerTarget('grid'); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: gridColor, border: '2px solid #333', cursor: 'pointer' }} />
        <input type="range" min="0.05" max="1" step="0.05" value={gridOpacity} onChange={(e) => setGridOpacity(Number(e.target.value))} style={{ width: '60px', transform: 'rotate(-90deg)', margin: '25px -20px', accentColor: '#00FFCC' }} />
        
        <div style={{ width: '100%', height: '1px', background: '#333' }} />
        
        <span style={{ fontSize: '10px', writingMode: 'vertical-rl', fontWeight: 'bold', color: '#666' }}>BG</span>
        <div onClick={() => { setTempColorHex(canvasBgColor); setColorPickerTarget('bg'); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: canvasBgColor, border: '2px solid #333', cursor: 'pointer' }} />

        <div style={{ width: '100%', height: '1px', background: '#333' }} />
        
        <label style={{ ...actionBtn, flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
             <ImageIcon size={16} color={refImage ? '#00FFCC' : '#666'} />
             <span style={{ fontSize: '9px', fontWeight: 'bold', color: refImage ? '#00FFCC' : '#666' }}>REF</span>
             <input type="file" accept="image/*" onChange={handleRefImage} style={{display: 'none'}} />
        </label>
        {refImage && (
            <input type="range" min="0" max="1" step="0.1" value={refOpacity} onChange={(e) => setRefOpacity(Number(e.target.value))} style={{ width: '60px', transform: 'rotate(-90deg)', margin: '25px -20px', accentColor: '#00FFCC' }} />
        )}
      </div>

      {/* RIGHT EDGE: Minimap */}
      <div style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <div onPointerDown={handleMinimapPan} onPointerMove={handleMinimapPan} onPointerUp={() => isPanning.current = false} onPointerLeave={() => isPanning.current = false} style={{ width: '60px', height: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid #00FFCC', borderRadius: '8px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '25%', border: '1px solid rgba(255,255,255,0.5)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(15,15,20,0.85)', borderRadius: '20px', padding: '5px', border: '1px solid #222' }}>
          <button onClick={() => targetZoom.current *= 1.2} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>+</button>
          <div style={{ height: '60px', width: '2px', background: '#333', margin: '5px auto' }} />
          <button onClick={() => targetZoom.current *= 0.8} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>-</button>
        </div>
      </div>

      {/* Floating Menus */}
      <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(15,15,20,0.9)', padding: '6px 12px', borderRadius: '16px', border: '1px solid #333', backdropFilter: 'blur(10px)', maxWidth: '90%', overflowX: 'auto' }}>
        
        {/* Mirror Tool Controls */}
        {activeTool === 'symmetry' && (
           <>
              <button onClick={() => { setSymMode('X'); announce('Mirror X Mode'); }} style={{ background: symMode === 'X' ? '#00FFCC' : 'transparent', color: symMode === 'X' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Mirror X</button>
              <button onClick={() => { setSymMode('Y'); announce('Mirror Y Mode'); }} style={{ background: symMode === 'Y' ? '#00FFCC' : 'transparent', color: symMode === 'Y' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Mirror Y</button>
              <button onClick={() => { setSymMode('XY'); announce('Quad Mirror Mode'); }} style={{ background: symMode === 'XY' ? '#00FFCC' : 'transparent', color: symMode === 'XY' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Quad (XY)</button>
           </>
        )}

        {/* Shape Tool Controls */}
        {SHAPE_TOOLS.includes(activeTool) && (
           <>
              <button onClick={() => { setShapeFill(false); announce('Outline Mode'); }} style={{ background: !shapeFill ? '#00FFCC' : 'transparent', color: !shapeFill ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Outline</button>
              <button onClick={() => { setShapeFill(true); announce('Fill Mode'); }} style={{ background: shapeFill ? '#00FFCC' : 'transparent', color: shapeFill ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Solid Fill</button>
           </>
        )}

        {/* Powerful Select Tool Controls */}
        {activeTool === 'select' && (
           <>
              <button onClick={() => handleSelectAction('paste')} style={{...selectBtnStyle, opacity: hasClipboard ? 1 : 0.3}} disabled={!hasClipboard}><ClipboardPaste size={14}/> Paste</button>
              {hasSelection && <div style={dividerStyle} />}
              {hasSelection && (
                  <>
                      <button onClick={() => handleSelectAction('copy')} style={selectBtnStyle}><Copy size={14}/> Copy</button>
                      <button onClick={() => handleSelectAction('cut')} style={selectBtnStyle}><Scissors size={14}/> Cut</button>
                      <button onClick={() => handleSelectAction('duplicate')} style={selectBtnStyle}><CopyPlus size={14}/> Clone</button>
                      <button onClick={() => handleSelectAction('delete')} style={{...selectBtnStyle, color: '#ff4444'}}><Trash2 size={14}/> Del</button>
                      <div style={dividerStyle} />
                      <button onClick={() => handleSelectAction('flipH')} style={selectBtnStyle}><FlipHorizontal size={14}/> Flip X</button>
                      <button onClick={() => handleSelectAction('flipV')} style={selectBtnStyle}><FlipVertical size={14}/> Flip Y</button>
                      <button onClick={() => handleSelectAction('rotateCW')} style={selectBtnStyle}><RotateCw size={14}/> 90° CW</button>
                      <button onClick={() => handleSelectAction('rotateCCW')} style={selectBtnStyle}><RotateCcw size={14}/> 90° CCW</button>
                      <div style={dividerStyle} />
                      <button onClick={() => handleSelectAction('fill')} style={selectBtnStyle}><PaintBucket size={14}/> Fill</button>
                      <button onClick={() => handleSelectAction('commit')} style={{...selectBtnStyle, color: '#00FFCC'}}><Check size={14}/> Apply</button>
                  </>
              )}
           </>
        )}
      </div>

      {/* BOTTOM HUD: Labeled Tools */}
      <div style={{ position: 'absolute', bottom: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(15,15,20,0.85)', padding: '10px 15px', borderRadius: '24px', border: '1px solid #222', width: '90%', maxWidth: '800px', overflowX: 'auto' }}>
        
        <button onClick={() => setShowPalettePanel(!showPalettePanel)} style={{ background: 'transparent', border: 'none', color: showPalettePanel ? '#00FFCC' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <Palette size={20} />
            <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Themes</span>
        </button>

        <div style={{ width: '1px', height: '30px', background: '#333', flexShrink: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div onClick={() => { setTempColorHex(color); setColorPickerTarget('main'); }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: color, border: '2px solid #fff', cursor: 'pointer', flexShrink: 0 }} />
          <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>COLOR</span>
        </div>
        
        <div style={{ width: '1px', height: '30px', background: '#333', flexShrink: 0 }} />

        {TOOLS.map(t => (
          <button 
            key={t.id}
            onClick={() => handleToolChange(t.id)} 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: activeTool === t.id ? '#00FFCC' : '#666', cursor: 'pointer', minWidth: '40px', transition: '0.2s', flexShrink: 0 }}
          >
            <t.icon size={20} strokeWidth={activeTool === t.id ? 2.5 : 1.5} />
            <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 3D Canvas */}
      <div 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        onPointerDown={() => HistoryManager.startStroke()}
        onPointerUp={() => HistoryManager.endStroke()}
        onPointerLeave={() => HistoryManager.endStroke()}
      >
        <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 1 }} gl={{ preserveDrawingBuffer: true }}>
          <CameraController targetPos={targetPos} targetZoom={targetZoom} />
          <ExportManager canvasSize={canvasSize} />
          <ShapePreview />
          <SelectionOverlay />
          
          {/* Base Canvas Background Plane */}
          <mesh position={[0, 0, -1]}>
             <planeGeometry args={[canvasSize, canvasSize]} />
             <meshBasicMaterial color={canvasBgColor} />
          </mesh>

          {/* Reference Image Plane */}
          {refImage && refTex && (
             <mesh position={[0, 0, -0.5]}>
                <planeGeometry args={[canvasSize, canvasSize]} />
                {/* @ts-ignore */}
                <meshBasicMaterial map={refTex} transparent opacity={refOpacity} />
             </mesh>
          )}

          {chunks}
          
          {showGrid && (
            <gridHelper key={`${canvasSize}-${gridColor}`} args={[canvasSize, canvasSize, gridColor, gridColor]} position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <lineBasicMaterial attach="material" color={gridColor} transparent opacity={gridOpacity} depthWrite={false} />
            </gridHelper>
          )}
        </Canvas>
      </div>

      <style>{`
         @keyframes fadein { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}