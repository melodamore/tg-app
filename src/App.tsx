import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import WebApp from '@twa-dev/sdk';
import { ImageIcon, Cuboid } from 'lucide-react';

import PixelChunk, { type Layer } from './components/webgl/PixelChunk';
import { VoxelChunk } from './components/webgl/VoxelChunk';
import { HistoryManager, SelectionManager } from './store/history';
import { TOOLS } from './constants/tools';
import { hexToRgbArr } from './utils/colors';

import { BottomNav } from './components/ui/BottomNav';
import { Toast } from './components/ui/Toast';
import { ConfirmModal, SaveModal } from './components/ui/Modals';
import { ColorPicker } from './components/ui/ColorPicker';
import { TopHUD, FloatingMenu, BottomHUD } from './components/editor/Toolbar';
import { LayersPanel, PalettePanel } from './components/editor/LayersPanel';

import { OrthographicCameraController, PerspectiveOrbitController } from './components/webgl/Cameras';
import { ShapePreview, SelectionOverlay } from './components/webgl/Overlays';
import { ExportManager, exportTrigger } from './components/webgl/Exporter';

import { HomeView } from './views/HomeView';
import { CurateView } from './views/CurateView';
import { GameView } from './views/GameView';
import { ProfileView } from './views/ProfileView';
import { StudioView } from './views/StudioView';

let clipboardPixels: {x: number, y: number, color: number[]}[] = [];

export default function App() {
  const [appTab, setAppTab] = useState<'home'|'curate'|'studio'|'game'|'profile'>('home');
  
  // Studio State
  const [workspaceMode, setWorkspaceMode] = useState<'2d'|'3d'>('2d');
  const [color, setColor] = useState('#00FFCC');
  const [canvasSize, setCanvasSize] = useState(64);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true); 
  const [gridOpacity, setGridOpacity] = useState(0.2);
  const [gridColor, setGridColor] = useState('#222222'); 
  const [canvasBgColor, setCanvasBgColor] = useState('#0A0A0C'); 
  const [activeTool, setActiveTool] = useState('pencil');
  const [symMode, setSymMode] = useState<'X' | 'Y' | 'XY'>('X');
  const [shapeFill, setShapeFill] = useState(false); 
  
  const [layers, setLayers] = useState<Layer[]>([{ id: 'layer-1', name: 'Background', visible: true, opacity: 1 }]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showPalettePanel, setShowPalettePanel] = useState(false);

  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'main'|'grid'|'bg'|null>(null);
  const [tempColorHex, setTempColorHex] = useState('');

  const [toasts, setToasts] = useState<{id: number, msg: string}[]>([]);
  const [confirmModal, setConfirmModal] = useState<{title: string, text: string, onConfirm: () => void} | null>(null);
  const [saveModal, setSaveModal] = useState<{type: 'project'|'image', defaultName: string, fallbackUrl?: string} | null>(null);
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
      WebApp.setHeaderColor('#0A0A0C');
      WebApp.setBackgroundColor('#0A0A0C');
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

        if (isTMA) {
            const url = URL.createObjectURL(blob);
            setSaveModal({ type: 'project', defaultName: fileName, fallbackUrl: url });
            return;
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
    if (appTab !== 'studio') return;
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

  const activeToolList = workspaceMode === '3d' ? TOOLS.filter(t => ['pencil', 'eraser', 'eyedropper'].includes(t.id)) : TOOLS;

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0A0A0C', color: '#fff', touchAction: 'none', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui' }} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
      
      <Toast toasts={toasts} />
      <ConfirmModal modal={confirmModal} onClose={() => setConfirmModal(null)} />
      <SaveModal modal={saveModal} saveName={saveName} setSaveName={setSaveName} onClose={() => setSaveModal(null)} onSave={(name) => saveModal?.type === 'project' ? executeSaveProject(name) : executeExportImage(name)} />
      <ColorPicker target={colorPickerTarget} tempColorHex={tempColorHex} setTempColorHex={setTempColorHex} onClose={() => setColorPickerTarget(null)} onApply={setCustomColor} />

      <HomeView visible={appTab === 'home'} onNavigate={setAppTab} />
      <CurateView visible={appTab === 'curate'} />
      <GameView visible={appTab === 'game'} />
      <ProfileView visible={appTab === 'profile'} />

      <StudioView visible={appTab === 'studio'}>
          <TopHUD
            canvasSize={canvasSize} showSizeDropdown={showSizeDropdown} setShowSizeDropdown={setShowSizeDropdown} setCanvasSize={setCanvasSize}
            announce={announce} handleLoadProject={handleLoadProject} setSaveName={setSaveName} setSaveModal={setSaveModal}
            workspaceMode={workspaceMode} handleUndo={handleUndo} handleRedo={handleRedo}
            showLayersPanel={showLayersPanel} setShowLayersPanel={setShowLayersPanel}
          />

          <LayersPanel
            showLayersPanel={showLayersPanel} workspaceMode={workspaceMode} layers={layers}
            activeLayerId={activeLayerId} setActiveLayerId={setActiveLayerId}
            addLayer={addLayer} toggleLayerVis={toggleLayerVis} updateLayerOpac={updateLayerOpac} removeLayer={removeLayer}
          />
          <PalettePanel
            showPalettePanel={showPalettePanel} setShowPalettePanel={setShowPalettePanel}
            setColor={setColor} handleToolChange={handleToolChange} announce={announce}
          />

          {/* LEFT EDGE: Grid, BG, and Ref Image */}
          <div style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(15,15,20,0.85)', padding: '15px 8px', borderRadius: '24px', border: '1px solid #222', alignItems: 'center' }}>
            <button onClick={() => { setShowGrid(!showGrid); announce(`Grid ${!showGrid ? 'enabled' : 'disabled'}`); }} style={{ background: 'transparent', border: 'none', color: showGrid ? '#00FFCC' : '#666', fontSize: '10px', writingMode: 'vertical-rl', fontWeight: 'bold', cursor: 'pointer' }}>GRID</button>
            {workspaceMode === '3d' && (
                <button onClick={() => { setShowAxes(!showAxes); announce(`Axes ${!showAxes ? 'enabled' : 'disabled'}`); }} style={{ background: 'transparent', border: 'none', color: showAxes ? '#00FFCC' : '#666', fontSize: '10px', writingMode: 'vertical-rl', fontWeight: 'bold', cursor: 'pointer' }}>AXES</button>
            )}
            <div onClick={() => { setTempColorHex(gridColor); setColorPickerTarget('grid'); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: gridColor, border: '2px solid #333', cursor: 'pointer' }} />
            {workspaceMode === '2d' && <input type="range" min="0.05" max="1" step="0.05" value={gridOpacity} onChange={(e) => setGridOpacity(Number(e.target.value))} style={{ width: '60px', transform: 'rotate(-90deg)', margin: '25px -20px', accentColor: '#00FFCC' }} />}
            
            <div style={{ width: '100%', height: '1px', background: '#333' }} />
            
            <span style={{ fontSize: '10px', writingMode: 'vertical-rl', fontWeight: 'bold', color: '#666' }}>BG</span>
            <div onClick={() => { setTempColorHex(canvasBgColor); setColorPickerTarget('bg'); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: canvasBgColor, border: '2px solid #333', cursor: 'pointer' }} />

            {workspaceMode === '2d' && (
               <>
                  <div style={{ width: '100%', height: '1px', background: '#333' }} />
                  <label style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                      <ImageIcon size={16} color={refImage ? '#00FFCC' : '#666'} />
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: refImage ? '#00FFCC' : '#666' }}>REF</span>
                      <input type="file" accept="image/*" onChange={handleRefImage} style={{display: 'none'}} />
                  </label>
                  {refImage && (
                      <input type="range" min="0" max="1" step="0.1" value={refOpacity} onChange={(e) => setRefOpacity(Number(e.target.value))} style={{ width: '60px', transform: 'rotate(-90deg)', margin: '25px -20px', accentColor: '#00FFCC' }} />
                  )}
               </>
            )}
          </div>

          {/* RIGHT EDGE: Minimap & 3D Toggle */}
          <div style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => {
                const newMode = workspaceMode === '2d' ? '3d' : '2d';
                setWorkspaceMode(newMode);
                setActiveTool('pencil');
                announce(`Switched to ${newMode.toUpperCase()} Workspace`);
            }} style={{ background: workspaceMode === '3d' ? '#00FFCC' : 'rgba(15,15,20,0.85)', border: '1px solid #222', color: workspaceMode === '3d' ? '#000' : '#fff', padding: '10px', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: '0.2s' }}>
                <Cuboid size={20} />
                <span style={{ fontSize: '9px', fontWeight: 'bold' }}>3D</span>
            </button>

            {workspaceMode === '2d' && (
               <>
                  <div onPointerDown={handleMinimapPan} onPointerMove={handleMinimapPan} onPointerUp={() => isPanning.current = false} onPointerLeave={() => isPanning.current = false} style={{ width: '60px', height: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid #00FFCC', borderRadius: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '25%', border: '1px solid rgba(255,255,255,0.5)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(15,15,20,0.85)', borderRadius: '20px', padding: '5px', border: '1px solid #222' }}>
                    <button onClick={() => targetZoom.current *= 1.2} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>+</button>
                    <div style={{ height: '60px', width: '2px', background: '#333', margin: '5px auto' }} />
                    <button onClick={() => targetZoom.current *= 0.8} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>-</button>
                  </div>
               </>
            )}
          </div>

          <FloatingMenu
            workspaceMode={workspaceMode} activeTool={activeTool}
            symMode={symMode} setSymMode={setSymMode} shapeFill={shapeFill} setShapeFill={setShapeFill}
            announce={announce} hasClipboard={hasClipboard} hasSelection={hasSelection} handleSelectAction={handleSelectAction}
          />
          <BottomHUD
            showPalettePanel={showPalettePanel} setShowPalettePanel={setShowPalettePanel}
            color={color} setTempColorHex={setTempColorHex} setColorPickerTarget={setColorPickerTarget}
            activeToolList={activeToolList} activeTool={activeTool} handleToolChange={handleToolChange} workspaceMode={workspaceMode}
          />

          {/* 3D Canvas Context */}
          <div style={{ width: '100%', height: '100%' }}>
            {workspaceMode === '2d' ? (
                <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 1 }} gl={{ preserveDrawingBuffer: true }}>
                  <OrthographicCameraController targetPos={targetPos} targetZoom={targetZoom} />
                  <ExportManager canvasSize={canvasSize} setSaveModal={setSaveModal} />
                  <ShapePreview />
                  <SelectionOverlay />
                  <mesh position={[0, 0, -1]}>
                     <planeGeometry args={[canvasSize, canvasSize]} />
                     <meshBasicMaterial color={canvasBgColor} />
                  </mesh>
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
            ) : (
                <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
                  <color attach="background" args={[canvasBgColor]} />
                  <PerspectiveOrbitController canvasSize={canvasSize} />
                  <VoxelChunk color={color} activeTool={activeTool} canvasSize={canvasSize} showAxes={showAxes} />
                </Canvas>
            )}
          </div>
      </StudioView>

      <BottomNav appTab={appTab} setAppTab={setAppTab} />

      <style>{`
         @keyframes fadein { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
         @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
         @keyframes swipeIn { from { transform: translateY(50px) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
         * { scrollbar-width: none; }
         *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}