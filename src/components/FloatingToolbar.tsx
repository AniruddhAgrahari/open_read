import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    Sparkles,
    Edit3,
    Glasses,
    Moon,
    Sun,
    Eye,
    Focus,
    Search,
    Info,
    ChevronRight,
    Check
} from 'lucide-react';
import { useTabStore } from '../store/useTabStore';

interface FloatingToolbarProps {
    activeDrawer: string | null;
    onDrawerToggle: (drawer: string) => void;
    isCollapsed: boolean;
    onCollapseToggle: () => void;
    onFocusModeToggle: (enabled: boolean) => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
    activeDrawer,
    onDrawerToggle,
    isCollapsed,
    onCollapseToggle,
    onFocusModeToggle
}) => {
    const { viewMode, setViewMode } = useTabStore();
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

    const viewModes = [
        { id: 'normal', icon: Sun, label: 'Light Mode', description: 'Standard light theme' },
        { id: 'dark', icon: Moon, label: 'Dark Mode', description: 'Easier on the eyes at night' },
        { id: 'eye-comfort', icon: Eye, label: 'Eye Comfort', description: 'Warm tint for reading' },
        { id: 'focus', icon: Focus, label: 'Focus Mode', description: 'Distraction-free reading' },
    ];

    const handleViewModeChange = (mode: string) => {
        setViewMode(mode as any);
        if (mode === 'focus') {
            onFocusModeToggle(true);
        } else {
            onFocusModeToggle(false);
        }
        setIsViewMenuOpen(false);
    };

    const tools = [
        { id: 'ai', icon: Sparkles, label: 'AI Analysis' },
        { id: 'edit', icon: Edit3, label: 'Edit Mode' },
    ];

    return (
        <>
            <motion.div
                initial={{ x: 100, y: '-50%', opacity: 0 }}
                animate={{
                    x: isCollapsed ? 120 : 0,
                    y: '-50%',
                    opacity: 1
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="floating-toolbar"
            >
                {/* View Mode Button */}
                <div style={{ position: 'relative' }}>
                    <motion.button
                        onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                        className={`toolbar-btn ${isViewMenuOpen ? 'active' : ''}`}
                        title="View Mode"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Glasses size={18} />
                    </motion.button>

                    <AnimatePresence>
                        {isViewMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                className="view-mode-menu"
                            >
                                <div className="view-mode-header">View Mode</div>
                                {viewModes.map((mode) => {
                                    const Icon = mode.icon;
                                    const isActive = viewMode === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            className={`view-mode-option ${isActive ? 'active' : ''}`}
                                            onClick={() => handleViewModeChange(mode.id)}
                                        >
                                            <Icon size={16} />
                                            <div className="view-mode-text">
                                                <span className="view-mode-label">{mode.label}</span>
                                                <span className="view-mode-desc">{mode.description}</span>
                                            </div>
                                            {isActive && <Check size={14} className="view-mode-check" />}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeDrawer === tool.id;

                    return (
                        <motion.button
                            key={tool.id}
                            onClick={() => onDrawerToggle(tool.id)}
                            className={`toolbar-btn ${isActive ? 'active' : ''}`}
                            title={tool.label}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Icon size={18} />
                        </motion.button>
                    );
                })}

                <div className="toolbar-separator" />

                <motion.button
                    onClick={onCollapseToggle}
                    className="toolbar-btn"
                    title="Collapse Toolbar"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ChevronRight size={18} />
                </motion.button>
            </motion.div>

            <AnimatePresence>
                {isCollapsed && (
                    <motion.button
                        initial={{ x: 50, opacity: 0, y: '-50%' }}
                        animate={{ x: 0, opacity: 1, y: '-50%' }}
                        exit={{ x: 50, opacity: 0, y: '-50%' }}
                        onClick={onCollapseToggle}
                        className="toolbar-expand-toggle"
                        title="Expand Toolbar"
                    >
                        <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Click outside to close menu */}
            {isViewMenuOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 14 }}
                    onClick={() => setIsViewMenuOpen(false)}
                />
            )}
        </>
    );
};

interface PremiumPanelProps {
    id: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export const PremiumPanel: React.FC<PremiumPanelProps> = ({ isOpen, onClose, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="drawer-overlay"
                        style={{ background: 'transparent' }} // Keep it subtle
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: 100, opacity: 0, scale: 0.9, y: '-50%' }}
                        animate={{ x: 0, opacity: 1, scale: 1, y: '-50%' }}
                        exit={{ x: 50, opacity: 0, scale: 0.9, y: '-50%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="premium-panel"
                    >
                        <div className="premium-panel-header">
                            <div className="panel-search-container">
                                <Search size={16} className="panel-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search all blocks"
                                    className="panel-search-input"
                                />
                            </div>
                        </div>

                        <div className="premium-panel-body">
                            {children}
                        </div>

                        <div className="premium-panel-footer">
                            <Info size={14} color="var(--accent-color)" />
                            <span className="footer-tip">Tip: Add content directly in your card by typing /</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
