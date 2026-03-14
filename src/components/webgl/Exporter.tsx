import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import WebApp from '@twa-dev/sdk';

export const exportTrigger = { current: null as ((filename: string) => void) | null };

export function ExportManager({ canvasSize, setSaveModal }: { canvasSize: number, setSaveModal: (modal: any) => void }) {
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

                if (isTMA) {
                    // Fallback to modal with openLink logic if in Telegram app and share failed
                    const url = URL.createObjectURL(blob);
                    setSaveModal({ type: 'image', defaultName: filename, fallbackUrl: url });
                    return;
                }

                // Standard web fallback
                const link = document.createElement('a');
                link.download = fileName;
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 'image/png');
        };
    }, [gl, scene, canvasSize, setSaveModal]);

    return null;
}