import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DraggableHighlightProps {
    id: string;
    rects: Array<{ x: number; y: number; width: number; height: number }>;
    color?: string;
    isSelected: boolean;
    onDelete: () => void;
    onSelect: () => void;
}

export const DraggableHighlight: React.FC<DraggableHighlightProps> = ({
    rects,
    color = '#eab308', // Default yellow
    isSelected,
    onDelete,
    onSelect
}) => {
    return (
        <>
            {rects.map((rect, index) => (
                <motion.div
                    key={index}
                    className={`draggable-highlight ${isSelected ? 'selected' : ''}`}
                    style={{
                        position: 'absolute',
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                        background: `${color}66`, // Add 40% opacity
                        mixBlendMode: 'multiply',
                        borderRadius: 3,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        zIndex: isSelected ? 50 : 5,
                        boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                />
            ))}

            {/* Delete button (centered above all rects) */}
            {isSelected && rects.length > 0 && (
                <button
                    className="highlight-delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    style={{
                        position: 'absolute',
                        top: `${rects[0].y - 3}%`,
                        left: `${rects[0].x + rects[0].width / 2}%`,
                        transform: 'translate(-50%, -100%)',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        zIndex: 200
                    }}
                >
                    <Trash2 size={14} />
                </button>
            )}
        </>
    );
};
