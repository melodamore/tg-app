import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function OrthographicCameraController({ targetPos, targetZoom }: any) {
    useFrame((state) => {
        state.camera.position.lerp(new THREE.Vector3(targetPos.current.x, targetPos.current.y, 100), 0.2);
        // @ts-ignore
        state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, targetZoom.current, 0.2);
        state.camera.updateProjectionMatrix();
    });
    return null;
}

export function PerspectiveOrbitController({ canvasSize }: { canvasSize: number }) {
    const { camera, gl } = useThree();
    useEffect(() => {
        const controls = new OrbitControls(camera, gl.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.target.set(0, canvasSize > 16 ? 5 : 2, 0);
        return () => controls.dispose();
    }, [camera, gl, canvasSize]);
    useFrame(() => camera.updateProjectionMatrix());
    return null;
}