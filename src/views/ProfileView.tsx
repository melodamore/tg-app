import { Settings, User, Award } from 'lucide-react';

interface ProfileViewProps {
    visible: boolean;
}

export function ProfileView({ visible }: ProfileViewProps) {
    return (
        <div style={{ display: visible ? 'block' : 'none', padding: '20px', paddingBottom: '100px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', margin: 0 }}>Profile</h2>
                <Settings size={20} color="#888" cursor="pointer" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(45deg, #00FFCC, #3366FF)', padding: '4px', marginBottom: '15px' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0A0A0C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={36} color="#fff" />
                    </div>
                </div>
                <h3 style={{ margin: '0 0 5px', fontSize: '22px' }}>PixelArtist.eth</h3>
                <span style={{ background: '#222', padding: '6px 14px', borderRadius: '12px', fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }}>0x71C...97A1</span>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                <div style={{ flex: 1, background: '#1A1A24', border: '1px solid #333', borderRadius: '20px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ color: '#888', fontSize: '11px', fontWeight: 'bold' }}>CREATED</span>
                    <h4 style={{ margin: '5px 0 0', fontSize: '24px' }}>42</h4>
                </div>
                <div style={{ flex: 1, background: '#1A1A24', border: '1px solid #333', borderRadius: '20px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ color: '#888', fontSize: '11px', fontWeight: 'bold' }}>EARNED</span>
                    <h4 style={{ margin: '5px 0 0', fontSize: '24px', color: '#00FFCC' }}>12.5 E</h4>
                </div>
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={18} color="#00FFCC" /> Achievements</h3>
            <div style={{ background: '#1A1A24', border: '1px solid #333', borderRadius: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block' }}>Early Adopter</span>
                        <span style={{ fontSize: '11px', color: '#888' }}>Joined in Season 1</span>
                    </div>
                    <span style={{ color: '#00FFCC', fontSize: '12px', background: 'rgba(0,255,204,0.1)', padding: '4px 8px', borderRadius: '8px' }}>Completed</span>
                </div>
                <div style={{ width: '100%', height: '1px', background: '#333', marginBottom: '15px' }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block' }}>Master Builder</span>
                        <span style={{ fontSize: '11px', color: '#888' }}>Place 10,000 Voxels</span>
                    </div>
                    <span style={{ color: '#aaa', fontSize: '12px' }}>7,420 / 10K</span>
                </div>
            </div>
        </div>
    );
}