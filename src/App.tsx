import { useState, useEffect, useCallback, useRef } from 'react';
import { useTabStore } from './store/useTabStore';
import { useAiStore } from './store/useAiStore';
import { PDFViewer } from './components/PDFViewer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FloatingToolbar, PremiumPanel } from './components/FloatingToolbar';
import { EditorToolbar } from './components/EditorToolbar';
import { PageIndicator } from './components/PageIndicator';
import { analyzeTextWithGroq } from './services/groqService';
import {
  Plus,
  X,
  FileText,
  Sparkles,
  Command,
  Loader2,
  ChevronRight,
  Wifi,
  Leaf,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import ReactMarkdown from 'react-markdown';

function App() {
  const { tabs, activeTabId, isEditMode, viewMode, addTab, removeTab, setActiveTab, toggleEditMode } = useTabStore();
  const { apiKey, analysis, isLoading, error, setApiKey, setAnalysis, setLoading, setError } = useAiStore();

  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ text: string, position: { x: number, y: number } } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeEditorTool, setActiveEditorTool] = useState<string | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [totalPdfPages, setTotalPdfPages] = useState(0);
  const [jumpToPage, setJumpToPage] = useState<number | undefined>(undefined);
  const lastDismissTime = useRef<number>(0);

  // Handle view mode changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light-mode', 'eye-comfort-mode', 'focus-mode');

    // Tauri window handle
    const tauriWindow = (window as any).__TAURI__ ? getCurrentWindow() : null;

    if (viewMode === 'normal') {
      root.classList.add('light-mode');
    } else if (viewMode === 'eye-comfort') {
      root.classList.add('eye-comfort-mode');
    } else if (viewMode === 'focus') {
      setIsFocusMode(true);
      setIsNavbarCollapsed(true);
      setIsToolbarCollapsed(true);

      // Fullscreen logic
      if (tauriWindow) {
        tauriWindow.setFullscreen(true).catch(console.error);
      } else if (root.requestFullscreen) {
        root.requestFullscreen().catch(console.error);
      }
    }

    if (viewMode !== 'focus') {
      setIsFocusMode(false);
      // Exit fullscreen logic
      if (tauriWindow) {
        tauriWindow.setFullscreen(false).catch(console.error);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
      }
    }
  }, [viewMode]);

  // Global click listener to dismiss bubble
  useEffect(() => {
    const handleGlobalDismiss = () => {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      lastDismissTime.current = Date.now();
    };

    // This catches clicks that might not buble up or are on elements that stop propagation
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If we're clicking outside the bubble, clear selection
      // This allows clicking on the PDF to dismiss the current bubble
      if (!target.closest('.glass') && !target.closest('.premium-panel')) {
        handleGlobalDismiss();
      }
    };
    window.addEventListener('mousedown', handleMouseDown, { capture: true });

    return () => {
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
      setActiveDrawer('ai');
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

  const activeTab = tabs.find(t => t.id === activeTabId);


  return (
    <div className="app-container">
      <div className={`navbar-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="title-bar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Command size={14} />
            <span>NEURA PDF</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', marginRight: 10 }}>
              <Cpu size={14} />
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

            <button
              onClick={() => setIsNavbarCollapsed(true)}
              className="icon-btn"
              title="Collapse Navbar"
              style={{ marginLeft: 8 }}
            >
              <ChevronRight size={16} style={{ transform: 'rotate(-90deg)' }} />
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
              <FileText size={15} style={{ opacity: tab.isSuspended ? 0.4 : 1, minWidth: 15 }} />
              <span style={{
                opacity: tab.isSuspended ? 0.6 : 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px',
                display: 'inline-block'
              }}>{tab.name}</span>
              {tab.isSuspended && (
                <Leaf size={15} color="#10b981" style={{ marginLeft: 6, minWidth: 15 }} />
              )}
              <X
                size={16}
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

        <button
          className={`navbar-toggle ${isNavbarCollapsed || isFocusMode ? '' : 'expanded'}`}
          onClick={() => {
            if (isFocusMode) {
              // Exit focus mode when user tries to expand navbar
              setIsFocusMode(false);
              setIsNavbarCollapsed(false);
              setIsToolbarCollapsed(false);
            } else {
              setIsNavbarCollapsed(!isNavbarCollapsed);
            }
          }}
          title={isNavbarCollapsed || isFocusMode ? "Expand Navbar" : "Collapse Navbar"}
        >
          {isNavbarCollapsed || isFocusMode ? <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} /> : <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} />}
        </button>
      </div>

      <div className="main-content" style={{ marginTop: isNavbarCollapsed ? 0 : 0 }}>
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
                  isEditMode={isEditMode}
                  onSelection={handleSelection}
                  selection={selection}
                  onCloseSelection={() => setSelection(null)}
                  onDeepDive={handleDeepDive}
                  onPageInfoChange={(current, total) => {
                    setCurrentPdfPage(current);
                    setTotalPdfPages(total);
                  }}
                  jumpToPage={jumpToPage}
                  activeTool={activeEditorTool}
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

          {/* Floating Toolbar */}
          <FloatingToolbar
            activeDrawer={activeDrawer}
            onDrawerToggle={(id) => setActiveDrawer(activeDrawer === id ? null : id)}
            isCollapsed={isToolbarCollapsed || isFocusMode}
            onCollapseToggle={() => {
              if (isFocusMode) {
                // Exit focus mode when user tries to expand
                setIsFocusMode(false);
                setIsToolbarCollapsed(false);
                setIsNavbarCollapsed(false);
              } else {
                setIsToolbarCollapsed(!isToolbarCollapsed);
              }
            }}
            onFocusModeToggle={(enabled) => {
              setIsFocusMode(enabled);
              if (enabled) {
                setIsNavbarCollapsed(true);
                setIsToolbarCollapsed(true);
              } else {
                setIsNavbarCollapsed(false);
                setIsToolbarCollapsed(false);
              }
            }}
            isEditMode={isEditMode}
            onEditToggle={() => {
              if (isEditMode) setActiveEditorTool(null);
              toggleEditMode();
            }}
          />

          {/* Persistent Editor Toolbar */}
          <EditorToolbar
            isOpen={isEditMode}
            onClose={() => {
              if (isEditMode) setActiveEditorTool(null);
              toggleEditMode();
            }}
            activeTool={activeEditorTool}
            onToolSelect={setActiveEditorTool}
          />

          {/* Page Indicator */}
          {activeTab && totalPdfPages > 0 && (
            <PageIndicator
              currentPage={currentPdfPage}
              totalPages={totalPdfPages}
              onPageJump={(page) => {
                setJumpToPage(page);
                // Reset jumpToPage after a small delay to allow re-triggering the same page
                setTimeout(() => setJumpToPage(undefined), 500);
              }}
            />
          )}
        </div>

        {/* Premium Panel System */}
        <PremiumPanel
          id="premium-panel"
          isOpen={!!activeDrawer}
          onClose={() => setActiveDrawer(null)}
        >
          {activeDrawer === 'ai' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Sparkles size={18} color="var(--accent-color)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Deep Analysis</span>
              </div>

              <div style={{
                minHeight: 120,
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 16,
                padding: 16,
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}>
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 0' }}>
                    <Loader2 className="animate-spin" size={24} color="var(--accent-color)" />
                    <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 500 }}>Thinking...</span>
                  </div>
                ) : error ? (
                  <div style={{ color: '#ef4444', fontSize: 12, lineHeight: 1.5 }}>{error}</div>
                ) : analysis ? (
                  <div className="analysis-text">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                ) : (
                  <p style={{ opacity: 0.5, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    Select text and click "Deep Dive" to start AI analysis.
                  </p>
                )}
              </div>
            </div>
          )}

        </PremiumPanel>

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
