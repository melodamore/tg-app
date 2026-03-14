import { X } from 'lucide-react';
import { PALETTES } from '../../constants/tools';

interface ColorPickerProps {
    target: 'main'|'grid'|'bg'|null;
    tempColorHex: string;
    setTempColorHex: (hex: string) => void;
    onClose: () => void;
    onApply: (hex: string, target: 'main'|'grid'|'bg') => void;
}

export function ColorPicker({ target, tempColorHex, setTempColorHex, onClose, onApply }: ColorPickerProps) {
    if (!target) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '16px', width: '260px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Choose Color</span>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: tempColorHex || '#000', border: '1px solid #444' }} />
                    <input type="text" value={tempColorHex} onChange={(e) => setTempColorHex(e.target.value)} placeholder="#HEXCODE" style={{ flex: 1, background: '#0A0A0C', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '8px', outline: 'none', textTransform: 'uppercase' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {PALETTES[0].colors.map((c, i) => (
                        <div key={i} onClick={() => setTempColorHex(c)} style={{ width: '24px', height: '24px', borderRadius: '4px', background: c, cursor: 'pointer', border: '1px solid #444' }} />
                    ))}
                </div>
                <button onClick={() => onApply(tempColorHex, target)} style={{ width: '100%', background: '#00FFCC', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Apply Color</button>
            </div>
        </div>
    );
}