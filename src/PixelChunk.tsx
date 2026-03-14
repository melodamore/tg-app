import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { HistoryManager, LineManager, SelectionManager, type PixelDelta } from './history';

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

  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

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

  const getBresenhamPoints = (x0: number, y0: number, x1: number, y1: number) => {
    const points = [];
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    while (true) {
      points.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return points;
  };

  const getPolygonPoints = (vertices: {x: number, y: number}[], filled: boolean) => {
    const points: {x: number, y: number}[] = [];
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        points.push(...getBresenhamPoints(p1.x, p1.y, p2.x, p2.y));
    }
    if (filled) {
        let minY = Math.min(...vertices.map(v => v.y));
        let maxY = Math.max(...vertices.map(v => v.y));
        for (let y = minY; y <= maxY; y++) {
            let nodes = [];
            let j = vertices.length - 1;
            for (let i = 0; i < vertices.length; i++) {
                let vi = vertices[i], vj = vertices[j];
                if ((vi.y < y && vj.y >= y) || (vj.y < y && vi.y >= y)) {
                    nodes.push(Math.floor(vi.x + (y - vi.y) / (vj.y - vi.y) * (vj.x - vi.x)));
                }
                j = i;
            }
            nodes.sort((a, b) => a - b);
            for (let i = 0; i < nodes.length; i += 2) {
                if (nodes[i+1] !== undefined) {
                    for (let x = nodes[i]; x <= nodes[i+1]; x++) points.push({x, y});
                }
            }
        }
    }
    return points;
  };

  const getCirclePoints = (xc: number, yc: number, x1: number, y1: number, filled: boolean) => {
    const r = Math.floor(Math.hypot(x1 - xc, y1 - yc));
    const points = [];
    if (r === 0) return [{x: xc, y: yc}];
    if (filled) {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                if (x*x + y*y <= r*r) points.push({x: xc + x, y: yc + y});
            }
        }
    } else {
        let x = 0, y = r, d = r - 1;
        while (y >= x) {
            points.push(
                {x: xc+x, y: yc+y}, {x: xc-x, y: yc+y}, {x: xc+x, y: yc-y}, {x: xc-x, y: yc-y},
                {x: xc+y, y: yc+x}, {x: xc-y, y: yc+x}, {x: xc+y, y: yc-x}, {x: xc-y, y: yc-x}
            );
            if (d >= 2 * x) { d -= 2 * x + 1; x++; }
            else if (d < 2 * (r - y)) { d += 2 * y - 1; y--; }
            else { d += 2 * (y - x - 1); y--; x++; }
        }
    }
    return points;
  };

  const getShapeVertices = (tool: string, x0: number, y0: number, x1: number, y1: number) => {
      const cx = Math.floor((x0 + x1) / 2);
      const cy = Math.floor((y0 + y1) / 2);
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;

      const getRegularPolygon = (sides: number, rotation = -Math.PI/2) => {
          const v = [];
          for (let i = 0; i < sides; i++) {
              const angle = rotation + (i * 2 * Math.PI / sides);
              v.push({ x: Math.floor(cx + rx * Math.cos(angle)), y: Math.floor(cy + ry * Math.sin(angle)) });
          }
          return v;
      };

      const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

      switch (tool) {
          case 'rect': return [{x: minX, y: minY}, {x: maxX, y: minY}, {x: maxX, y: maxY}, {x: minX, y: maxY}];
          case 'triangle': return [{x: cx, y: minY}, {x: maxX, y: maxY}, {x: minX, y: maxY}];
          case 'diamond': return [{x: cx, y: minY}, {x: maxX, y: cy}, {x: cx, y: maxY}, {x: minX, y: cy}];
          case 'pentagon': return getRegularPolygon(5);
          case 'hexagon': return getRegularPolygon(6);
          case 'octagon': return getRegularPolygon(8, -Math.PI/2 + Math.PI/8);
          case 'parallelogram': {
              const offset = Math.floor(rx * 0.5);
              return [{x: minX + offset, y: minY}, {x: maxX, y: minY}, {x: maxX - offset, y: maxY}, {x: minX, y: maxY}];
          }
          case 'arrow': return [
              {x: minX, y: Math.floor(cy - ry/2)}, {x: cx, y: Math.floor(cy - ry/2)}, {x: cx, y: minY},
              {x: maxX, y: cy}, {x: cx, y: maxY}, {x: cx, y: Math.floor(cy + ry/2)}, {x: minX, y: Math.floor(cy + ry/2)}
          ];
          case 'star': {
              const v = [];
              for (let i = 0; i < 10; i++) {
                  const angle = -Math.PI/2 + (i * Math.PI / 5);
                  const rRatio = i % 2 === 0 ? 1 : 0.4;
                  v.push({ x: Math.floor(cx + rx * rRatio * Math.cos(angle)), y: Math.floor(cy + ry * rRatio * Math.sin(angle)) });
              }
              return v;
          }
          default: return [];
      }
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

// --- NEW MINECRAFT-STYLE 3D VOXEL ENGINE ---
export function VoxelChunk({ color, activeTool, canvasSize, showAxes }: { color: string, activeTool: string, canvasSize: number, showAxes: boolean }) {
  // Pure WebGL state management for 100k+ block performance
  const voxelsRef = useRef(new Map<string, {x:number, y:number, z:number, color: string, scale: number}>());
  const [, setVoxelCount] = useState(0); 
  const [hoverPos, setHoverPos] = useState<THREE.Vector3 | null>(null);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const getBlockPos = (point: THREE.Vector3, normal: THREE.Vector3, isEraser: boolean) => {
      // Calculate block position strictly based on face normal direction
      const offset = normal.clone().multiplyScalar(isEraser ? -0.1 : 0.1);
      return point.clone().add(offset).floor();
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (activeTool !== 'pencil' && activeTool !== 'eraser') {
          if (hoverPos) setHoverPos(null);
          return;
      }
      if (!e.face?.normal) return;

      const pos = getBlockPos(e.point, e.face.normal, activeTool === 'eraser');
      const half = canvasSize / 2;

      // Constrain builds perfectly to exactly the canvas grid boundaries
      if (pos.y < 0 || pos.x < -half || pos.x >= half || pos.z < -half || pos.z >= half) {
          setHoverPos(null);
          return;
      }
      
      // Stop React from rendering constantly if hover position hasn't actually moved
      if (!hoverPos || hoverPos.x !== pos.x || hoverPos.y !== pos.y || hoverPos.z !== pos.z) {
          setHoverPos(pos);
      }
  };

  // Uses pointerUP to allow easy native orbiting on pointer drags
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta > 2) return; // Prevent clicks firing after heavy drags/orbits
      if (activeTool !== 'pencil' && activeTool !== 'eraser') return;
      if (!e.face?.normal) return;

      const pos = getBlockPos(e.point, e.face.normal, activeTool === 'eraser');
      const half = canvasSize / 2;

      if (pos.y < 0 || pos.x < -half || pos.x >= half || pos.z < -half || pos.z >= half) return;

      const key = `${pos.x},${pos.y},${pos.z}`;

      if (activeTool === 'pencil') {
          voxelsRef.current.set(key, { x: pos.x, y: pos.y, z: pos.z, color, scale: 0 });
      } else if (activeTool === 'eraser') {
          voxelsRef.current.delete(key);
          setHoverPos(null);
      }
      setVoxelCount(voxelsRef.current.size); // Only triggers UI refresh when count changes
  };

  // Ultra-fast pure mathematical interpolation
  useFrame((state, delta) => {
      if (!meshRef.current) return;
      let needsUpdate = false;
      let i = 0;
      meshRef.current.count = voxelsRef.current.size;

      voxelsRef.current.forEach((v) => {
          if (v.scale < 1) {
              v.scale = Math.min(1, v.scale + delta * 15); // Professional pop-in effect
              needsUpdate = true;
          }
          dummy.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
          dummy.scale.setScalar(v.scale);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);

          tempColor.set(v.color);
          meshRef.current!.setColorAt(i, tempColor);
          i++;
      });

      if (needsUpdate || voxelsRef.current.size !== meshRef.current.count) {
          meshRef.current.instanceMatrix.needsUpdate = true;
          if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
      }
  });

  return (
    <group>
      {/* Colorful toggleable 3D axis helper */}
      {showAxes && <axesHelper args={[canvasSize]} position={[0, 0.1, 0]} />}

      {/* Invisible bounding floor for initial placements on empty canvas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onPointerMove={handlePointerMove} onPointerUp={handleClick} onPointerOut={() => setHoverPos(null)}>
        <planeGeometry args={[canvasSize, canvasSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <gridHelper args={[canvasSize, canvasSize, '#444', '#222']} position={[0, 0, 0]} />

      {/* Core Voxel Rendering Engine */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, 100000]} onPointerMove={handlePointerMove} onPointerUp={handleClick} onPointerOut={() => setHoverPos(null)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.1} metalness={0.1} />
      </instancedMesh>

      {/* Target Wireframe Box */}
      {hoverPos && (
          <mesh position={[hoverPos.x + 0.5, hoverPos.y + 0.5, hoverPos.z + 0.5]} raycast={() => null}>
              <boxGeometry args={[1.02, 1.02, 1.02]} />
              <meshBasicMaterial color={activeTool === 'eraser' ? '#ff4444' : '#00FFCC'} wireframe transparent opacity={0.8} depthTest={false} />
          </mesh>
      )}

      {/* Dynamic Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[canvasSize, canvasSize, canvasSize]} intensity={0.8} castShadow />
    </group>
  );
}