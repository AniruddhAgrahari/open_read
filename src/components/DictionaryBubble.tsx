import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Sparkles, Copy, MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface DictionaryBubbleProps {
    word: string;
    position: { x: number; y: number };
    onClose: () => void;
    onDeepDive: (word: string) => void;
}

export const DictionaryBubble: React.FC<DictionaryBubbleProps> = ({ word, position, onClose, onDeepDive }) => {
    const [definitions, setDefinitions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDefinition = async () => {
            try {
                const results: string[] = await invoke('search_dictionary', { word });
                setDefinitions(results);
            } catch (err) {
                console.error('Dictionary search failed:', err);
            } finally {
                setLoading(false);
            }
        };

        if (word) fetchDefinition();
    }, [word]);

    // Close on right-click, outside click, or Escape key
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            onClose();
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.glass')) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    if (!word) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y - 10,
                transform: 'translate(-50%, -100%)',
                zIndex: 20,
                width: 280,
                borderRadius: '12px',
                padding: '16px',
                color: 'var(--text-primary)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                    <Book size={14} color="var(--accent-color)" />
                    <span>{word}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Copy size={12} className="icon-btn" onClick={() => navigator.clipboard.writeText(word)} />
                </div>
            </div>

            <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 16 }}>
                {loading ? (
                    <div style={{ fontSize: 12, opacity: 0.5 }}>Searching local dictionary...</div>
                ) : definitions.length > 0 ? (
                    definitions.map((def, i) => (
                        <div key={i} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid var(--glass-border)' }}>
                            {def}
                        </div>
                    ))
                ) : (
                    <div style={{ fontSize: 12, opacity: 0.5 }}>No local definition found.</div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    onClick={() => onDeepDive(word)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    <Sparkles size={12} />
                    Deep Dive
                </button>
                <button
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                        cursor: 'pointer',
                    }}
                    onClick={onClose}
                >
                    <MessageSquare size={12} />
                </button>
            </div>

            {/* Arrow */}
            <div
                style={{
                    position: 'absolute',
                    bottom: -6,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 12,
                    height: 12,
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--glass-border)',
                    borderBottom: '1px solid var(--glass-border)',
                    zIndex: -1
                }}
            />
        </motion.div>
    );
};
