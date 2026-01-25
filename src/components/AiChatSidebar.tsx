import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Send,
    Globe,
    User,
    Bot,
    Loader2,
    Trash2,
    FileText,
    ExternalLink
} from 'lucide-react';
import { useChatStore, ChatMessage } from '../store/useChatStore';
import { useAiStore } from '../store/useAiStore';
import ReactMarkdown from 'react-markdown';
import {
    retrieveRelevantChunks,
    buildRagPrompt,
    chatWithAI,
    saveChatMessage,
    searchWeb
} from '../services/ragService';

interface AiChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    fileId: string | null;
    documentText: string;
}

export const AiChatSidebar: React.FC<AiChatSidebarProps> = ({
    isOpen,
    onClose,
    fileId,
    documentText
}) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        isWebSearchEnabled,
        toggleWebSearch,
        messages,
        addMessage,
        clearMessages,
        isLoading,
        setLoading
    } = useChatStore();

    const { apiKey, searchApiKey, searchEngineId } = useAiStore();

    const currentMessages = fileId ? messages[fileId] || [] : [];

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages]);

    // Focus input when sidebar opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !fileId || isLoading) return;

        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: Date.now()
        };

        addMessage(fileId, userMessage);
        saveChatMessage(fileId, userMessage);
        setInput('');
        setLoading(true);

        try {
            // Retrieve relevant document chunks
            const relevantChunks = retrieveRelevantChunks(input, documentText, 5);

            // Web search (Actual logic)
            let webResults: Array<{ title: string; snippet: string; url: string }> = [];
            if (isWebSearchEnabled) {
                if (!searchApiKey || !searchEngineId) {
                    addMessage(fileId, {
                        id: `msg_${Date.now()}_warn`,
                        role: 'assistant',
                        content: '⚠️ Live Search is enabled but Google Search API Key or Search Engine ID is missing. Please configure them in the API Settings (Gear icon).',
                        timestamp: Date.now()
                    });
                } else {
                    webResults = await searchWeb(input, searchApiKey, searchEngineId);
                }
            }

            // Build RAG prompt
            const prompt = buildRagPrompt(input, relevantChunks, webResults, isWebSearchEnabled);

            // Get AI response
            const response = await chatWithAI(prompt, apiKey);

            const assistantMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
                sources: [
                    ...relevantChunks.map(chunk => ({
                        type: 'document' as const,
                        text: chunk.substring(0, 100) + '...'
                    })),
                    ...webResults.map(r => ({
                        type: 'web' as const,
                        text: r.snippet,
                        url: r.url
                    }))
                ]
            };

            addMessage(fileId, assistantMessage);
            saveChatMessage(fileId, assistantMessage);
        } catch (err: any) {
            const errorMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: `Error: ${err.message}`,
                timestamp: Date.now()
            };
            addMessage(fileId, errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && e.ctrlKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Sidebar - Positioned inside main content area, below navbar */}
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="chat-sidebar"
                        style={{
                            position: 'fixed',
                            top: 84, // Below navbar (title bar 40px + tab bar 44px)
                            right: 0,
                            width: '380px',
                            height: 'calc(100vh - 84px)',
                            background: 'var(--bg-secondary)',
                            borderLeft: '1px solid var(--glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 50, // Lower z-index so it doesn't overlap navbar
                            boxShadow: '-10px 0 40px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(var(--accent-rgb), 0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Bot size={20} color="var(--accent-color)" />
                                <span style={{ fontWeight: 700, fontSize: 15 }}>AI Chat</span>
                                {documentText && (
                                    <span style={{
                                        fontSize: 10,
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        fontWeight: 600
                                    }}>
                                        RAG Active
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {fileId && currentMessages.length > 0 && (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => clearMessages(fileId)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            padding: 6
                                        }}
                                        title="Clear chat"
                                    >
                                        <Trash2 size={16} />
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: 6
                                    }}
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }} className="custom-scrollbar">
                            {!fileId ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    opacity: 0.5
                                }}>
                                    <FileText size={40} strokeWidth={1.5} />
                                    <span style={{ fontSize: 13 }}>Open a PDF to start chatting</span>
                                </div>
                            ) : currentMessages.length === 0 ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    opacity: 0.5,
                                    textAlign: 'center',
                                    padding: '0 20px'
                                }}>
                                    <Bot size={40} strokeWidth={1.5} />
                                    <span style={{ fontSize: 13 }}>
                                        Ask questions about this document.<br />
                                        I'll use the PDF content to help you.
                                    </span>
                                </div>
                            ) : (
                                currentMessages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            display: 'flex',
                                            gap: 10,
                                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                                        }}
                                    >
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: msg.role === 'user'
                                                ? 'var(--accent-color)'
                                                : 'rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {msg.role === 'user'
                                                ? <User size={16} color="white" />
                                                : <Bot size={16} color="var(--accent-color)" />
                                            }
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            background: msg.role === 'user'
                                                ? 'var(--accent-color)'
                                                : 'rgba(255,255,255,0.05)',
                                            padding: '12px 14px',
                                            borderRadius: msg.role === 'user'
                                                ? '16px 16px 4px 16px'
                                                : '16px 16px 16px 4px',
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                            maxWidth: '85%'
                                        }}>
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                                                    h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.2rem', margin: '14px 0 8px 0' }} {...props} />,
                                                    h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.1rem', margin: '12px 0 6px 0' }} {...props} />,
                                                    h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.0rem', margin: '10px 0 4px 0' }} {...props} />,
                                                    ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }} {...props} />,
                                                    ol: ({ node, ...props }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }} {...props} />,
                                                    li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                                    code: ({ node, ...props }) => (
                                                        <code style={{
                                                            background: 'rgba(255,255,255,0.1)',
                                                            padding: '2px 4px',
                                                            borderRadius: 4,
                                                            fontSize: '0.9em',
                                                            fontFamily: 'monospace'
                                                        }} {...props} />
                                                    ),
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>

                                            {/* Sources */}
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div style={{
                                                    marginTop: 10,
                                                    paddingTop: 10,
                                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                                    fontSize: 10,
                                                    opacity: 0.7
                                                }}>
                                                    <span style={{ fontWeight: 600 }}>Sources:</span>
                                                    {msg.sources.slice(0, 3).map((src, i) => (
                                                        <div key={i} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            marginTop: 4
                                                        }}>
                                                            {src.type === 'document'
                                                                ? <FileText size={10} />
                                                                : <ExternalLink size={10} />
                                                            }
                                                            <span style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {src.type === 'web' && src.url
                                                                    ? <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{src.text}</a>
                                                                    : src.text
                                                                }
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Loader2 size={16} className="animate-spin" color="var(--accent-color)" />
                                    </div>
                                    <span style={{ fontSize: 12, opacity: 0.6 }}>Thinking...</span>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{
                            padding: '16px',
                            borderTop: '1px solid var(--glass-border)',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            {/* Web Toggle */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 12,
                                padding: '8px 12px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Globe size={14} color={isWebSearchEnabled ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                                    <span style={{ fontSize: 12, fontWeight: 500 }}>Live Search</span>
                                </div>
                                <motion.button
                                    onClick={toggleWebSearch}
                                    style={{
                                        width: 40,
                                        height: 22,
                                        borderRadius: 11,
                                        background: isWebSearchEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <motion.div
                                        animate={{ x: isWebSearchEnabled ? 18 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background: 'white',
                                            position: 'absolute',
                                            top: 2
                                        }}
                                    />
                                </motion.button>
                            </div>

                            {/* Input */}
                            <div style={{
                                display: 'flex',
                                gap: 10,
                                alignItems: 'center'
                            }}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={fileId ? "Ask about this document..." : "Open a PDF first"}
                                    disabled={!fileId || isLoading}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 12,
                                        padding: '12px 16px',
                                        color: 'var(--text-primary)',
                                        fontSize: 13,
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSend}
                                    disabled={!input.trim() || !fileId || isLoading}
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: input.trim() && fileId ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: input.trim() && fileId ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: input.trim() && fileId ? 1 : 0.5
                                    }}
                                >
                                    <Send size={18} />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
