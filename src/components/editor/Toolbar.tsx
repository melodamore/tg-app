import { ChevronDown, FolderOpen, Save, Download, Undo, Redo, Layers as LayersIcon, Palette, ClipboardPaste, Copy, Scissors, CopyPlus, Trash2, FlipHorizontal, FlipVertical, RotateCw, RotateCcw, PaintBucket, Check } from 'lucide-react';
import { SIZES, SHAPE_TOOLS } from '../../constants/tools';

const actionBtn = { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const selectBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, transition: '0.2s' };
const dividerStyle = { width: '1px', background: '#444', margin: '0 4px', flexShrink: 0 };

interface TopHUDProps {
    canvasSize: number;
    showSizeDropdown: boolean;
    setShowSizeDropdown: (v: boolean) => void;
    setCanvasSize: (s: number) => void;
    announce: (msg: string) => void;
    handleLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setSaveName: (name: string) => void;
    setSaveModal: (modal: any) => void;
    workspaceMode: '2d'|'3d';
    handleUndo: () => void;
    handleRedo: () => void;
    showLayersPanel: boolean;
    setShowLayersPanel: (v: boolean) => void;
}

export function TopHUD({ canvasSize, showSizeDropdown, setShowSizeDropdown, setCanvasSize, announce, handleLoadProject, setSaveName, setSaveModal, workspaceMode, handleUndo, handleRedo, showLayersPanel, setShowLayersPanel }: TopHUDProps) {
    return (
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
                <div onClick={() => setShowSizeDropdown(!showSizeDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15,15,20,0.85)', padding: '8px 12px', borderRadius: '12px', border: '1px solid #222', cursor: 'pointer' }}>
                    <span style={{ color: '#00FFCC', fontWeight: 'bold', fontSize: '14px' }}>{canvasSize}px</span>
                    <ChevronDown size={14} color="#888" />
                </div>
                {showSizeDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#1A1A24', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {SIZES.map(s => (
                            <button key={s} onClick={() => { setCanvasSize(s); setShowSizeDropdown(false); announce(`Canvas resized to ${s}px`); }} style={{ background: canvasSize === s ? '#2A2A35' : 'transparent', color: canvasSize === s ? '#00FFCC' : '#fff', border: 'none', padding: '10px 20px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>{s}px</button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '12px', background: 'rgba(15,15,20,0.85)', padding: '8px 12px', borderRadius: '12px', border: '1px solid #222' }}>
                <label style={actionBtn}>
                    <FolderOpen size={18} />
                    <input type="file" accept=".pxm" onChange={handleLoadProject} style={{display: 'none'}} />
                </label>
                <button onClick={() => { setSaveName('MyProject'); setSaveModal({type: 'project', defaultName: 'MyProject'}); }} style={actionBtn}><Save size={18} /></button>
                {workspaceMode === '2d' && (
                    <>
                        <div style={dividerStyle} />
                        <button onClick={() => { setSaveName('PixelArt'); setSaveModal({type: 'image', defaultName: 'PixelArt'}); }} style={actionBtn}><Download size={18} /></button>
                        <button onClick={handleUndo} style={actionBtn}><Undo size={18} /></button>
                        <button onClick={handleRedo} style={actionBtn}><Redo size={18} /></button>
                        <button onClick={() => setShowLayersPanel(!showLayersPanel)} style={{...actionBtn, color: showLayersPanel ? '#00FFCC' : '#fff'}}><LayersIcon size={18} /></button>
                    </>
                )}
            </div>
        </div>
    );
}

interface FloatingMenuProps {
    workspaceMode: '2d'|'3d';
    activeTool: string;
    symMode: 'X'|'Y'|'XY';
    setSymMode: (m: 'X'|'Y'|'XY') => void;
    shapeFill: boolean;
    setShapeFill: (v: boolean) => void;
    announce: (msg: string) => void;
    hasClipboard: boolean;
    hasSelection: boolean;
    handleSelectAction: (action: string) => void;
}

export function FloatingMenu({ workspaceMode, activeTool, symMode, setSymMode, shapeFill, setShapeFill, announce, hasClipboard, hasSelection, handleSelectAction }: FloatingMenuProps) {
    if (workspaceMode !== '2d') return null;

    return (
        <div style={{ position: 'absolute', bottom: '150px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(15,15,20,0.9)', padding: '6px 12px', borderRadius: '16px', border: '1px solid #333', backdropFilter: 'blur(10px)', maxWidth: '90%', overflowX: 'auto' }}>
            {activeTool === 'symmetry' && (
                <>
                    <button onClick={() => { setSymMode('X'); announce('Mirror X Mode'); }} style={{ background: symMode === 'X' ? '#00FFCC' : 'transparent', color: symMode === 'X' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Mirror X</button>
                    <button onClick={() => { setSymMode('Y'); announce('Mirror Y Mode'); }} style={{ background: symMode === 'Y' ? '#00FFCC' : 'transparent', color: symMode === 'Y' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Mirror Y</button>
                    <button onClick={() => { setSymMode('XY'); announce('Quad Mirror Mode'); }} style={{ background: symMode === 'XY' ? '#00FFCC' : 'transparent', color: symMode === 'XY' ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Quad (XY)</button>
                </>
            )}
            {SHAPE_TOOLS.includes(activeTool) && (
                <>
                    <button onClick={() => { setShapeFill(false); announce('Outline Mode'); }} style={{ background: !shapeFill ? '#00FFCC' : 'transparent', color: !shapeFill ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Outline</button>
                    <button onClick={() => { setShapeFill(true); announce('Fill Mode'); }} style={{ background: shapeFill ? '#00FFCC' : 'transparent', color: shapeFill ? '#000' : '#888', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}>Solid Fill</button>
                </>
            )}
            {activeTool === 'select' && (
                <>
                    <button onClick={() => handleSelectAction('paste')} style={{...selectBtnStyle, opacity: hasClipboard ? 1 : 0.3}} disabled={!hasClipboard}><ClipboardPaste size={14}/> Paste</button>
                    {hasSelection && <div style={dividerStyle} />}
                    {hasSelection && (
                        <>
                            <button onClick={() => handleSelectAction('copy')} style={selectBtnStyle}><Copy size={14}/> Copy</button>
                            <button onClick={() => handleSelectAction('cut')} style={selectBtnStyle}><Scissors size={14}/> Cut</button>
                            <button onClick={() => handleSelectAction('duplicate')} style={selectBtnStyle}><CopyPlus size={14}/> Clone</button>
                            <button onClick={() => handleSelectAction('delete')} style={{...selectBtnStyle, color: '#ff4444'}}><Trash2 size={14}/> Del</button>
                            <div style={dividerStyle} />
                            <button onClick={() => handleSelectAction('flipH')} style={selectBtnStyle}><FlipHorizontal size={14}/> Flip X</button>
                            <button onClick={() => handleSelectAction('flipV')} style={selectBtnStyle}><FlipVertical size={14}/> Flip Y</button>
                            <button onClick={() => handleSelectAction('rotateCW')} style={selectBtnStyle}><RotateCw size={14}/> 90° CW</button>
                            <button onClick={() => handleSelectAction('rotateCCW')} style={selectBtnStyle}><RotateCcw size={14}/> 90° CCW</button>
                            <div style={dividerStyle} />
                            <button onClick={() => handleSelectAction('fill')} style={selectBtnStyle}><PaintBucket size={14}/> Fill</button>
                            <button onClick={() => handleSelectAction('commit')} style={{...selectBtnStyle, color: '#00FFCC'}}><Check size={14}/> Apply</button>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

interface BottomHUDProps {
    showPalettePanel: boolean;
    setShowPalettePanel: (v: boolean) => void;
    color: string;
    setTempColorHex: (hex: string) => void;
    setColorPickerTarget: (t: 'main'|'grid'|'bg'|null) => void;
    activeToolList: any[];
    activeTool: string;
    handleToolChange: (id: string) => void;
    workspaceMode: '2d'|'3d';
}

export function BottomHUD({ showPalettePanel, setShowPalettePanel, color, setTempColorHex, setColorPickerTarget, activeToolList, activeTool, handleToolChange, workspaceMode }: BottomHUDProps) {
    return (
        <div style={{ position: 'absolute', bottom: 85, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(15,15,20,0.85)', padding: '10px 15px', borderRadius: '24px', border: '1px solid #222', width: '90%', maxWidth: '800px', overflowX: 'auto' }}>
            <button onClick={() => setShowPalettePanel(!showPalettePanel)} style={{ background: 'transparent', border: 'none', color: showPalettePanel ? '#00FFCC' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <Palette size={20} />
                <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Themes</span>
            </button>
            <div style={{ width: '1px', height: '30px', background: '#333', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div onClick={() => { setTempColorHex(color); setColorPickerTarget('main'); }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: color, border: '2px solid #fff', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>COLOR</span>
            </div>
            <div style={{ width: '1px', height: '30px', background: '#333', flexShrink: 0 }} />
            {activeToolList.map(t => (
                <button
                    key={t.id}
                    onClick={() => handleToolChange(t.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: activeTool === t.id ? '#00FFCC' : '#666', cursor: 'pointer', minWidth: '40px', transition: '0.2s', flexShrink: 0 }}
                >
                    <t.icon size={20} strokeWidth={activeTool === t.id ? 2.5 : 1.5} />
                    <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{workspaceMode === '3d' && t.id === 'pencil' ? 'Place' : workspaceMode === '3d' && t.id === 'eraser' ? 'Break' : t.label}</span>
                </button>
            ))}
        </div>
    );
}