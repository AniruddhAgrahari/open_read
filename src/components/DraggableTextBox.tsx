import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DraggableTextBoxProps {
    id: string;
    content: string;
    type: string;
    x: number;
    y: number;
    isSelected: boolean;
    onUpdate: (content: string) => void;
    onDelete: () => void;
    onSelect: () => void;
}

export const DraggableTextBox: React.FC<DraggableTextBoxProps> = ({
    content,
    type,
    x,
    y,
    isSelected,
    onUpdate,
    onDelete,
    onSelect
}) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isSelected && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSelected]);

    const getStyles = () => {
        switch (type) {
            case 'title': return { fontSize: '28px', fontWeight: '800', color: '#fff' };
            case 'h1': return { fontSize: '22px', fontWeight: '700', color: '#fff' };
            case 'h2': return { fontSize: '18px', fontWeight: '600', color: '#fff' };
            case 'h3': return { fontSize: '16px', fontWeight: '600', color: '#fff' };
            default: return { fontSize: '14px', fontWeight: '400', color: '#ccc' };
        }
    };

    return (
        <motion.div
            className={`draggable-text-box ${isSelected ? 'selected' : ''}`}
            style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                zIndex: isSelected ? 100 : 10,
                transform: 'translate(-50%, -50%)',
                ...getStyles()
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
        >
            <div className="text-box-container">
                <textarea
                    ref={inputRef}
                    value={content}
                    onChange={(e) => onUpdate(e.target.value)}
                    placeholder="Type something..."
                    rows={1}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        outline: 'none',
                        resize: 'none',
                        width: 'auto',
                        minWidth: '100px',
                        display: 'block',
                        overflow: 'hidden'
                    }}
                />

                {isSelected && (
                    <div className="text-box-controls">
                        <button className="text-box-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
