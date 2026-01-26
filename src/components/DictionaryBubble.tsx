import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Copy, X, Sparkles } from 'lucide-react';

interface DictionaryBubbleProps {
    word: string;
    position: { x: number; y: number };
    onClose: () => void;
    onDeepDive: (word: string) => void;
}

// Check if we're running in Tauri desktop environment
const isTauri = () => !!(window as any).__TAURI__;

// Global cache for web-based offline dictionary
declare global {
    interface Window {
        offlineDictionaryCache?: { words: Array<{ word: string; definition: string }> };
    }
}

// Online dictionary API fallback (Free Dictionary API)
async function fetchOnlineDefinition(term: string): Promise<string[]> {
    try {
        const cleanTerm = term.trim().replace(/[.,!?;:()"]/g, '').toLowerCase();
        if (cleanTerm.length < 2 || cleanTerm.split(/\s+/).length > 3) return [];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanTerm)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

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

// Web/Fallback Offline Search
async function searchWebOfflineDictionary(term: string): Promise<string[]> {
    try {
        // Lazy load the dictionary if not in memory
        if (!window.offlineDictionaryCache) {
            console.log('Loading offline dictionary from /dictionary.json...');
            const response = await fetch('/dictionary.json');
            if (response.ok) {
                window.offlineDictionaryCache = await response.json();
            } else {
                console.warn('Failed to load /dictionary.json');
                return [];
            }
        }

        const dict = window.offlineDictionaryCache;
        if (!dict || !dict.words) return [];

        const lowerTerm = term.toLowerCase();

        // Exact match first
        const exact = dict.words.find(w => w.word.toLowerCase() === lowerTerm);
        if (exact) return [exact.definition];

        // Prefix match
        const results = dict.words
            .filter(w => w.word.toLowerCase().startsWith(lowerTerm))
            .slice(0, 3)
            .map(w => w.definition);

        return results;

    } catch (e) {
        console.error('Web offline dict error:', e);
        return [];
    }
}

export const DictionaryBubble: React.FC<DictionaryBubbleProps> = ({ word, position, onClose, onDeepDive }) => {
    const [definitions, setDefinitions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState<'local' | 'online' | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchDefinition = async () => {
            setLoading(true);
            setDefinitions([]);
            setSource(null);

            // Clean word
            const cleanWord = word
                .trim()
                .replace(/^[^a-zA-Z]+/, '')
                .replace(/[^a-zA-Z\s]+$/, '')
                .replace(/-\s+/g, '')
                .trim();

            if (cleanWord.length === 0) {
                if (isMounted) setLoading(false);
                return;
            }

            let foundResults: string[] = [];
            let foundSource: 'local' | 'online' | null = null;

            // 1. Try Tauri Rust DB (Fastest, Offline)
            if (isTauri()) {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    const results: string[] = await invoke('search_dictionary', { word: cleanWord });
                    if (results && results.length > 0) {
                        foundResults = results;
                        foundSource = 'local';
                    }
                } catch (err) {
                    console.warn('Tauri lookup failed:', err);
                }
            }

            // 2. Try Web Offline JSON (Fallback for Web or if Tauri DB empty)
            if (foundResults.length === 0) {
                const webResults = await searchWebOfflineDictionary(cleanWord);
                if (webResults.length > 0) {
                    foundResults = webResults;
                    foundSource = 'local';
                }
            }

            // 3. Try Online API (Last Resort)
            if (foundResults.length === 0 && navigator.onLine) {
                const onlineResults = await fetchOnlineDefinition(cleanWord);
                if (onlineResults.length > 0) {
                    foundResults = onlineResults;
                    foundSource = 'online';
                }
            }

            if (isMounted) {
                setDefinitions(foundResults);
                setSource(foundSource);
                setLoading(false);
            }
        };

        if (word) {
            const timer = setTimeout(fetchDefinition, 100); // 100ms debounce for selection settling
            return () => { isMounted = false; clearTimeout(timer); };
        }
    }, [word]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
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
                position: 'absolute',
                left: position.x,
                top: position.y + 10,
                transform: 'translate(-50%, 0)',
                zIndex: 20,
                width: 240,
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
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Sparkles
                        size={12}
                        className="icon-btn"
                        onClick={() => onDeepDive(word)}
                        style={{ color: 'var(--accent-color)' }}
                    />
                    <Copy
                        size={12}
                        className="icon-btn"
                        onClick={() => {
                            navigator.clipboard.writeText(word);
                        }}
                    />
                    <X
                        size={12}
                        className="icon-btn"
                        onClick={onClose}
                    />
                </div>
            </div>

            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 0, paddingRight: 4 }} className="custom-scrollbar">
                {loading ? (
                    <div style={{ fontSize: 11, opacity: 0.5, padding: '4px 0' }}>Searching...</div>
                ) : definitions.length > 0 ? (
                    definitions.map((def, i) => {
                        // Parse "1. ... 2. ..." format if present in a single string
                        const parts = /^\d+\./.test(def)
                            ? def.split(/(?=\s\d+\.)/g).map(s => s.trim())
                            : [def];

                        return parts.map((part, j) => (
                            <div key={`${i}-${j}`} style={{
                                fontSize: 12,
                                lineHeight: 1.5,
                                marginBottom: 8,
                                paddingLeft: 8,
                                borderLeft: '2px solid var(--accent-color)',
                                opacity: 0.9,
                                background: 'var(--bg-secondary)',
                                padding: '6px 8px 6px 10px',
                                borderRadius: '0 4px 4px 0'
                            }}>
                                {part}
                            </div>
                        ));
                    })
                ) : (
                    <div style={{ fontSize: 11, opacity: 0.5, padding: '4px 0' }}>No definition. Try Deep Dive.</div>
                )}
            </div>

            {/* Arrow */}
            <div
                style={{
                    position: 'absolute',
                    top: -6,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(225deg)',
                    width: 10,
                    height: 10,
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--glass-border)',
                    borderBottom: '1px solid var(--glass-border)',
                    zIndex: -1
                }}
            />
        </motion.div>
    );
};
