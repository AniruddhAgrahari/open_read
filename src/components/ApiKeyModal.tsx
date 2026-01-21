import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    onApiKeyChange: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, onApiKeyChange }) => {
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
                >
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>

                    <div className="modal-header">
                        <Key size={24} color="var(--accent-color)" />
                        <h2>Connect API Key for AI Features</h2>
                    </div>

                    <p className="modal-description">
                        Enter your Groq API key to enable Deep Analysis and smart document insights.
                        Your key is stored locally and never sent to external servers.
                    </p>

                    <div className="modal-input-group">
                        <label htmlFor="api-key-input">Groq API Key</label>
                        <input
                            id="api-key-input"
                            type="password"
                            placeholder="Paste gsk_... key here"
                            value={apiKey}
                            onChange={(e) => onApiKeyChange(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={onClose}>
                            Save Connection
                        </button>
                    </div>

                    <div className="modal-footer">
                        <a
                            href="https://console.groq.com/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="modal-link"
                        >
                            Get your API key from Groq Console →
                        </a>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};
