import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Book,
    Layers,
    Type,
    Image,
    Edit3,
    X,
    Moon,
    Sun
} from 'lucide-react';
import { useTabStore } from '../store/useTabStore';

interface FloatingToolbarProps {
    activeDrawer: string | null;
    onDrawerToggle: (drawer: string) => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ activeDrawer, onDrawerToggle }) => {
    const { isDarkMode, toggleDarkMode } = useTabStore();

    const tools = [
        { id: 'ai', icon: Sparkles, label: 'AI Analysis' },
        { id: 'edit', icon: Edit3, label: 'Edit Mode' },
    ];

    return (
        <motion.div
            initial={{ x: 100, y: '-50%', opacity: 0 }}
            animate={{ x: 0, y: '-50%', opacity: 1 }}
            className="floating-toolbar"
        >
            <motion.button
                onClick={toggleDarkMode}
                className="toolbar-btn"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    marginBottom: 4,
                    borderBottom: '1px solid var(--glass-border)',
                    paddingBottom: 8
                }}
            >
                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </motion.button>

            {tools.map((tool, index) => {
                const Icon = tool.icon;
                const isActive = activeDrawer === tool.id;

                return (
                    <motion.button
                        key={tool.id}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
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
        </motion.div>
    );
};

interface DrawerProps {
    id: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="drawer-overlay"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="drawer glass"
                    >
                        <button className="drawer-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
