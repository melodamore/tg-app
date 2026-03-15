import { useState, useEffect } from 'react';
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

export function OnboardingModal({ isOpen, onComplete }: { isOpen: boolean, onComplete: (data: any) => void }) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [id, setId] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);

    useEffect(() => {
        const user = WebApp.initDataUnsafe?.user;
        if (user) {
            setUsername(user.username || '');
            setId(user.id?.toString() || '');
        } else {
            // Fallback for local browser testing
            setId(Math.floor(Math.random() * 1000000000).toString());
        }
    }, []);

    if (!isOpen) return null;

    const inputStyle = { width: '100%', boxSizing: 'border-box' as const, background: '#0A0A0C', border: '1px solid #444', color: '#fff', padding: '12px', borderRadius: '8px', margin: '15px 0', outline: 'none' };
    
    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setAvatar(URL.createObjectURL(e.target.files[0]));
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: '320px', textAlign: 'center', marginTop: step === 1 ? '180px' : '0', transition: 'margin 0.3s' }}>
                
                {step === 1 && (
                    <>
                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', paddingBottom: '15px' }}>
                            <div style={{ background: '#222', padding: '6px', borderRadius: '16px', boxShadow: '0 15px 35px rgba(0,0,0,0.8), 0 -10px 30px rgba(0,255,204,0.15)', transform: 'perspective(600px) rotateX(5deg)', transformOrigin: 'bottom', border: '1px solid #444' }}>
                                <img src="https://i.ibb.co/39yh5dts/5886499923715362062.jpg" alt="Guide" style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '10px', display: 'block', border: '2px solid #00FFCC' }} />
                            </div>
                        </div>
                        <h2 style={{ margin: '0 0 10px 0', color: '#00FFCC' }}>Welcome to PixelMint!</h2>
                        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '20px' }}>I'll be your guide. Let's set up your creator profile to get started.</p>
                        <button onClick={nextStep} style={{ width: '100%', background: '#00FFCC', color: '#000', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Let's Go!</button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h3 style={{ margin: 0 }}>What's your name?</h3>
                        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: '#333', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none' }}>Back</button>
                            <button onClick={nextStep} disabled={!name} style={{ flex: 1, background: name ? '#00FFCC' : '#444', color: '#000', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Next</button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h3 style={{ margin: 0 }}>Choose a Username</h3>
                        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: '#333', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none' }}>Back</button>
                            <button onClick={nextStep} disabled={!username} style={{ flex: 1, background: username ? '#00FFCC' : '#444', color: '#000', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Next</button>
                        </div>
                    </>
                )}

                {step === 4 && (
                    <>
                        <h3 style={{ margin: 0 }}>Your ID</h3>
                        <p style={{ fontSize: '12px', color: '#aaa', margin: '8px 0 0' }}>This is your unique Telegram ID.</p>
                        <input value={id} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: '#333', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none' }}>Back</button>
                            <button onClick={nextStep} disabled={!id} style={{ flex: 1, background: id ? '#00FFCC' : '#444', color: '#000', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Next</button>
                        </div>
                    </>
                )}

                {step === 5 && (
                    <>
                        <h3 style={{ margin: 0 }}>Profile Picture</h3>
                        <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                            {avatar ? (
                                <img src={avatar} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['https://api.dicebear.com/7.x/bottts/svg?seed=1', 'https://api.dicebear.com/7.x/bottts/svg?seed=2', 'https://api.dicebear.com/7.x/bottts/svg?seed=3'].map(url => (
                                        <img key={url} src={url} onClick={() => setAvatar(url)} style={{ width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', border: avatar === url ? '2px solid #00FFCC' : '2px solid transparent' }} />
                                    ))}
                                </div>
                            )}
                            <label style={{ cursor: 'pointer', color: '#00FFCC', fontSize: '14px', textDecoration: 'underline' }}>
                                Or upload an image
                                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: '#333', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none' }}>Back</button>
                            <button onClick={() => onComplete({ name, username, id, avatar })} disabled={!avatar} style={{ flex: 1, background: avatar ? '#00FFCC' : '#444', color: '#000', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Finish</button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}