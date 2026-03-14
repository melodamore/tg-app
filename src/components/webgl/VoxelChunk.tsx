import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';

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
    // Fixed unused variable `state` -> `_state`
    useFrame((_state, delta) => {
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