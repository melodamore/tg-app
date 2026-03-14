interface ToastProps {
    toasts: {id: number, msg: string}[];
}

export function Toast({ toasts }: ToastProps) {
    if (toasts.length === 0) return null;
    return (
        <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
            {toasts.map(t => (
                <div key={t.id} style={{ background: 'rgba(0,255,204,0.9)', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadein 0.2s ease-out' }}>
                    {t.msg}
                </div>
            ))}
        </div>
    );
}