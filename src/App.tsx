import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import WebApp from '@twa-dev/sdk';
import { Pencil, PaintBucket, Pipette, Eraser, Ruler, FlipHorizontal, Undo, Redo, Trash, Layers, Maximize, Download } from 'lucide-react';
import PixelChunk from './PixelChunk';
import { HistoryManager } from './history';

const SIZES = [8, 16, 32, 64, 128, 256, 512, 1024, 2048];

const TOOLS = [
  { id: 'pencil', icon: Pencil, label: 'Draw' },
  { id: 'bucket', icon: PaintBucket, label: 'Fill' },
  { id: 'eyedropper', icon: Pipette, label: 'Pick' },
  { id: 'eraser', icon: Eraser, label: 'Erase' },
  { id: 'line', icon: Ruler, label: 'Line' },
  { id: 'symmetry', icon: FlipHorizontal, label: 'Mirror' }
];

const actionBtn = { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' };

function CameraController({ targetPos, targetZoom }: any) {
  useFrame((state) => {
    state.camera.position.lerp(new THREE.Vector3(targetPos.current.x, targetPos.current.y, 100), 0.2);
    // @ts-ignore
    state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, targetZoom.current, 0.2);
    state.camera.updateProjectionMatrix();
  });
  return null;
}

function LinePreview() {
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
    window.addEventListener('linePreview', handlePreview);
    return () => window.removeEventListener('linePreview', handlePreview);
  }, [dummy]);

  return (
    // @ts-ignore
    <instancedMesh ref={meshRef} args={[undefined, undefined, 10000]} visible={visible} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial depthTest={false} transparent opacity={0.6} />
    </instancedMesh>
  );
}

export const exportTrigger = { current: null as (() => void) | null };

function ExportManager({ canvasSize }: { canvasSize: number }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    exportTrigger.current = () => {
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
      // FIXED: Use readRenderTargetPixels instead of readPixels
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

      const link = document.createElement('a');
      link.download = `Prixm-Ultra-4K.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();
    };
  }, [gl, scene, canvasSize]);

  return null;
}

export default function App() {
  const [color, setColor] = useState('#00FFCC');
  const [canvasSize, setCanvasSize] = useState(64);
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.2);
  const [gridColor, setGridColor] = useState('#ffffff');
  const [activeTool, setActiveTool] = useState('pencil');
  const [symMode, setSymMode] = useState<'X' | 'Y' | 'XY'>('X');

  const targetPos = useRef({ x: 0, y: 0 });
  const targetZoom = useRef(1);
  const initialPinchDist = useRef<number | null>(null);
  const isPanning = useRef(false);

  useEffect(() => {
    const handleUp = () => HistoryManager.endStroke();
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    if (WebApp.ready && typeof WebApp.ready === 'function') { 
      WebApp.ready(); 
      WebApp.expand(); 
    }

    return () => {
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    }
  }, []);

  const resetView = () => {
    targetPos.current = { x: 0, y: 0 };
    targetZoom.current = (window.innerWidth * 0.9) / canvasSize;
  };
  
  useEffect(() => { resetView(); }, [canvasSize]);

  const exportImage = () => {
    const prevGrid = showGrid;
    setShowGrid(false); 
    setTimeout(() => {
      if (exportTrigger.current) exportTrigger.current();
      setShowGrid(prevGrid);
    }, 100);
  };

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
            onPickColor={(c) => { setColor(c); setActiveTool('pencil'); }} 
          />
        );
      }
    }
    return grid;
  }, [color, canvasSize, chunksPerRow, actualChunkSize, activeTool, symMode]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0A0A0C', color: '#fff', touchAction: 'none', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui' }} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
      
      {/* TOP HUD */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15,15,20,0.85)', padding: '6px 10px', borderRadius: '12px', border: '1px solid #222' }}>
          <select value={canvasSize} onChange={(e) => setCanvasSize(Number(e.target.value))} style={{ background: 'transparent', color: '#00FFCC', border: 'none', fontWeight: 'bold', outline: 'none', fontSize: '14px' }}>
            {SIZES.map(s => <option key={s} value={s} style={{background: '#111'}}>{s}px</option>)}
          </select>
          <button onClick={resetView} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Maximize size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: '12px', background: 'rgba(15,15,20,0.85)', padding: '8px 12px', borderRadius: '12px', border: '1px solid #222' }}>
          <button onClick={exportImage} style={actionBtn}><Download size={18} /></button>
          <button onClick={() => HistoryManager.undo()} style={actionBtn}><Undo size={18} /></button>
          <button onClick={() => HistoryManager.redo()} style={actionBtn}><Redo size={18} /></button>
          <button onClick={() => {/* TODO: Clear */}} style={actionBtn}><Trash size={18} /></button>
          <button onClick={() => {/* TODO: Layers */}} style={actionBtn}><Layers size={18} /></button>
        </div>
      </div>

      {/* LEFT EDGE: Grid */}
      <div style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(15,15,20,0.85)', padding: '10px 5px', borderRadius: '20px', border: '1px solid #222' }}>
        <button onClick={() => setShowGrid(!showGrid)} style={{ background: 'transparent', border: 'none', color: showGrid ? '#00FFCC' : '#666', fontSize: '10px', writingMode: 'vertical-rl', fontWeight: 'bold' }}>GRID</button>
        <input type="color" value={gridColor} onChange={(e) => setGridColor(e.target.value)} style={{ width: '20px', height: '20px', border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} />
        <input type="range" min="0.05" max="1" step="0.05" value={gridOpacity} onChange={(e) => setGridOpacity(Number(e.target.value))} style={{ width: '60px', transform: 'rotate(-90deg)', margin: '30px -20px', accentColor: '#00FFCC' }} />
      </div>

      {/* RIGHT EDGE: Minimap & Zoom */}
      <div style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <div onPointerDown={handleMinimapPan} onPointerMove={handleMinimapPan} onPointerUp={() => isPanning.current = false} onPointerLeave={() => isPanning.current = false} style={{ width: '60px', height: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid #00FFCC', borderRadius: '8px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '25%', border: '1px solid rgba(255,255,255,0.5)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(15,15,20,0.85)', borderRadius: '20px', padding: '5px', border: '1px solid #222' }}>
          <button onClick={() => targetZoom.current *= 1.2} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px' }}>+</button>
          <div style={{ height: '60px', width: '2px', background: '#333', margin: '5px auto' }} />
          <button onClick={() => targetZoom.current *= 0.8} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px' }}>-</button>
        </div>
      </div>

      {/* Floating Sub-Menu for Active Tools */}
      {activeTool === 'symmetry' && (
        <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(15,15,20,0.9)', padding: '6px 12px', borderRadius: '16px', border: '1px solid #333', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setSymMode('X')} style={{ background: symMode === 'X' ? '#00FFCC' : 'transparent', color: symMode === 'X' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Mirror X</button>
          <button onClick={() => setSymMode('Y')} style={{ background: symMode === 'Y' ? '#00FFCC' : 'transparent', color: symMode === 'Y' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Mirror Y</button>
          <button onClick={() => setSymMode('XY')} style={{ background: symMode === 'XY' ? '#00FFCC' : 'transparent', color: symMode === 'XY' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Quad (XY)</button>
        </div>
      )}

      {/* BOTTOM HUD: Labeled Tools */}
      <div style={{ position: 'absolute', bottom: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(15,15,20,0.85)', padding: '10px 15px', borderRadius: '24px', border: '1px solid #222', width: '90%', maxWidth: '500px', overflowX: 'auto' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: color, border: '2px solid #fff', position: 'relative', overflow: 'hidden' }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '50px', height: '50px', opacity: 0, cursor: 'pointer' }} />
          </div>
          <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>COLOR</span>
        </div>
        
        <div style={{ width: '1px', height: '30px', background: '#333', flexShrink: 0 }} />

        {TOOLS.map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTool(t.id)} 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: activeTool === t.id ? '#00FFCC' : '#666', cursor: 'pointer', minWidth: '40px', transition: '0.2s' }}
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
          <LinePreview />
          {chunks}
          {showGrid && (
            <gridHelper args={[canvasSize, canvasSize, gridColor, gridColor]} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <lineBasicMaterial attach="material" transparent opacity={gridOpacity} depthWrite={false} />
            </gridHelper>
          )}
        </Canvas>
      </div>
    </div>
  );
}