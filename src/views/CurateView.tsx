import { useState } from 'react';
import { Flame, X, Heart } from 'lucide-react';

const MOCK_NFTS = [
    { id: 1, color: 'linear-gradient(135deg, #FF3366, #FF9933)', name: 'Cyber Punk #01', author: '0xAlice' },
    { id: 2, color: 'linear-gradient(135deg, #33CCFF, #3366FF)', name: 'Voxel Ape', author: '0xBob' },
    { id: 3, color: 'linear-gradient(135deg, #00FFCC, #009999)', name: 'Neon Sword', author: '0xCharlie' }
];

interface CurateViewProps {
    visible: boolean;
}

export function CurateView({ visible }: CurateViewProps) {
    const [index, setIndex] = useState(0);
    const current = MOCK_NFTS[index % MOCK_NFTS.length];

    return (
        <div style={{ display: visible ? 'flex' : 'none', flexDirection: 'column', height: '100%', padding: '20px', paddingBottom: '100px', boxSizing: 'border-box', alignItems: 'center', background: '#0A0A0C' }}>
            <h2 style={{width: '100%', textAlign: 'left', marginTop: 0, fontSize: '20px'}}>Curate & Earn</h2>
            <p style={{width: '100%', textAlign: 'left', color: '#888', fontSize: '12px', marginTop: '-10px', marginBottom: '20px'}}>Swipe to vote on community art.</p>

            <div key={index} style={{ flex: 1, width: '100%', maxWidth: '400px', background: current.color, borderRadius: '32px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px', boxSizing: 'border-box', animation: 'swipeIn 0.3s ease-out' }}>
                <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                    <Flame size={12} color="#FF9933" style={{ display: 'inline', marginRight: '4px' }}/> Trending
                </div>
                <h3 style={{ margin: 0, fontSize: '32px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{current.name}</h3>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '5px' }}>by {current.author}</span>
            </div>

            <div style={{ display: 'flex', gap: '30px', marginTop: '30px', marginBottom: '20px' }}>
                <button onClick={() => setIndex(i => i+1)} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #333', background: '#1A1A24', color: '#ff4444', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', cursor: 'pointer' }}><X size={32} /></button>
                <button onClick={() => setIndex(i => i+1)} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #00FFCC', background: 'rgba(0,255,204,0.1)', color: '#00FFCC', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,255,204,0.2)', cursor: 'pointer' }}><Heart size={32} fill="#00FFCC" /></button>
            </div>
        </div>
    );
}