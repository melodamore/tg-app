import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { HistoryManager, LineManager, SelectionManager, type PixelDelta } from '../../store/history';
import { hexToRgb } from '../../utils/colors';
import { getBresenhamPoints, getCirclePoints, getPolygonPoints, getShapeVertices } from '../../utils/math';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

interface Props {
  color?: string;
  position?: [number, number, number];
  chunkSize?: number;
  activeTool?: string;
  symMode?: 'X' | 'Y' | 'XY';
  shapeFill?: boolean;
  layers: Layer[];
  activeLayerId: string;
  onPickColor: (hex: string) => void;
}

export default function PixelChunk({ 
  color = '#00FFCC', 
  position = [0, 0, 0], 
  chunkSize = 64, 
  activeTool = 'pencil', 
  symMode = 'X',
  shapeFill = false,
  layers,
  activeLayerId,
  onPickColor 
}: Props) {
  const chunkId = position.join(',');
  const [, setRenderTrigger] = useState(0);

  const layerData = useRef<Record<string, { data: Uint8ClampedArray, tex: THREE.DataTexture }>>({});

  useEffect(() => {
    let changed = false;
    layers.forEach(l => {
      if (!layerData.current[l.id]) {
        const data = new Uint8ClampedArray(chunkSize * chunkSize * 4); 
        const tex = new THREE.DataTexture(data, chunkSize, chunkSize, THREE.RGBAFormat);
        tex.magFilter = THREE.NearestFilter;
        tex.needsUpdate = true;
        layerData.current[l.id] = { data, tex };
        changed = true;
      }
    });
    if (changed) setRenderTrigger(v => v + 1);
  }, [layers, chunkSize]);

  useEffect(() => {
    const onGather = () => {
        const serializedLayers = layers.map(l => {
           const arr = layerData.current[l.id]?.data;
           if (!arr) return { id: l.id, data: '' };
           const bin = [];
           for (let i = 0; i < arr.length; i += 0x8000) {
               bin.push(String.fromCharCode.apply(null, arr.subarray(i, i + 0x8000) as any));
           }
           return { id: l.id, data: btoa(bin.join('')) };
        });
        // @ts-ignore
        window.projectExportBuffer.push({ chunkId, layers: serializedLayers });
    };
    window.addEventListener('gatherChunkData', onGather);
    return () => window.removeEventListener('gatherChunkData', onGather);
  }, [layers, chunkId]);

  useEffect(() => {
    const onApply = () => {
        // @ts-ignore
        const myChunk = window.projectImportBuffer?.find(c => c.chunkId === chunkId);
        if (myChunk) {
            myChunk.layers.forEach((l: any) => {
                if (layerData.current[l.id]) {
                    const bin = atob(l.data);
                    const arr = layerData.current[l.id].data;
                    for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                    layerData.current[l.id].tex.needsUpdate = true;
                }
            });
            setRenderTrigger(v => v+1);
        }
    };
    window.addEventListener('applyChunkData', onApply);
    return () => window.removeEventListener('applyChunkData', onApply);
  }, [chunkId]);

  useEffect(() => {
    const handleGlobalDraw = (e: Event) => {
      const { points, newColor, targetLayer } = (e as CustomEvent).detail;
      const targetData = layerData.current[targetLayer];
      if (!targetData) return;

      let needsUpdate = false;

      points.forEach((pt: { x: number, y: number }) => {
        const minX = position[0] - chunkSize / 2;
        const maxX = position[0] + chunkSize / 2;
        const minY = position[1] - chunkSize / 2;
        const maxY = position[1] + chunkSize / 2;

        if (pt.x >= minX && pt.x < maxX && pt.y >= minY && pt.y < maxY) {
          const localX = Math.floor(pt.x - minX);
          const localY = Math.floor(pt.y - minY);
          const index = (localY * chunkSize + localX) * 4;

          const oldColor = [targetData.data[index], targetData.data[index+1], targetData.data[index+2], targetData.data[index+3]];
          HistoryManager.record(targetLayer, chunkId, index, oldColor, newColor);

          targetData.data[index] = newColor[0];
          targetData.data[index+1] = newColor[1];
          targetData.data[index+2] = newColor[2];
          targetData.data[index+3] = newColor[3];
          needsUpdate = true;
        }
      });

      if (needsUpdate) targetData.tex.needsUpdate = true;
    };

    window.addEventListener('globalDraw', handleGlobalDraw);
    return () => window.removeEventListener('globalDraw', handleGlobalDraw);
  }, [position, chunkSize, chunkId]);

  useEffect(() => {
    const minCX = position[0] - chunkSize / 2;
    const maxCX = position[0] + chunkSize / 2;
    const minCY = position[1] - chunkSize / 2;
    const maxCY = position[1] + chunkSize / 2;

    const handleExtract = (e: Event) => {
      const { targetLayer } = (e as CustomEvent).detail;
      const targetData = layerData.current[targetLayer];
      if (!targetData) return;

      const b = SelectionManager.getBounds();
      let needsUpdate = false;

      const startX = Math.max(b.minX, minCX);
      const endX = Math.min(b.maxX, maxCX - 1);
      const startY = Math.max(b.minY, minCY);
      const endY = Math.min(b.maxY, maxCY - 1);

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const localX = Math.floor(x - minCX);
          const localY = Math.floor(y - minCY);
          const idx = (localY * chunkSize + localX) * 4;

          if (targetData.data[idx+3] > 0) { 
            SelectionManager.floatingPixels.push({
               x, y, color: [targetData.data[idx], targetData.data[idx+1], targetData.data[idx+2], targetData.data[idx+3]]
            });
            HistoryManager.record(targetLayer, chunkId, idx, [targetData.data[idx], targetData.data[idx+1], targetData.data[idx+2], targetData.data[idx+3]], [0,0,0,0]);
            targetData.data[idx] = 0; targetData.data[idx+1] = 0; targetData.data[idx+2] = 0; targetData.data[idx+3] = 0;
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) targetData.tex.needsUpdate = true;
    };

    const handleCommit = (e: Event) => {
      const { targetLayer } = (e as CustomEvent).detail;
      const targetData = layerData.current[targetLayer];
      if (!targetData || !SelectionManager.isFloating) return;

      let needsUpdate = false;
      SelectionManager.floatingPixels.forEach(p => {
        const nx = p.x + SelectionManager.offsetX;
        const ny = p.y + SelectionManager.offsetY;

        if (nx >= minCX && nx < maxCX && ny >= minCY && ny < maxCY) {
          const localX = Math.floor(nx - minCX);
          const localY = Math.floor(ny - minCY);
          const idx = (localY * chunkSize + localX) * 4;

          const oldColor = [targetData.data[idx], targetData.data[idx+1], targetData.data[idx+2], targetData.data[idx+3]];
          HistoryManager.record(targetLayer, chunkId, idx, oldColor, p.color);

          targetData.data[idx] = p.color[0]; targetData.data[idx+1] = p.color[1]; targetData.data[idx+2] = p.color[2]; targetData.data[idx+3] = p.color[3];
          needsUpdate = true;
        }
      });
      if (needsUpdate) targetData.tex.needsUpdate = true;
    };

    window.addEventListener('extractSelection', handleExtract);
    window.addEventListener('commitSelection', handleCommit);
    return () => {
      window.removeEventListener('extractSelection', handleExtract);
      window.removeEventListener('commitSelection', handleCommit);
    };
  }, [position, chunkSize, chunkId]);

  useEffect(() => {
    const handleHistory = (e: Event) => {
      const { stroke, isUndo } = (e as CustomEvent).detail;
      const updatedLayers = new Set<string>();

      stroke.forEach((delta: PixelDelta) => {
        if (delta.chunkId !== chunkId) return;
        const targetData = layerData.current[delta.layerId];
        if (!targetData) return;

        const targetColor = isUndo ? delta.oldColor : delta.newColor;
        targetData.data[delta.index] = targetColor[0];
        targetData.data[delta.index + 1] = targetColor[1];
        targetData.data[delta.index + 2] = targetColor[2];
        targetData.data[delta.index + 3] = targetColor[3];
        updatedLayers.add(delta.layerId);
      });

      updatedLayers.forEach(id => {
        if (layerData.current[id]) layerData.current[id].tex.needsUpdate = true;
      });
    };

    window.addEventListener('historyApply', handleHistory);
    return () => window.removeEventListener('historyApply', handleHistory);
  }, [chunkId]);

  const getPixel = (data: Uint8ClampedArray, x: number, y: number) => {
    const idx = (y * chunkSize + x) * 4;
    return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
  };

  const colorsMatch = (c1: number[], c2: number[]) => {
    return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
  };

  const floodFill = (startX: number, startY: number, fillRgb: number[], targetLayer: string) => {
    const target = layerData.current[targetLayer];
    if (!target) return;

    const targetColor = getPixel(target.data, startX, startY);
    const newColor = [...fillRgb, 255]; 
    if (colorsMatch(targetColor, newColor)) return;

    HistoryManager.startStroke();
    const stack = [startX, startY];

    while (stack.length > 0) {
      const cy = stack.pop()!;
      const cx = stack.pop()!;
      const idx = (cy * chunkSize + cx) * 4;
      
      const currentColor = [target.data[idx], target.data[idx+1], target.data[idx+2], target.data[idx+3]];

      if (colorsMatch(currentColor, targetColor)) {
        HistoryManager.record(targetLayer, chunkId, idx, currentColor, newColor);
        target.data[idx] = newColor[0];
        target.data[idx+1] = newColor[1];
        target.data[idx+2] = newColor[2];
        target.data[idx+3] = newColor[3];

        if (cx > 0) stack.push(cx - 1, cy);
        if (cx < chunkSize - 1) stack.push(cx + 1, cy);
        if (cy > 0) stack.push(cx, cy - 1);
        if (cy < chunkSize - 1) stack.push(cx, cy + 1);
      }
    }
    HistoryManager.endStroke();
    target.tex.needsUpdate = true;
  };

  const draw = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    e.stopPropagation(); 
    if (!e.uv) return;

    const px = Math.floor(e.point.x);
    const py = Math.floor(e.point.y);

    if (activeTool === 'text') {
        if (e.type === 'pointerdown') {
            const text = prompt("Enter text to stamp:");
            if (!text) return;
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d')!;
            ctx.font = '12px monospace';
            const w = Math.max(1, Math.ceil(ctx.measureText(text).width));
            c.width = w; c.height = 16;
            ctx.font = '12px monospace';
            ctx.fillStyle = 'black';
            ctx.textBaseline = 'top';
            ctx.fillText(text, 0, 2);
            const data = ctx.getImageData(0,0,w,16).data;
            const points = [];
            for(let pyLocal=0; pyLocal<16; pyLocal++){
                for(let pxLocal=0; pxLocal<w; pxLocal++){
                    if (data[(pyLocal*w+pxLocal)*4+3] > 128) {
                        points.push({x: px + pxLocal, y: py - pyLocal}); 
                    }
                }
            }
            HistoryManager.startStroke();
            window.dispatchEvent(new CustomEvent('globalDraw', { detail: { points, newColor: [...hexToRgb(color), 255], targetLayer: activeLayerId } }));
            HistoryManager.endStroke();
        }
        return;
    }

    if (activeTool === 'select') {
      if (e.type === 'pointerdown') {
         (e.target as HTMLElement).setPointerCapture(e.pointerId);
         if (SelectionManager.isFloating) {
             const b = SelectionManager.getBounds();
             if (px >= b.minX + SelectionManager.offsetX && px <= b.maxX + SelectionManager.offsetX &&
                 py >= b.minY + SelectionManager.offsetY && py <= b.maxY + SelectionManager.offsetY) {
                 LineManager.startX = px;
                 LineManager.startY = py;
             } else {
                 window.dispatchEvent(new CustomEvent('commitSelection', { detail: { targetLayer: activeLayerId } }));
                 HistoryManager.endStroke();
                 SelectionManager.clear();
                 window.dispatchEvent(new CustomEvent('selectionUpdate'));
             }
         } else {
             SelectionManager.isSelecting = true;
             SelectionManager.startX = px; SelectionManager.startY = py;
             SelectionManager.endX = px; SelectionManager.endY = py;
             window.dispatchEvent(new CustomEvent('selectionUpdate'));
         }
      } else if (e.type === 'pointermove') {
          if (SelectionManager.isSelecting) {
             SelectionManager.endX = px; SelectionManager.endY = py;
             window.dispatchEvent(new CustomEvent('selectionUpdate'));
          } else if (SelectionManager.isFloating && LineManager.startX !== null && LineManager.startY !== null) {
             SelectionManager.offsetX += px - LineManager.startX;
             SelectionManager.offsetY += py - LineManager.startY;
             LineManager.startX = px; LineManager.startY = py;
             window.dispatchEvent(new CustomEvent('selectionUpdate'));
          }
      } else if (e.type === 'pointerup') {
         (e.target as HTMLElement).releasePointerCapture(e.pointerId);
         if (SelectionManager.isSelecting) {
             SelectionManager.isSelecting = false;
             if (SelectionManager.startX !== SelectionManager.endX || SelectionManager.startY !== SelectionManager.endY) {
                 SelectionManager.isFloating = true;
                 HistoryManager.startStroke();
                 window.dispatchEvent(new CustomEvent('extractSelection', { detail: { targetLayer: activeLayerId } }));
             }
             window.dispatchEvent(new CustomEvent('selectionUpdate'));
         } else if (LineManager.startX !== null) {
             LineManager.startX = null;
         }
      }
      return;
    }

    const SHAPE_TOOLS = ['line', 'rect', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'arrow', 'parallelogram'];

    if (SHAPE_TOOLS.includes(activeTool!)) {
      if (e.type === 'pointerdown') {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        LineManager.startX = px;
        LineManager.startY = py;
      } else if (e.type === 'pointermove' && LineManager.startX !== null && LineManager.startY !== null) {
        let points: any[] = [];
        if (activeTool === 'line') points = getBresenhamPoints(LineManager.startX, LineManager.startY, px, py);
        else if (activeTool === 'circle') points = getCirclePoints(LineManager.startX, LineManager.startY, px, py, shapeFill);
        else {
            const vertices = getShapeVertices(activeTool!, LineManager.startX, LineManager.startY, px, py);
            points = getPolygonPoints(vertices, shapeFill);
        }
        window.dispatchEvent(new CustomEvent('shapePreview', { detail: { visible: true, points, color } }));
      } else if (e.type === 'pointerup' && LineManager.startX !== null && LineManager.startY !== null) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        let points: any[] = [];
        if (activeTool === 'line') points = getBresenhamPoints(LineManager.startX, LineManager.startY, px, py);
        else if (activeTool === 'circle') points = getCirclePoints(LineManager.startX, LineManager.startY, px, py, shapeFill);
        else {
            const vertices = getShapeVertices(activeTool!, LineManager.startX, LineManager.startY, px, py);
            points = getPolygonPoints(vertices, shapeFill);
        }
        LineManager.startX = null;
        LineManager.startY = null;
        window.dispatchEvent(new CustomEvent('shapePreview', { detail: { visible: false } }));

        HistoryManager.startStroke();
        window.dispatchEvent(new CustomEvent('globalDraw', { 
          detail: { points, newColor: [...hexToRgb(color), 255], targetLayer: activeLayerId } 
        }));
        HistoryManager.endStroke();
      }
      return;
    }

    if (e.type === 'pointerdown') HistoryManager.startStroke();

    const x = Math.floor(e.uv.x * chunkSize);
    const y = Math.floor(e.uv.y * chunkSize);

    if (activeTool === 'eyedropper') {
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible) continue;
        const targetData = layerData.current[layer.id];
        if (targetData) {
           const index = (y * chunkSize + x) * 4;
           if (targetData.data[index+3] > 0) { 
              const hex = "#" + (1 << 24 | targetData.data[index] << 16 | targetData.data[index+1] << 8 | targetData.data[index+2]).toString(16).slice(1);
              onPickColor(hex);
              return;
           }
        }
      }
      onPickColor('#FFFFFF'); 
      return;
    }

    if (activeTool === 'bucket' && e.type === 'pointerdown') {
      floodFill(x, y, hexToRgb(color), activeLayerId);
      return;
    }

    const newColor = activeTool === 'eraser' ? [0, 0, 0, 0] : [...hexToRgb(color), 255];
    const points = [{ x: px, y: py }];

    if (activeTool === 'symmetry') {
      if (symMode === 'X' || symMode === 'XY') points.push({ x: -px - 1, y: py });
      if (symMode === 'Y' || symMode === 'XY') points.push({ x: px, y: -py - 1 });
      if (symMode === 'XY') points.push({ x: -px - 1, y: -py - 1 });
    }

    if (activeTool !== 'select') {
       window.dispatchEvent(new CustomEvent('globalDraw', { detail: { points, newColor, targetLayer: activeLayerId } }));
    }
  };

  return (
    <group position={position}>
      {layers.map((layer, index) => {
        if (!layer.visible || !layerData.current[layer.id]) return null;
        return (
          <mesh key={layer.id} position={[0, 0, index * 0.01]}>
            <planeGeometry args={[chunkSize, chunkSize]} />
            <meshBasicMaterial 
              map={layerData.current[layer.id].tex} 
              transparent 
              opacity={layer.opacity} 
              depthWrite={false} 
              depthTest={false} 
            />
          </mesh>
        );
      })}

      <mesh 
        position={[0, 0, layers.length * 0.01 + 0.01]} 
        onPointerDown={draw} 
        onPointerMove={(e) => (e.buttons === 1 || e.pressure > 0) && draw(e)}
        onPointerUp={draw}
      >
        <planeGeometry args={[chunkSize, chunkSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}