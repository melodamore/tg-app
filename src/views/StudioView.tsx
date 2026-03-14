import type { ReactNode } from 'react';

interface StudioViewProps {
    visible: boolean;
    children: ReactNode;
}

// Just a wrapper to hide/show the studio area with CSS to preserve WebGL context.
export function StudioView({ visible, children }: StudioViewProps) {
    return (
        <div style={{ display: visible ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            {children}
        </div>
    );
}