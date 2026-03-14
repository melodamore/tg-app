import { Plus, Eye, EyeOff, Trash } from 'lucide-react';
import { PALETTES } from '../../constants/tools';
import type { Layer } from '../webgl/PixelChunk';

interface LayersPanelProps {
    showLayersPanel: boolean;
    workspaceMode: '2d'|'3d';
    layers: Layer[];
    activeLayerId: string;
    setActiveLayerId: (id: string) => void;
    addLayer: () => void;
    toggleLayerVis: (id: string) => void;
    updateLayerOpac: (id: string, opacity: number) => void;
    removeLayer: (id: string) => void;
}

export function LayersPanel({ showLayersPanel, workspaceMode, layers, activeLayerId, setActiveLayerId, addLayer, toggleLayerVis, updateLayerOpac, removeLayer }: LayersPanelProps) {
    if (!showLayersPanel || workspaceMode !== '2d') return null;

    return (
        <div style={{ position: 'absolute', top: '60px', right: '10px', zIndex: 20, width: '220px', background: 'rgba(20,20,25,0.95)', border: '1px solid #333', borderRadius: '12px', padding: '10px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #333' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa' }}>LAYERS</span>
                <button onClick={addLayer} style={{ background: '#00FFCC', color: '#000', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex' }}><Plus size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {layers.map(layer => (
                    <div key={layer.id} onClick={() => setActiveLayerId(layer.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: activeLayerId === layer.id ? '#2A2A35' : 'transparent', border: `1px solid ${activeLayerId === layer.id ? '#00FFCC' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer' }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleLayerVis(layer.id); }} style={{ background: 'transparent', border: 'none', color: layer.visible ? '#fff' : '#444', cursor: 'pointer', display: 'flex', padding: 0 }}>{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                        <span style={{ fontSize: '12px', flexGrow: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{layer.name}</span>
                        <input type="range" min="0" max="1" step="0.1" value={layer.opacity} onClick={(e) => e.stopPropagation()} onChange={(e) => updateLayerOpac(layer.id, Number(e.target.value))} style={{ width: '40px', accentColor: '#00FFCC' }} />
                        <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', padding: 0, opacity: layers.length > 1 ? 1 : 0.3 }} disabled={layers.length <= 1}><Trash size={14} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface PalettePanelProps {
    showPalettePanel: boolean;
    setShowPalettePanel: (v: boolean) => void;
    setColor: (color: string) => void;
    handleToolChange: (tool: string) => void;
    announce: (msg: string) => void;
}

export function PalettePanel({ showPalettePanel, setShowPalettePanel, setColor, handleToolChange, announce }: PalettePanelProps) {
    if (!showPalettePanel) return null;

    return (
        <div style={{ position: 'absolute', bottom: '150px', left: '10px', zIndex: 20, width: '320px', background: 'rgba(20,20,25,0.95)', border: '1px solid #333', borderRadius: '12px', padding: '15px', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', display: 'block', marginBottom: '10px' }}>52 PRESET THEMES</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {PALETTES.map((pal, i) => (
                    <div key={i} style={{ display: 'flex', border: '1px solid #444', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setShowPalettePanel(false)}>
                        {pal.colors.map((c, j) => (
                            <div key={j} onClick={() => { setColor(c); handleToolChange('pencil'); announce(`Color picked from Theme ${i+1}`); }} style={{ width: '16px', height: '16px', background: c }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}