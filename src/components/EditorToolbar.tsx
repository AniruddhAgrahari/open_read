import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Type,
    Heading1,
    Heading2,
    Heading3,
    X,
    ChevronRight,
    MousePointer2,
    Square,
    Circle,
    Shapes,
    ArrowRight,
    Highlighter
} from 'lucide-react';
import { useTabStore } from '../store/useTabStore';

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
        id: 'shapes',
        icon: Shapes,
        label: 'Shapes',
        // Note: Shapes use the special pod UI, not a traditional submenu
    },
    {
        id: 'highlighter',
        icon: Highlighter,
        label: 'Highlighter',
        // Note: Highlighter will also use the color pod UI
    }
];

const SHAPE_TOOLS = [
    { value: 'rect', icon: Square, label: 'Rectangle' },
    { value: 'circle', icon: Circle, label: 'Circle' },
    { value: 'oval', icon: Circle, label: 'Oval' }, // Using Circle icon for oval
    { value: 'arrow', icon: ArrowRight, label: 'Arrow' },
];

const COLOR_SWATCHES = [
    { value: '#ef4444', label: 'Red' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#22c55e', label: 'Green' },
    { value: '#eab308', label: 'Yellow' },
    { value: '#000000', label: 'Black' },
    { value: '#ffffff', label: 'White' },
    { value: '#a855f7', label: 'Purple' },
];

interface EditorToolbarProps {
    isOpen: boolean;
    onClose: () => void;
    activeTool: string | null;
    onToolSelect: (toolId: string) => void;
    collapseSubMenus?: boolean;
    onSubMenuCollapsed?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    isOpen,
    onClose,
    activeTool,
    onToolSelect,
    collapseSubMenus,
    onSubMenuCollapsed
}) => {
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const { shapeColor, setShapeColor } = useTabStore();
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Collapse submenus when triggered from parent
    useEffect(() => {
        if (collapseSubMenus && openSubMenu) {
            setOpenSubMenu(null);
            onSubMenuCollapsed?.();
        }
    }, [collapseSubMenus]);

    // Close submenu when clicking outside the toolbar
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setOpenSubMenu(null);
            }
        };

        if (openSubMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openSubMenu]);

    const handleToolClick = (tool: EditorTool) => {
        if (tool.id === 'shapes') {
            // Toggle shapes pod
            setOpenSubMenu(openSubMenu === 'shapes' ? null : 'shapes');
        } else if (tool.id === 'highlighter') {
            // Toggle highlighter (activates the tool and shows color pod)
            if (openSubMenu === 'highlighter') {
                setOpenSubMenu(null);
                onToolSelect('');
            } else {
                setOpenSubMenu('highlighter');
                onToolSelect('highlighter');
            }
        } else if (tool.subMenu) {
            setOpenSubMenu(openSubMenu === tool.id ? null : tool.id);
        } else {
            onToolSelect(tool.id);
            setOpenSubMenu(null);
        }
    };

    const handleShapeSelect = (shapeValue: string) => {
        onToolSelect(shapeValue);
        // Keep pod open so user can change colors
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={toolbarRef}
                    className="editor-toolbar"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
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
                                        {(tool.subMenu || tool.id === 'shapes') && (
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

                                    {/* Shapes Pod Menu */}
                                    <AnimatePresence>
                                        {isSubMenuOpen && tool.id === 'shapes' && (
                                            <motion.div
                                                className="editor-shapes-pod"
                                                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                style={{
                                                    position: 'absolute',
                                                    left: 70,
                                                    top: 0,
                                                    background: 'rgba(30, 30, 35, 0.95)',
                                                    backdropFilter: 'blur(12px)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 12,
                                                    padding: 10,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                    zIndex: 1000,
                                                    width: 'fit-content'
                                                }}
                                            >
                                                {/* Row 1: Shape Icons */}
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {SHAPE_TOOLS.map((shape) => {
                                                        const ShapeIcon = shape.icon;
                                                        const isShapeActive = activeTool === shape.value;
                                                        return (
                                                            <button
                                                                key={shape.value}
                                                                onClick={() => handleShapeSelect(shape.value)}
                                                                title={shape.label}
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    background: isShapeActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                    border: isShapeActive ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: 8,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    color: 'white',
                                                                    boxShadow: isShapeActive ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none'
                                                                }}
                                                            >
                                                                <ShapeIcon size={18} strokeWidth={2} />
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Row 2: Color Swatches */}
                                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                    {COLOR_SWATCHES.map((color) => {
                                                        const isColorActive = shapeColor === color.value;
                                                        return (
                                                            <button
                                                                key={color.value}
                                                                onClick={() => setShapeColor(color.value)}
                                                                title={color.label}
                                                                style={{
                                                                    width: 20,
                                                                    height: 20,
                                                                    background: color.value,
                                                                    border: color.value === '#ffffff' ? '1px solid rgba(0,0,0,0.2)' : 'none',
                                                                    borderRadius: '50%',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    transform: isColorActive ? 'scale(1.2)' : 'scale(1)',
                                                                    boxShadow: isColorActive ? `0 0 0 2px rgba(255,255,255,0.5), 0 0 8px ${color.value}` : 'none'
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Highlighter Color Pod */}
                                    <AnimatePresence>
                                        {isSubMenuOpen && tool.id === 'highlighter' && (
                                            <motion.div
                                                className="editor-shapes-pod"
                                                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                style={{
                                                    position: 'absolute',
                                                    left: 70,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'rgba(30, 30, 35, 0.95)',
                                                    backdropFilter: 'blur(12px)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 12,
                                                    padding: 10,
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                    zIndex: 1000,
                                                    width: 80
                                                }}
                                            >
                                                {/* Color Swatches for Highlighter */}
                                                {COLOR_SWATCHES.map((color) => {
                                                    const isColorActive = shapeColor === color.value;
                                                    return (
                                                        <button
                                                            key={color.value}
                                                            onClick={() => setShapeColor(color.value)}
                                                            title={color.label}
                                                            style={{
                                                                width: 20,
                                                                height: 20,
                                                                background: color.value,
                                                                border: color.value === '#ffffff' ? '1px solid rgba(0,0,0,0.2)' : 'none',
                                                                borderRadius: '50%',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                transform: isColorActive ? 'scale(1.2)' : 'scale(1)',
                                                                boxShadow: isColorActive ? `0 0 0 2px rgba(255,255,255,0.5), 0 0 8px ${color.value}` : 'none'
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Traditional Sub-Menu Fly-out for non-shapes tools */}
                                    <AnimatePresence>
                                        {isSubMenuOpen && tool.subMenu && tool.id !== 'shapes' && (
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

                    {/* Close Button at Bottom */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', width: '60%', marginTop: 12, marginBottom: 8 }} />
                    <button
                        className="editor-toolbar-close"
                        onClick={onClose}
                        style={{ marginTop: 'auto' }}
                    >
                        <X size={18} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
