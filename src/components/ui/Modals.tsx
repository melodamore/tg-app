import { Trash2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface ConfirmModalProps {
    modal: { title: string, text: string, onConfirm: () => void } | null;
    onClose: () => void;
}

export function ConfirmModal({ modal, onClose }: ConfirmModalProps) {
    if (!modal) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: '300px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                <Trash2 size={32} color="#ff4444" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{modal.title}</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#aaa' }}>{modal.text}</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #555', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    <button onClick={() => { modal.onConfirm(); onClose(); }} style={{ background: '#ff4444', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                </div>
            </div>
        </div>
    );
}

interface SaveModalProps {
    modal: { type: 'project'|'image', defaultName: string, fallbackUrl?: string } | null;
    saveName: string;
    setSaveName: (name: string) => void;
    onClose: () => void;
    onSave: (name: string) => void;
}

export function SaveModal({ modal, saveName, setSaveName, onClose, onSave }: SaveModalProps) {
    if (!modal) return null;

    if (modal.fallbackUrl) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: '300px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Open in Browser to Download</h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#aaa' }}>Saving files directly is restricted in Telegram Mini Apps on some devices. Please open the link in your browser to download.</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #555', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                        <button onClick={() => { WebApp.openLink(modal.fallbackUrl!); onClose(); }} style={{ flex: 1, background: '#00FFCC', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Open Link</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: '300px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', textAlign: 'center' }}>{modal.type === 'project' ? 'Save Project' : 'Export Image'}</h3>
                <input autoFocus type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="File name..." style={{ width: '100%', boxSizing: 'border-box', background: '#0A0A0C', border: '1px solid #444', color: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '20px', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #555', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    <button onClick={() => { if (!saveName.trim()) return; onSave(saveName); }} style={{ flex: 1, background: '#00FFCC', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{modal.type === 'project' ? 'Save' : 'Export'}</button>
                </div>
            </div>
        </div>
    );
}