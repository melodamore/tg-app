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
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#18181B', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '300px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                <Trash2 size={28} color="#EF4444" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>{modal.title}</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#A1A1AA', lineHeight: '1.4' }}>{modal.text}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: 'none', color: '#A1A1AA', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button onClick={() => { modal.onConfirm(); onClose(); }} style={{ flex: 1, background: '#EF4444', border: 'none', color: '#FFF', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
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
            <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#18181B', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '300px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>Manual Download</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#A1A1AA', lineHeight: '1.4' }}>Direct saving is restricted here. Please open the link in your browser to download.</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: 'none', color: '#A1A1AA', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                        <button onClick={() => { WebApp.openLink(modal.fallbackUrl!); onClose(); }} style={{ flex: 1, background: '#00FFCC', border: 'none', color: '#000', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Open Link</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#18181B', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '300px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', textAlign: 'center', fontWeight: 600 }}>{modal.type === 'project' ? 'Save Project' : 'Export Image'}</h3>
                <input autoFocus type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="File name..." style={{ width: '100%', boxSizing: 'border-box', background: '#27272A', border: 'none', color: '#FFF', padding: '16px', borderRadius: '12px', marginBottom: '24px', outline: 'none', fontSize: '15px' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: 'none', color: '#A1A1AA', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button onClick={() => { if (!saveName.trim()) return; onSave(saveName); }} style={{ flex: 1, background: '#00FFCC', border: 'none', color: '#000', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>{modal.type === 'project' ? 'Save' : 'Export'}</button>
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

    const inputStyle = { width: '100%', boxSizing: 'border-box' as const, background: '#27272A', border: 'none', color: '#FFF', padding: '16px', borderRadius: '12px', margin: '20px 0', outline: 'none', fontSize: '15px' };
    
    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setAvatar(URL.createObjectURL(e.target.files[0]));
        }
    };

    // Array of different images to display above the modal depending on the active step
    const stepImages = [
        "https://i.ibb.co/39yh5dts/5886499923715362062.jpg", // Step 1: Welcome
        "https://i.ibb.co/fdgxq4RB/unnamed.jpg", // Step 2: Name
        "https://api.dicebear.com/7.x/bottts/svg?seed=username&backgroundColor=18181B", // Step 3: Username
        "https://api.dicebear.com/7.x/bottts/svg?seed=id&backgroundColor=18181B"  // Step 4: ID
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
                position: 'relative', 
                background: '#18181B', 
                borderRadius: '24px', 
                padding: step < 5 ? '96px 24px 24px' : '32px 24px 24px', 
                width: '100%', 
                maxWidth: '320px', 
                textAlign: 'center', 
                marginTop: step < 5 ? '60px' : '0', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
            }}>
                
                {/* Minimalist flat offset avatar - changes dynamically based on current step */}
                {step < 5 && (
                    <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)' }}>
                        <img src={stepImages[step - 1]} alt={`Guide for step ${step}`} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '20px', display: 'block', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', background: '#27272A' }} />
                    </div>
                )}
                
                {step === 1 && (
                    <>
                        <h2 style={{ margin: '0 0 8px 0', color: '#FFF', fontSize: '22px', fontWeight: 600 }}>PixelMint</h2>
                        <p style={{ fontSize: '14px', color: '#A1A1AA', marginBottom: '32px', lineHeight: '1.5' }}>I'll be your guide. Let's set up your creator profile to get started.</p>
                        <button onClick={nextStep} style={{ width: '100%', background: '#00FFCC', color: '#000', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Let's Go</button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '20px' }}>What's your name?</h3>
                        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Display name" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: 'transparent', color: '#A1A1AA', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Back</button>
                            <button onClick={nextStep} disabled={!name} style={{ flex: 1, background: name ? '#00FFCC' : '#27272A', color: name ? '#000' : '#71717A', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Next</button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '20px' }}>Choose a Username</h3>
                        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: 'transparent', color: '#A1A1AA', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Back</button>
                            <button onClick={nextStep} disabled={!username} style={{ flex: 1, background: username ? '#00FFCC' : '#27272A', color: username ? '#000' : '#71717A', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Next</button>
                        </div>
                    </>
                )}

                {step === 4 && (
                    <>
                        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '20px' }}>Your ID</h3>
                        <p style={{ fontSize: '13px', color: '#A1A1AA', margin: '8px 0 0' }}>Your unique Telegram identifier.</p>
                        <input value={id} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: 'transparent', color: '#A1A1AA', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Back</button>
                            <button onClick={nextStep} disabled={!id} style={{ flex: 1, background: id ? '#00FFCC' : '#27272A', color: id ? '#000' : '#71717A', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Next</button>
                        </div>
                    </>
                )}

                {step === 5 && (
                    <>
                        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '20px' }}>Profile Picture</h3>
                        <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                            {avatar ? (
                                <img src={avatar} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {['https://api.dicebear.com/7.x/bottts/svg?seed=1', 'https://api.dicebear.com/7.x/bottts/svg?seed=2', 'https://api.dicebear.com/7.x/bottts/svg?seed=3'].map(url => (
                                        <img key={url} src={url} onClick={() => setAvatar(url)} style={{ width: '56px', height: '56px', borderRadius: '12px', cursor: 'pointer', opacity: avatar === url ? 1 : 0.6, border: avatar === url ? '2px solid #00FFCC' : '2px solid transparent', transition: 'all 0.2s' }} />
                                    ))}
                                </div>
                            )}
                            <label style={{ cursor: 'pointer', color: '#A1A1AA', fontSize: '14px', fontWeight: 500 }}>
                                <span style={{ textDecoration: 'underline' }}>Upload an image</span>
                                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button onClick={prevStep} style={{ flex: 1, background: 'transparent', color: '#A1A1AA', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Back</button>
                            <button onClick={() => onComplete({ name, username, id, avatar })} disabled={!avatar} style={{ flex: 1, background: avatar ? '#00FFCC' : '#27272A', color: avatar ? '#000' : '#71717A', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 600 }}>Finish</button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}