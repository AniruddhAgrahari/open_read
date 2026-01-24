import { motion } from 'framer-motion';
import { Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { HistoryEntry } from '../services/historyService';
import { useAiStore } from '../store/useAiStore';

interface AiHistoryFeedProps {
    entries: HistoryEntry[];
    onSelect: (entry: HistoryEntry) => void;
}

export const AiHistoryFeed: React.FC<AiHistoryFeedProps> = ({ entries, onSelect }) => {
    const { setShowHistory } = useAiStore();

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (entries.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '40px 0',
                opacity: 0.5
            }}>
                <Clock size={32} strokeWidth={1.5} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>No history for this file yet</span>
            </div>
        );
    }

    return (
        <div className="history-feed" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries.map((entry, index) => (
                <motion.div
                    key={entry.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                        onSelect(entry);
                        setShowHistory(false);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 14,
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    whileHover={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderColor: 'rgba(var(--accent-rgb), 0.3)',
                        scale: 1.02
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, opacity: 0.5, fontWeight: 600 }}>
                            <Clock size={10} />
                            <span>{formatDate(entry.timestamp)}</span>
                        </div>
                        <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    </div>

                    <div style={{
                        fontSize: 12,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        opacity: 0.9
                    }}>
                        <MessageSquare size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', opacity: 0.7 }} />
                        {entry.query_text}
                    </div>

                    <div style={{
                        fontSize: 11,
                        opacity: 0.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {entry.ai_response_json.substring(0, 100).replace(/[#*`]/g, '')}...
                    </div>

                    {/* Subtle glow on hover is handled by CSS if we add a className, 
                        but we can also use motion style or inline styles */}
                </motion.div>
            ))}
        </div>
    );
};
