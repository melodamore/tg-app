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
    const [useTelegramName, setUseTelegramName] = useState(false);
    
    // Focus & Preloader states
    const [isFocused, setIsFocused] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);

    const stepImages = [
        "https://i.ibb.co/3YGGMmS9/Welcome.png",      
        "https://i.ibb.co/7dwwQGfQ/Display-Name.png", 
        "https://i.ibb.co/KxrrjPZ4/Username.png",     
        "https://i.ibb.co/Jjz9m1V5/ID.png",           
        "https://i.ibb.co/5X7dGWDF/Profile.png"       
    ];

    const tgUser = WebApp.initDataUnsafe?.user;
    const tgFullName = tgUser ? `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() : '';

    // Mobile Keyboard Dismiss Detection
    useEffect(() => {
        if (!isOpen) return;
        let maxHeight = window.innerHeight;
        const handleResize = () => {
            const currentHeight = window.innerHeight;
            if (currentHeight > maxHeight) maxHeight = currentHeight;
            if (currentHeight >= maxHeight - 50) {
                if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur(); 
            }
        };
        window.addEventListener('resize', handleResize);
        window.visualViewport?.addEventListener('resize', handleResize);
        if (WebApp && typeof WebApp.onEvent === 'function') WebApp.onEvent('viewportChanged', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('resize', handleResize);
            if (WebApp && typeof WebApp.offEvent === 'function') WebApp.offEvent('viewportChanged', handleResize);
        };
    }, [isOpen]);

    // Preload images logic
    useEffect(() => {
        if (!isOpen) return;
        let loaded = 0;
        const total = stepImages.length;
        stepImages.forEach((src) => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loaded++;
                setLoadProgress(Math.round((loaded / total) * 100));
                if (loaded === total) setTimeout(() => setImagesLoaded(true), 400);
            };
            img.src = src;
        });
    }, [isOpen]);

    useEffect(() => {
        if (tgUser) {
            setUsername(tgUser.username || '');
            // Convert ID to a shorter, unique base-36 string
            setId(Number(tgUser.id).toString(36).toUpperCase());
        }
    }, []);

    if (!isOpen) return null;

    if (!imagesLoaded) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '80%', maxWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#00FFCC', fontWeight: 600, fontSize: '15px' }}>
                        <span>Waking up Pixie...</span><span>{loadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${loadProgress}%`, background: '#00FFCC', transition: 'width 0.2s ease-out', boxShadow: '0 0 10px #00FFCC' }} />
                    </div>
                </div>
            </div>
        );
    }

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setAvatar(URL.createObjectURL(e.target.files[0]));
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#FFF', padding: '18px 20px', borderRadius: '16px', margin: '16px 0 32px', outline: 'none', fontSize: '16px', backdropFilter: 'blur(12px)', transition: 'border-color 0.2s ease' };
    const primaryBtnStyle = { flex: 1, background: '#00FFCC', color: '#000', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '16px', boxShadow: '0 8px 24px rgba(0, 255, 204, 0.25)', transition: 'transform 0.1s' };
    const secondaryBtnStyle = { flex: 1, background: 'rgba(255, 255, 255, 0.1)', color: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '16px' };
    const disabledBtnStyle = { ...primaryBtnStyle, background: '#27272A', color: '#71717A', boxShadow: 'none', cursor: 'not-allowed' };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: '#000000', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadein 0.4s ease-out' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70%', background: '#000', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', filter: isFocused ? 'brightness(0.4)' : 'brightness(1)', transition: 'filter 0.3s ease-out' }}>
                <div style={{ position: 'absolute', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(0, 255, 204, 0.45) 0%, rgba(0, 0, 0, 0) 70%)', borderRadius: '50%', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }} />
                <img src={stepImages[step - 1]} alt="Character guide Pixie" style={{ width: '300px', height: '300px', objectFit: 'contain', zIndex: 2, filter: 'contrast(1.15) brightness(0.95) saturate(1.1) drop-shadow(0 0 12px rgba(0, 255, 204, 0.3))', transition: 'opacity 0.3s ease-out' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', padding: '40px 24px 48px', display: 'flex', flexDirection: 'column', animation: 'swipeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: '4px', width: step === i ? '24px' : '12px', borderRadius: '4px', background: step >= i ? '#00FFCC' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }} />)}
                </div>

                <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    {step === 1 && (
                        <>
                            <h2 style={{ margin: '0 0 12px 0', color: '#FFF', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>Hi, I am Pixie!</h2>
                            <p style={{ fontSize: '16px', color: '#A1A1AA', marginBottom: '40px', lineHeight: '1.6' }}>I'll be your guide today. Let's set up your creator profile to get started.</p>
                            <button onClick={nextStep} style={primaryBtnStyle}>Let's Go</button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h3 style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '26px' }}>What's your name?</h3>
                            <p style={{ fontSize: '15px', color: '#A1A1AA', margin: '0 0 16px' }}>Let's get to know each other.</p>
                            
                            {tgFullName && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', color: '#A1A1AA', fontSize: '14px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={useTelegramName} 
                                        onChange={(e) => {
                                            setUseTelegramName(e.target.checked);
                                            if (e.target.checked) setName(tgFullName);
                                        }} 
                                        style={{ accentColor: '#00FFCC' }}
                                    />
                                    Use my Telegram name
                                </label>
                            )}

                            <input value={name} onChange={e => { setName(e.target.value); setUseTelegramName(false); }} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="Display name" style={{...inputStyle, margin: '8px 0 32px'}} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={prevStep} style={secondaryBtnStyle}>Back</button>
                                <button onClick={nextStep} disabled={!name} style={name ? primaryBtnStyle : disabledBtnStyle}>Next</button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h3 style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '26px' }}>Choose a Username</h3>
                            <p style={{ fontSize: '15px', color: '#A1A1AA', margin: '0 0 8px' }}>So <span style={{ color: '#00FFCC', fontWeight: 600 }}>{name}</span>, this is how friends will find you.</p>
                            
                            {!tgUser?.username && (
                                <p style={{ color: '#EF4444', fontSize: '14px', margin: '8px 0 0' }}>⚠️ A Telegram username is required to use this app. Please set one in your Telegram settings.</p>
                            )}

                            <input value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="@username" style={inputStyle} disabled={!tgUser?.username} />
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={prevStep} style={secondaryBtnStyle}>Back</button>
                                <button onClick={nextStep} disabled={!username || !tgUser?.username} style={(username && tgUser?.username) ? primaryBtnStyle : disabledBtnStyle}>Next</button>
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h3 style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '26px' }}>Your Unique ID</h3>
                            <p style={{ fontSize: '15px', color: '#A1A1AA', margin: '0 0 8px' }}>Your secure, calculated identifier.</p>
                            <input value={id} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed', color: '#00FFCC' }} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={prevStep} style={secondaryBtnStyle}>Back</button>
                                <button onClick={nextStep} disabled={!id} style={id ? primaryBtnStyle : disabledBtnStyle}>Next</button>
                            </div>
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <h3 style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '26px' }}>Profile Picture</h3>
                            <p style={{ fontSize: '15px', color: '#A1A1AA', margin: '0 0 8px' }}>Show off your style.</p>
                            <div style={{ margin: '16px 0 32px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                {avatar ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={avatar} alt="Avatar" style={{ width: '96px', height: '96px', borderRadius: '32px', objectFit: 'cover', border: '3px solid #00FFCC' }} />
                                        <button onClick={() => setAvatar(null)} style={{ position: 'absolute', top: -8, right: -8, background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        {['https://api.dicebear.com/7.x/bottts/svg?seed=1', 'https://api.dicebear.com/7.x/bottts/svg?seed=2', 'https://api.dicebear.com/7.x/bottts/svg?seed=3'].map(url => <img key={url} src={url} onClick={() => setAvatar(url)} style={{ width: '64px', height: '64px', borderRadius: '20px', cursor: 'pointer', opacity: avatar === url ? 1 : 0.6, border: avatar === url ? '3px solid #00FFCC' : '3px solid transparent', transition: 'all 0.2s', background: 'rgba(255,255,255,0.05)' }} />)}
                                    </div>
                                )}
                                {!avatar && (
                                    <label style={{ cursor: 'pointer', color: '#00FFCC', fontSize: '15px', fontWeight: 600, padding: '8px 16px', background: 'rgba(0, 255, 204, 0.1)', borderRadius: '12px' }}>
                                        Upload your own
                                        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                                    </label>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={prevStep} style={secondaryBtnStyle}>Back</button>
                                <button onClick={() => onComplete({ name, username, id, avatar })} disabled={!avatar} style={avatar ? primaryBtnStyle : disabledBtnStyle}>Complete Setup</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}