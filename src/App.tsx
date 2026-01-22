import { useState, useEffect, useCallback, useRef } from 'react';
import { useTabStore } from './store/useTabStore';
import { useAiStore } from './store/useAiStore';
import { PDFViewer } from './components/PDFViewer';
import { DictionaryBubble } from './components/DictionaryBubble';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FloatingToolbar, Drawer } from './components/FloatingToolbar';
import { analyzeTextWithGroq } from './services/groqService';
import {
  Plus,
  X,
  FileText,
  Sparkles,
  Command,
  Edit3,
  MousePointer2,
  Loader2,
  ChevronRight,
  Wifi,
  Leaf,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

function App() {
  const { tabs, activeTabId, isEditMode, isDarkMode, addTab, removeTab, setActiveTab, toggleEditMode } = useTabStore();
  const { apiKey, analysis, isLoading, error, setApiKey, setAnalysis, setLoading, setError } = useAiStore();

  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ text: string, position: { x: number, y: number } } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const lastDismissTime = useRef<number>(0);

  // Handle theme toggling
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Global scroll/click listener to dismiss bubble
  useEffect(() => {
    const handleGlobalDismiss = () => {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      lastDismissTime.current = Date.now();
    };

    window.addEventListener('scroll', handleGlobalDismiss, { capture: true, passive: true });
    // This catches clicks that might not buble up or are on elements that stop propagation
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If we're clicking outside the bubble and PDF container, clear selection
      if (!target.closest('.glass') && !target.closest('.pdf-viewer-container')) {
        handleGlobalDismiss();
      }
    };
    window.addEventListener('mousedown', handleMouseDown, { capture: true });

    return () => {
      window.removeEventListener('scroll', handleGlobalDismiss, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
    };
  }, []);

  // Clean up invalid blob URLs on mount (happens after page refresh)
  useEffect(() => {
    tabs.forEach(tab => {
      // If the URL is a blob URL and invalid, remove the tab
      if (tab.path.startsWith('blob:')) {
        // Try to fetch the blob to see if it's still valid
        fetch(tab.path, { method: 'HEAD' })
          .catch(() => {
            // Blob URL is invalid, remove the tab
            removeTab(tab.id);
          });
      }
    });
  }, []); // Only run once on mount

  const handleOpenFile = async () => {
    try {
      if ((window as any).__TAURI__) {
        // Desktop (Tauri) environment
        const selected = await open({
          multiple: false,
          filters: [{
            name: 'PDF',
            extensions: ['pdf']
          }]
        });

        if (selected && typeof selected === 'string') {
          const name = selected.split(/[\\/]/).pop() || 'Document.pdf';
          const assetUrl = convertFileSrc(selected);
          addTab(name, assetUrl);
        }
      } else {
        // Browser environment fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            addTab(file.name, url);
          }
        };
        input.click();
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const handleDeepDive = async (text: string) => {
    if (!apiKey) {
      setError("Please connect your Groq API key in the top right menu.");
      setIsSettingsOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    setSelection(null);

    try {
      const result = await analyzeTextWithGroq(text, text, apiKey);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelection = useCallback((text: string, pos: { x: number, y: number }) => {
    // Lockout to prevent immediate re-trigger after dismissal
    if (Date.now() - lastDismissTime.current < 150) return;

    if (!isEditMode) {
      setSelection({ text, position: pos });
    }
  }, [isEditMode]);

  const handleScroll = useCallback(() => {
    setSelection(prev => {
      if (prev) {
        window.getSelection()?.removeAllRanges();
        return null; // Clear selection
      }
      return prev;
    });
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="app-container">
      <div className="title-bar glass" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Command size={14} />
          <span>NEURA PDF</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)', marginRight: 10 }}>
            <Cpu size={12} />
            <span>Memory Saver: {tabs.filter(t => t.isSuspended).length} suspended</span>
          </div>


          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="icon-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 500,
              background: 'var(--glass-bg)',
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              color: apiKey ? 'var(--accent-color)' : 'var(--text-secondary)'
            }}
          >
            <Wifi size={12} />
            <span>{apiKey ? 'AI Connected' : 'Connect AI'}</span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.isActive ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setSelection(null);
            }}
            style={{ position: 'relative' }}
          >
            <FileText size={14} style={{ opacity: tab.isSuspended ? 0.4 : 1 }} />
            <span style={{
              opacity: tab.isSuspended ? 0.6 : 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '120px',
              display: 'inline-block'
            }}>{tab.name}</span>
            {tab.isSuspended && (
              <Leaf size={10} color="#10b981" style={{ marginLeft: -4 }} />
            )}
            <X
              size={14}
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
            />
          </div>
        ))}
        <button
          className="tab"
          style={{ width: 40, padding: 0, justifyContent: 'center' }}
          onClick={handleOpenFile}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="main-content">
        {/* PDF Area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {activeTab ? (
              <motion.div
                key={activeTab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
              >
                <PDFViewer
                  tabId={activeTab.id}
                  path={activeTab.path}
                  onSelection={handleSelection}
                  onScroll={handleScroll}
                />
              </motion.div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: 20 }}>
                <Sparkles size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
                <p>Open a PDF to start analyzing</p>
                <button
                  onClick={handleOpenFile}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '20px',
                    background: 'var(--tab-active)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Browse Files
                </button>
              </div>
            )}
          </AnimatePresence>

          {/* Floating Bubble */}

          <AnimatePresence>
            {!isEditMode && selection && (
              <DictionaryBubble
                word={selection.text}
                position={selection.position}
                onClose={() => setSelection(null)}
                onDeepDive={handleDeepDive}
              />
            )}
          </AnimatePresence>
          {/* Floating Toolbar */}
          <FloatingToolbar
            activeDrawer={activeDrawer}
            onDrawerToggle={(id) => setActiveDrawer(activeDrawer === id ? null : id)}
          />
        </div>

        {/* Drawer System */}
        <Drawer
          id="right-drawer"
          isOpen={!!activeDrawer}
          onClose={() => setActiveDrawer(null)}
        >
          {activeDrawer === 'ai' && (
            <div className="drawer-content">
              <div className="drawer-title">
                <Sparkles size={18} color="var(--accent-color)" />
                <span>Deep Analysis</span>
              </div>

              <div style={{ marginBottom: 30 }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>AI Insights</p>
                <div style={{
                  minHeight: 100,
                  background: 'var(--glass-bg)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  position: 'relative'
                }}>
                  {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0' }}>
                      <Loader2 className="animate-spin" size={20} color="var(--accent-color)" />
                      <span style={{ fontSize: 12, opacity: 0.6 }}>Consulting Mixtral...</span>
                    </div>
                  ) : error ? (
                    <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>
                  ) : analysis ? (
                    <div className="analysis-text" style={{ lineHeight: 1.6, fontSize: 13 }}>
                      {analysis}
                    </div>
                  ) : (
                    <p style={{ opacity: 0.5, fontSize: 12 }}>Select text and click "Deep Dive" to start AI analysis.</p>
                  )}
                </div>
              </div>
            </div>
          )}



          {activeDrawer === 'edit' && (
            <div className="drawer-content">
              <div className="drawer-title">
                <Edit3 size={18} color="var(--accent-color)" />
                <span>Editor Mode</span>
              </div>

              <div
                onClick={toggleEditMode}
                className="sidebar-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: 12,
                  background: isEditMode ? 'var(--tab-active)' : 'var(--glass-bg)',
                  cursor: 'pointer',
                  color: isEditMode ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isEditMode ? <Edit3 size={16} /> : <MousePointer2 size={16} />}
                  <span style={{ fontWeight: 500 }}>{isEditMode ? 'Inline Editor' : 'Reading Mode'}</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.5 }} />
              </div>
            </div>
          )}
        </Drawer>

        {/* API Key Modal */}
        <ApiKeyModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
        />
      </div>
    </div>
  );
}

export default App;
