import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutItemProps {
    action: string;
    keys: string[];
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ action, keys }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--glass-border)'
    }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{action}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
            {keys.map((key, index) => (
                <React.Fragment key={index}>
                    <kbd style={{
                        background: 'var(--bg-accent)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        boxShadow: '0 2px 0 var(--glass-border)',
                        minWidth: '24px',
                        textAlign: 'center'
                    }}>
                        {key}
                    </kbd>
                    {index < keys.length - 1 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px', alignSelf: 'center' }}>+</span>}
                </React.Fragment>
            ))}
        </div>
    </div>
);

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="modal-backdrop"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '500px',
                            padding: '24px'
                        }}
                    >
                        <button
                            className="modal-close"
                            onClick={onClose}
                            style={{ top: '20px', right: '20px' }}
                        >
                            <X size={18} />
                        </button>

                        <div className="modal-header" style={{ marginBottom: '24px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-color)'
                            }}>
                                <Keyboard size={24} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Keyboard Shortcuts</h2>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Boost your productivity with quick actions</p>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '0',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            paddingRight: '8px'
                        }}>
                            <ShortcutItem action="Toggle Focus Mode" keys={['Alt', 'F']} />
                            <ShortcutItem action="Dark Mode Theme" keys={['Alt', 'D']} />
                            <ShortcutItem action="Light Mode Theme" keys={['Alt', 'L']} />
                            <ShortcutItem action="Toggle Eye Comfort" keys={['Alt', 'N']} />
                            <ShortcutItem action="Toggle Editor Tools" keys={['Alt', 'E']} />
                            <ShortcutItem action="Toggle AI Sidebar" keys={['Alt', 'A']} />
                            <div style={{ marginTop: '16px', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Standard Controls
                            </div>
                            <ShortcutItem action="Undo Changes" keys={['Ctrl', 'Z']} />
                            <ShortcutItem action="Redo Changes" keys={['Ctrl', 'Shift', 'Z']} />
                            <ShortcutItem action="Submit AI Chat" keys={['Ctrl', 'Enter']} />
                            <ShortcutItem action="Next Page" keys={['Arrow Right']} />
                            <ShortcutItem action="Previous Page" keys={['Arrow Left']} />
                            <ShortcutItem action="Show This Guide" keys={['?']} />
                        </div>

                        <div style={{
                            marginTop: '24px',
                            paddingTop: '16px',
                            borderTop: '1px solid var(--glass-border)',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={onClose}
                                className="btn-primary"
                                style={{ width: '100%' }}
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
