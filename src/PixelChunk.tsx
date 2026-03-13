import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { HistoryManager, type PixelDelta } from './history';

interface Props {
  color: string;
  position: [number, number, number];
  chunkSize: number;
  activeTool: string;
  onPickColor: (hex: string) => void;
}

export default function PixelChunk({ color, position, chunkSize, activeTool, onPickColor }: Props) {
  const chunkId = position.join(','); // Unique ID for this chunk
  const data = useMemo(() => new Uint8ClampedArray(chunkSize * chunkSize * 4).fill(255), [chunkSize]);
  
  const texture = useMemo(() => {
    const tex = new THREE.DataTexture(data, chunkSize, chunkSize, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter; 
    tex.needsUpdate = true;
    return tex;
  }, [data, chunkSize]);

  // Listen for global Undo/Redo events
  useEffect(() => {
    const handleHistory = (e: Event) => {
      const { stroke, isUndo } = (e as CustomEvent).detail;
      let needsUpdate = false;

      stroke.forEach((delta: PixelDelta) => {
        if (delta.chunkId !== chunkId) return; // Ignore if pixel belongs to another chunk
        
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

const draw = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    e.stopPropagation(); 
    if (!e.uv) return;

    // Bulletproof trigger
    if (e.type === 'pointerdown') HistoryManager.startStroke();

    const x = Math.floor(e.uv.x * chunkSize);
    const y = Math.floor(e.uv.y * chunkSize);
    const index = (y * chunkSize + x) * 4;

    if (activeTool === 'eyedropper') {
      const hex = "#" + (1 << 24 | data[index] << 16 | data[index+1] << 8 | data[index+2]).toString(16).slice(1);
      onPickColor(hex);
      return;
    }

    const newColor = activeTool === 'eraser' ? [255, 255, 255, 255] : [...hexToRgb(color), 255];
    const oldColor = [data[index], data[index+1], data[index+2], data[index+3]];

    HistoryManager.record(chunkId, index, oldColor, newColor);

    data[index] = newColor[0];       
    data[index + 1] = newColor[1];   
    data[index + 2] = newColor[2];   
    data[index + 3] = newColor[3]; 
    
    texture.needsUpdate = true;
  };

  return (
    <mesh position={position} onPointerDown={draw} onPointerMove={(e) => (e.buttons === 1 || e.pressure > 0) && draw(e)}>
      <planeGeometry args={[chunkSize, chunkSize]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}