import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    onApiKeyChange: (key: string) => void;
    searchApiKey: string;
    onSearchApiKeyChange: (key: string) => void;
    searchEngineId: string;
    onSearchEngineIdChange: (id: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
    isOpen,
    onClose,
    apiKey,
    onApiKeyChange,
    searchApiKey,
    onSearchApiKeyChange,
    searchEngineId,
    onSearchEngineIdChange
}) => {
    if (!isOpen) return null;

    const modalContent = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-backdrop"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="modal-content glass"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: '500px' }}
                >
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>

                    <div className="modal-header">
                        <Key size={24} color="var(--accent-color)" />
                        <h2>Settings & API Keys</h2>
                    </div>

                    <p className="modal-description">
                        Connect your API keys to enable AI Analysis and Live Web Search.
                        Keys are stored locally only.
                    </p>

                    <div className="modal-input-group">
                        <label htmlFor="api-key-input">Groq API Key (AI Analysis)</label>
                        <input
                            id="api-key-input"
                            type="password"
                            placeholder="gsk_..."
                            value={apiKey}
                            onChange={(e) => onApiKeyChange(e.target.value)}
                            autoFocus
                        />
                        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="modal-helper-link">
                            Get Groq Key
                        </a>
                    </div>

                    <div className="divider" style={{ margin: '15px 0' }} />

                    <div className="modal-input-group">
                        <label htmlFor="search-api-key">Google Search API Key (Live Search)</label>
                        <input
                            id="search-api-key"
                            type="password"
                            placeholder="AIza..."
                            value={searchApiKey}
                            onChange={(e) => onSearchApiKeyChange(e.target.value)}
                        />
                        <a href="https://developers.google.com/custom-search/v1/overview" target="_blank" rel="noopener noreferrer" className="modal-helper-link">
                            Get Google API Key
                        </a>
                    </div>

                    <div className="modal-input-group">
                        <label htmlFor="search-cx">Google Search Engine ID (CX)</label>
                        <input
                            id="search-cx"
                            type="text"
                            placeholder="e.g. 0123456789:abcde"
                            value={searchEngineId}
                            onChange={(e) => onSearchEngineIdChange(e.target.value)}
                        />
                        <a href="https://programmablesearchengine.google.com/controlpanel/all" target="_blank" rel="noopener noreferrer" className="modal-helper-link">
                            Create Search Engine
                        </a>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <button className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={onClose}>
                            Save Settings
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};
