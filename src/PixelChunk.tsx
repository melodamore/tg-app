import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { HistoryManager, LineManager, type PixelDelta } from './history';

interface Props {
  color?: string;
  position?: [number, number, number];
  chunkSize?: number;
  activeTool?: string;
  symMode?: 'X' | 'Y' | 'XY';
  onPickColor: (hex: string) => void;
}

export default function PixelChunk({ 
  color = '#00FFCC', 
  position = [0, 0, 0], 
  chunkSize = 64, 
  activeTool = 'pencil', 
  symMode = 'X', 
  onPickColor 
}: Props) {
  const chunkId = position.join(',');
  const data = useMemo(() => new Uint8ClampedArray(chunkSize * chunkSize * 4).fill(255), [chunkSize]);
  
  const texture = useMemo(() => {
    const tex = new THREE.DataTexture(data, chunkSize, chunkSize, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter; 
    tex.needsUpdate = true;
    return tex;
  }, [data, chunkSize]);

  useEffect(() => {
    const handleGlobalDraw = (e: Event) => {
      const { points, newColor } = (e as CustomEvent).detail;
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

          const oldColor = [data[index], data[index+1], data[index+2], data[index+3]];
          HistoryManager.record(chunkId, index, oldColor, newColor);

          data[index] = newColor[0];
          data[index+1] = newColor[1];
          data[index+2] = newColor[2];
          data[index+3] = newColor[3];
          needsUpdate = true;
        }
      });

      if (needsUpdate) texture.needsUpdate = true;
    };

    window.addEventListener('globalDraw', handleGlobalDraw);
    return () => window.removeEventListener('globalDraw', handleGlobalDraw);
  }, [position, chunkSize, data, texture, chunkId]);

  useEffect(() => {
    const handleHistory = (e: Event) => {
      const { stroke, isUndo } = (e as CustomEvent).detail;
      let needsUpdate = false;

      stroke.forEach((delta: PixelDelta) => {
        if (delta.chunkId !== chunkId) return;
        const targetColor = isUndo ? delta.oldColor : delta.newColor;
        data[delta.index] = targetColor[0];
        data[delta.index + 1] = targetColor[1];
        data[delta.index + 2] = targetColor[2];
        data[delta.index + 3] = targetColor[3];
        needsUpdate = true;
      });

      if (needsUpdate) texture.needsUpdate = true;
    };

    window.addEventListener('historyApply', handleHistory);
    return () => window.removeEventListener('historyApply', handleHistory);
  }, [chunkId, data, texture]);

  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  const getPixel = (x: number, y: number) => {
    const idx = (y * chunkSize + x) * 4;
    return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
  };

  const colorsMatch = (c1: number[], c2: number[]) => {
    return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
  };

  const floodFill = (startX: number, startY: number, fillRgb: number[]) => {
    const targetColor = getPixel(startX, startY);
    const newColor = [...fillRgb, 255];
    if (colorsMatch(targetColor, newColor)) return;

    HistoryManager.startStroke();
    const stack = [startX, startY];

    while (stack.length > 0) {
      const cy = stack.pop()!;
      const cx = stack.pop()!;
      const idx = (cy * chunkSize + cx) * 4;
      
      const currentColor = [data[idx], data[idx+1], data[idx+2], data[idx+3]];

      if (colorsMatch(currentColor, targetColor)) {
        HistoryManager.record(chunkId, idx, currentColor, newColor);
        data[idx] = newColor[0];
        data[idx+1] = newColor[1];
        data[idx+2] = newColor[2];
        data[idx+3] = newColor[3];

        if (cx > 0) stack.push(cx - 1, cy);
        if (cx < chunkSize - 1) stack.push(cx + 1, cy);
        if (cy > 0) stack.push(cx, cy - 1);
        if (cy < chunkSize - 1) stack.push(cx, cy + 1);
      }
    }
    HistoryManager.endStroke();
    texture.needsUpdate = true;
  };

  const getBresenhamPoints = (x0: number, y0: number, x1: number, y1: number) => {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
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

  const draw = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    e.stopPropagation(); 
    if (!e.uv) return;

    if (activeTool === 'line') {
      if (e.type === 'pointerdown') {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        LineManager.startX = Math.floor(e.point.x);
        LineManager.startY = Math.floor(e.point.y);
      } else if (e.type === 'pointermove' && LineManager.startX !== null && LineManager.startY !== null) {
        const endX = Math.floor(e.point.x);
        const endY = Math.floor(e.point.y);
        const points = getBresenhamPoints(LineManager.startX, LineManager.startY, endX, endY);
        
        window.dispatchEvent(new CustomEvent('linePreview', { 
          detail: { visible: true, points, color } 
        }));
      } else if (e.type === 'pointerup' && LineManager.startX !== null && LineManager.startY !== null) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        const endX = Math.floor(e.point.x);
        const endY = Math.floor(e.point.y);
        const points = getBresenhamPoints(LineManager.startX, LineManager.startY, endX, endY);
        
        LineManager.startX = null;
        LineManager.startY = null;

        window.dispatchEvent(new CustomEvent('linePreview', { detail: { visible: false } }));

        HistoryManager.startStroke();
        window.dispatchEvent(new CustomEvent('globalDraw', { 
          detail: { points, newColor: [...hexToRgb(color), 255] } 
        }));
        HistoryManager.endStroke();
      }
      return;
    }

    if (e.type === 'pointerdown') HistoryManager.startStroke();

    const x = Math.floor(e.uv.x * chunkSize);
    const y = Math.floor(e.uv.y * chunkSize);
    const index = (y * chunkSize + x) * 4;

    if (activeTool === 'eyedropper') {
      const hex = "#" + (1 << 24 | data[index] << 16 | data[index+1] << 8 | data[index+2]).toString(16).slice(1);
      onPickColor(hex);
      return;
    }

    if (activeTool === 'bucket' && e.type === 'pointerdown') {
      floodFill(x, y, hexToRgb(color));
      return;
    }

    const newColor = activeTool === 'eraser' ? [255, 255, 255, 255] : [...hexToRgb(color), 255];
    const points = [{ x: Math.floor(e.point.x), y: Math.floor(e.point.y) }];

    if (activeTool === 'symmetry') {
      if (symMode === 'X' || symMode === 'XY') points.push({ x: Math.floor(-e.point.x - 1), y: Math.floor(e.point.y) });
      if (symMode === 'Y' || symMode === 'XY') points.push({ x: Math.floor(e.point.x), y: Math.floor(-e.point.y - 1) });
      if (symMode === 'XY') points.push({ x: Math.floor(-e.point.x - 1), y: Math.floor(-e.point.y - 1) });
    }

    window.dispatchEvent(new CustomEvent('globalDraw', { detail: { points, newColor } }));
  };

  return (
    <mesh 
      position={position} 
      onPointerDown={draw} 
      onPointerMove={(e) => (e.buttons === 1 || e.pressure > 0) && draw(e)}
      onPointerUp={draw}
    >
      <planeGeometry args={[chunkSize, chunkSize]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}