import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Sparkles, Copy, MessageSquare } from 'lucide-react';

interface DictionaryBubbleProps {
    word: string;
    position: { x: number; y: number };
    onClose: () => void;
    onDeepDive: (word: string) => void;
}

// Check if we're running in Tauri desktop environment
const isTauri = () => !!(window as any).__TAURI__;

// Online dictionary API fallback (Free Dictionary API)
async function fetchOnlineDefinition(term: string): Promise<string[]> {
    try {
        const cleanTerm = term.trim().replace(/[.,!?;:()"]/g, '').toLowerCase();
        if (cleanTerm.length < 2 || cleanTerm.split(/\s+/).length > 3) return [];

        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanTerm)}`);
        if (!response.ok) return [];

        const data = await response.json();
        const defs: string[] = [];

        if (Array.isArray(data)) {
            data.forEach((entry: any) => {
                entry.meanings?.forEach((meaning: any) => {
                    meaning.definitions?.slice(0, 2).forEach((def: any) => {
                        if (def.definition) {
                            defs.push(`(${meaning.partOfSpeech || 'noun'}) ${def.definition}`);
                        }
                    });
                });
            });
        }
        return defs.slice(0, 3);
    } catch {
        return [];
    }
}

export const DictionaryBubble: React.FC<DictionaryBubbleProps> = ({ word, position, onClose, onDeepDive }) => {
    const [definitions, setDefinitions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState<'local' | 'online' | null>(null);

    useEffect(() => {
        const fetchDefinition = async () => {
            setLoading(true);
            setDefinitions([]);
            setSource(null);

            let foundLocal = false;
            
            // Additional cleaning for dictionary lookup
            const cleanWord = word
                .trim()
                .replace(/^[^a-zA-Z]+/, '')  // Remove non-letter chars from start
                .replace(/[^a-zA-Z\s]+$/, '')  // Remove non-letter chars from end (except spaces)
                .replace(/-\s+/g, '')  // Handle hyphenated words split across lines
                .trim();

            // Try Tauri offline dictionary first (only in desktop app)
            if (isTauri() && cleanWord.length > 0) {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    if (typeof invoke === 'function') {
                        const results: string[] = await invoke('search_dictionary', { word: cleanWord });
                        if (results && results.length > 0) {
                            setDefinitions(results);
                            setSource('local');
                            foundLocal = true;
                        }
                    }
                } catch (err) {
                    console.warn('Tauri dictionary lookup failed, falling back to online:', err);
                }
            }

            // Fallback to online dictionary API if no local result
            if (!foundLocal && cleanWord.length > 0) {
                try {
                    const onlineResults = await fetchOnlineDefinition(cleanWord);
                    if (onlineResults.length > 0) {
                        setDefinitions(onlineResults);
                        setSource('online');
                    }
                } catch (err) {
                    console.warn('Online dictionary lookup failed:', err);
                }
            }

            setLoading(false);
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
            // Don't close if clicking inside the bubble
            if (!target.closest('.glass')) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Add listeners immediately
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    if (!word) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y + 10,
                transform: 'translate(-50%, 0)',
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
                    <span>{word.length > 25 ? word.substring(0, 22) + '...' : word}</span>
                    {source && (
                        <span style={{
                            fontSize: 9,
                            padding: '2px 5px',
                            borderRadius: 4,
                            background: source === 'local' ? 'var(--accent-color)' : 'var(--glass-border)',
                            color: source === 'local' ? 'white' : 'var(--text-primary)',
                            opacity: 0.8
                        }}>
                            {source === 'local' ? 'OFFLINE' : 'ONLINE'}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Copy size={12} className="icon-btn" onClick={() => navigator.clipboard.writeText(word)} />
                </div>
            </div>

            <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 16 }}>
                {loading ? (
                    <div style={{ fontSize: 12, opacity: 0.5 }}>Searching dictionary...</div>
                ) : definitions.length > 0 ? (
                    definitions.map((def, i) => (
                        <div key={i} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid var(--glass-border)' }}>
                            {def}
                        </div>
                    ))
                ) : (
                    <div style={{ fontSize: 12, opacity: 0.5 }}>No definition found. Try AI Deep Dive.</div>
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
                    top: -6,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(225deg)',
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
