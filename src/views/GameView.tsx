import { Clock, Trophy, Cuboid } from 'lucide-react';

interface GameViewProps {
    visible: boolean;
}

export function GameView({ visible }: GameViewProps) {
    return (
        <div style={{ display: visible ? 'block' : 'none', padding: '20px', paddingBottom: '100px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Live Arena</h2>

            <div style={{ background: 'linear-gradient(180deg, #1A1A24 0%, #0A0A0C 100%)', border: '1px solid #333', borderRadius: '24px', padding: '24px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: '#FF3366', filter: 'blur(80px)', opacity: 0.2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <span style={{ background: 'rgba(255,51,102,0.2)', color: '#FF3366', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block', marginBottom: '10px' }}>LIVE NOW</span>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>Pixel Royale</h3>
                        <span style={{ color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> Ends in 02:14:59</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#00FFCC', fontWeight: 'bold', fontSize: '18px' }}>500 USDC</span>
                        <div style={{ color: '#aaa', fontSize: '10px' }}>Prize Pool</div>
                    </div>
                </div>
                <button style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' }}>Enter Arena</button>
            </div>

            <h3 style={{ fontSize: '16px', margin: '20px 0 15px' }}>Mini Games</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                    <Trophy size={28} color="#FF9933" style={{ margin: '0 auto 10px' }} />
                    <h4 style={{ margin: '0 0 5px', fontSize: '14px' }}>Speed Draw</h4>
                    <span style={{ color: '#888', fontSize: '11px' }}>1v1 Battles</span>
                </div>
                <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                    <Cuboid size={28} color="#33CCFF" style={{ margin: '0 auto 10px' }} />
                    <h4 style={{ margin: '0 0 5px', fontSize: '14px' }}>Voxel Wars</h4>
                    <span style={{ color: '#888', fontSize: '11px' }}>3D Builder</span>
                </div>
            </div>
        </div>
    );
}