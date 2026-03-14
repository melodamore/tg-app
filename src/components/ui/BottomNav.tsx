import { Home, Compass, Brush, Gamepad2, User } from 'lucide-react';

interface BottomNavProps {
    appTab: 'home'|'curate'|'studio'|'game'|'profile';
    setAppTab: (tab: 'home'|'curate'|'studio'|'game'|'profile') => void;
}

export function BottomNav({ appTab, setAppTab }: BottomNavProps) {
    return (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '70px', background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'curate', label: 'Curate', icon: Compass },
                { id: 'studio', label: 'Studio', icon: Brush },
                { id: 'game', label: 'Play', icon: Gamepad2 },
                { id: 'profile', label: 'Profile', icon: User }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setAppTab(tab.id as any)}
                    style={{ background: 'transparent', border: 'none', color: appTab === tab.id ? '#00FFCC' : '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s', flex: 1 }}
                >
                    <tab.icon size={24} strokeWidth={appTab === tab.id ? 2.5 : 2} />
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}