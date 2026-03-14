import { Box, Wallet, TrendingUp, Brush, Zap, Compass, Gamepad2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface HomeViewProps {
    visible: boolean;
    onNavigate: (tab: 'home' | 'curate' | 'studio' | 'game' | 'profile') => void;
}

export function HomeView({ visible, onNavigate }: HomeViewProps) {
    const user = WebApp.initDataUnsafe?.user;
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Artist';

    return (
        <div style={{ display: visible ? 'block' : 'none', padding: '20px', paddingBottom: '100px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #00FFCC, #3366FF)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Box color="#000" size={20} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Prixm</h1>
                </div>
                <div style={{ background: '#1A1A24', border: '1px solid #333', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Wallet size={14} color="#00FFCC" /> 0x71...97A1
                </div>
            </div>

            <div style={{ textAlign: 'center', margin: '40px 0', animation: 'float 6s ease-in-out infinite' }}>
                <h3 style={{ fontSize: '20px', margin: '0 0 10px 0', color: '#aaa', fontWeight: 'normal' }}>Welcome, {userName}</h3>
                <h1 style={{ fontSize: '48px', margin: 0, background: 'linear-gradient(135deg, #00FFCC, #3366FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(0,255,204,0.2))' }}>CREATE.</h1>
                <h1 style={{ fontSize: '48px', margin: 0, background: 'linear-gradient(135deg, #FF3366, #FF9933)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EARN.</h1>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(20,20,30,0.8), rgba(10,10,15,0.9))', border: '1px solid #333', borderRadius: '24px', padding: '24px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <span style={{ color: '#888', fontSize: '12px', fontWeight: 'bold' }}>TOTAL ASSETS VALUE</span>
                <h2 style={{ fontSize: '32px', margin: '10px 0', fontFamily: 'monospace' }}>$4,250.00</h2>
                <div style={{ display: 'flex', gap: '10px', color: '#00FFCC', fontSize: '14px', fontWeight: 'bold', alignItems: 'center' }}>
                    <TrendingUp size={16} /> +12.4% Today
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button onClick={() => onNavigate('studio')} style={{ flex: 1, background: '#00FFCC', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><Brush size={18}/> Start Drawing</button>
                </div>
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} color="#FF9933" /> Quick Links</h3>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                {[{t: 'Studio', i: Brush, c: '#00FFCC'}, {t: 'Curate', i: Compass, c: '#FF3366'}, {t: 'Game', i: Gamepad2, c: '#3366FF'}].map((item, i) => (
                    <div key={i} onClick={() => onNavigate(item.t.toLowerCase() as any)} style={{ minWidth: '100px', background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '15px', textAlign: 'center', cursor: 'pointer' }}>
                        <item.i size={24} color={item.c} style={{ margin: '0 auto 10px' }} />
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.t}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}