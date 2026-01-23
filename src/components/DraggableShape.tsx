import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DraggableShapeProps {
    id: string;
    type: 'rect' | 'circle' | 'oval' | 'arrow';
    x: number;
    y: number;
    width?: number; // percentage of page width
    height?: number; // percentage of page height
    rotation?: number;
    color?: string;
    isSelected: boolean;
    onUpdate: (updates: { width?: number; height?: number; rotation?: number }) => void;
    onDelete: () => void;
    onSelect: () => void;
}

export const DraggableShape: React.FC<DraggableShapeProps> = ({
    type,
    x,
    y,
    width = 20,
    height = 10,
    rotation = 0,
    color = '#ef4444',
    isSelected,
    onUpdate,
    onDelete,
    onSelect
}) => {

    // Calculate style based on type
    const getShapeStyles = () => {
        const baseStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
        };

        if (type === 'rect' || type === 'circle' || type === 'oval') {
            baseStyle.border = `2px solid ${color}`;
            baseStyle.backgroundColor = `${color}1A`; // Add alpha for transparency
        }

        if (type === 'circle' || type === 'oval') {
            baseStyle.borderRadius = '50%';
        }

        return baseStyle;
    };

    return (
        <motion.div
            className={`draggable-shape ${isSelected ? 'selected' : ''}`}
            style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: `${width}%`,
                height: type === 'arrow' ? 'auto' : `${height}%`,
                zIndex: isSelected ? 100 : 10,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            drag={isSelected}
            dragMomentum={false}
        >
            {type === 'arrow' ? (
                <div style={{ width: '100%', height: '24px', position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <defs>
                            <marker id={`arrowhead-${x}-${y}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                            </marker>
                        </defs>
                        <line x1="0" y1="12" x2="100" y2="12" stroke={color} strokeWidth="4" markerEnd={`url(#arrowhead-${x}-${y})`} vectorEffect="non-scaling-stroke" />
                    </svg>
                </div>
            ) : (
                <div style={getShapeStyles()} />
            )}

            {isSelected && (
                <div className="shape-controls">
                    <button
                        className="shape-delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        style={{
                            position: 'absolute',
                            top: -30,
                            right: -30,
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
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </motion.div>
    );
};
