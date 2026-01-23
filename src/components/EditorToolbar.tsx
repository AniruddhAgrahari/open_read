import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Type,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Tag,
    Table,
    List,
    Grid,
    X,
    ChevronRight,
    MousePointer2
} from 'lucide-react';

interface EditorTool {
    id: string;
    icon: React.ElementType;
    label: string;
    subMenu?: { label: string; value: string; icon: React.ElementType }[];
}

const editorTools: EditorTool[] = [
    {
        id: 'headings',
        icon: Type,
        label: 'Typography',
        subMenu: [
            { label: 'Title', value: 'title', icon: Type },
            { label: 'Heading 1', value: 'h1', icon: Heading1 },
            { label: 'Heading 2', value: 'h2', icon: Heading2 },
            { label: 'Heading 3', value: 'h3', icon: Heading3 },
            { label: 'Generic Text', value: 'text', icon: Type },
        ]
    },
    {
        id: 'blocks',
        icon: Quote,
        label: 'Content Blocks',
        subMenu: [
            { label: 'Blockquote', value: 'quote', icon: Quote },
            { label: 'Label / Tag', value: 'tag', icon: Tag },
        ]
    },
    {
        id: 'layout',
        icon: Table,
        label: 'Layout & Lists',
        subMenu: [
            { label: '2x2 Table', value: 'table-2x2', icon: Table },
            { label: '3x3 Grid', value: 'grid-3x3', icon: Grid },
            { label: 'Bullet List', value: 'list-bullet', icon: List },
            { label: 'Numbered List', value: 'list-num', icon: List },
        ]
    }
];

interface EditorToolbarProps {
    isOpen: boolean;
    onClose: () => void;
    activeTool: string | null;
    onToolSelect: (toolId: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    isOpen,
    onClose,
    activeTool,
    onToolSelect
}) => {
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    const handleToolClick = (tool: EditorTool) => {
        if (tool.subMenu) {
            setOpenSubMenu(openSubMenu === tool.id ? null : tool.id);
        } else {
            onToolSelect(tool.id);
            setOpenSubMenu(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="editor-toolbar"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Header: Close Editor */}
                    <button
                        className="editor-toolbar-close"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', width: '60%', marginBottom: 8 }} />

                    {/* Cursor / Selection Tool */}
                    <div
                        className="editor-tool-wrapper"
                        onMouseEnter={() => setHoveredTool('pointer')}
                        onMouseLeave={() => setHoveredTool(null)}
                    >
                        <button
                            className={`editor-tool-btn ${!activeTool ? 'active' : ''}`}
                            onClick={() => {
                                onToolSelect('');
                                setOpenSubMenu(null);
                            }}
                        >
                            <MousePointer2 size={18} />
                        </button>

                        <AnimatePresence>
                            {hoveredTool === 'pointer' && (
                                <motion.div
                                    className="editor-tool-tooltip"
                                    initial={{ opacity: 0, x: 5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 5 }}
                                >
                                    Pointer Mode
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Tool Icons */}
                    <div className="editor-toolbar-tools">
                        {editorTools.map((tool) => {
                            const isActive = activeTool?.startsWith(tool.id) || openSubMenu === tool.id;
                            const isSubMenuOpen = openSubMenu === tool.id;

                            return (
                                <div
                                    key={tool.id}
                                    className="editor-tool-wrapper"
                                    onMouseEnter={() => !isSubMenuOpen && setHoveredTool(tool.id)}
                                    onMouseLeave={() => setHoveredTool(null)}
                                >
                                    <button
                                        className={`editor-tool-btn ${isActive ? 'active' : ''}`}
                                        onClick={() => handleToolClick(tool)}
                                    >
                                        <tool.icon size={18} />
                                        {tool.subMenu && (
                                            <ChevronRight
                                                size={10}
                                                className="submenu-indicator"
                                                style={{
                                                    transform: isSubMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s',
                                                    color: isActive ? 'white' : 'inherit'
                                                }}
                                            />
                                        )}
                                    </button>

                                    {/* Tooltip */}
                                    <AnimatePresence>
                                        {hoveredTool === tool.id && !isSubMenuOpen && (
                                            <motion.div
                                                className="editor-tool-tooltip"
                                                initial={{ opacity: 0, x: 5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 5 }}
                                            >
                                                {tool.label}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Sub-Menu Fly-out */}
                                    <AnimatePresence>
                                        {isSubMenuOpen && tool.subMenu && (
                                            <motion.div
                                                className="editor-submenu"
                                                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -10, scale: 0.9 }}
                                            >
                                                {tool.subMenu.map((item) => {
                                                    const ItemIcon = item.icon;
                                                    return (
                                                        <button
                                                            key={item.value}
                                                            className="editor-submenu-item"
                                                            onClick={() => {
                                                                onToolSelect(item.value);
                                                                setOpenSubMenu(null);
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <ItemIcon size={14} />
                                                                <span>{item.label}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>

                    {/* Status Indicator */}
                    <div className="editor-toolbar-status">
                        <div className="status-dot" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

