import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { SelectionManager } from '../../store/history';

export function ShapePreview() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [visible, setVisible] = useState(false);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        const handlePreview = (e: Event) => {
            const { visible, points, color } = (e as CustomEvent).detail;
            if (!visible) { setVisible(false); return; }
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

export function SelectionOverlay() {
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