import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTabStore } from '../store/useTabStore';
import { DictionaryBubble } from './DictionaryBubble';
import { AnimatePresence } from 'framer-motion';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker properly
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    tabId: string;
    path: string;
    onSelection: (text: string, position: { x: number, y: number }) => void;
    selection?: { text: string, position: { x: number, y: number } } | null;
    onCloseSelection?: () => void;
    onDeepDive?: (text: string) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ path, onSelection, selection, onCloseSelection, onDeepDive }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isEditMode, viewMode } = useTabStore();

    const isDarkMode = viewMode === 'dark' || viewMode === 'eye-comfort' || viewMode === 'focus';

    // Fixed scale for high quality rendering - PDF will be scaled via CSS
    const pdfScale = 1.5;

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // Handle Selection - React-PDF renders text layers that work with standard selection API
    useEffect(() => {
        const handleMouseUp = () => {
            if (isEditMode) return;

            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                // If it's a simple click (collapsed selection), clear the bubble
                if (onCloseSelection) onCloseSelection();
                return;
            }

            const text = sel.toString();

            // Basic cleaning
            const cleanedText = text
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[\r\n]+/g, ' ')
                .trim();

            if (cleanedText.length >= 2) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const containerRect = containerRef.current?.getBoundingClientRect();

                if (containerRect) {
                    onSelection(cleanedText, {
                        x: rect.left - containerRect.left + rect.width / 2 + (containerRef.current?.scrollLeft || 0),
                        y: rect.bottom - containerRect.top + (containerRef.current?.scrollTop || 0)
                    });
                }
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [onSelection, isEditMode, onCloseSelection]);

    return (
        <div
            ref={containerRef}
            className={`pdf-viewer-container custom-scrollbar ${isEditMode ? 'edit-active' : ''}`}
            style={{
                width: '100%',
                height: '100%',
                background: isDarkMode ? '#1a1a1a' : '#f5f5f7',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                position: 'relative' // Critical for absolute bubble positioning
            }}
        >
            <Document
                file={path}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div style={{ color: 'var(--text-secondary)', marginTop: 40, fontSize: '14px' }}>Loading...</div>}
                error={<div style={{ color: '#ff4b4b', marginTop: 40, fontSize: '14px' }}>Error loading PDF</div>}
            >
                {Array.from(new Array(numPages), (_, index) => (
                    <div
                        key={`page_${index + 1}`}
                        className="pdf-page-container"
                        style={{
                            marginBottom: '24px',
                            background: 'white',
                            lineHeight: 0,
                            maxWidth: '100%',
                            boxShadow: isDarkMode
                                ? '0 10px 30px rgba(0,0,0,0.5)'
                                : '0 4px 20px rgba(0,0,0,0.08)'
                        }}
                    >
                        <Page
                            pageNumber={index + 1}
                            scale={pdfScale}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            className={isDarkMode ? 'dark-pdf-page' : ''}
                        />
                    </div>
                ))}
            </Document>

            <AnimatePresence>
                {selection && onCloseSelection && onDeepDive && (
                    <DictionaryBubble
                        word={selection.text}
                        position={selection.position}
                        onClose={onCloseSelection}
                        onDeepDive={onDeepDive}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .pdf-viewer-container {
                    scrollbar-width: thin;
                    scrollbar-color: var(--glass-border) transparent;
                }
                .pdf-page-container {
                    overflow: hidden;
                }
                .react-pdf__Page__canvas {
                    ${isDarkMode ? 'filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1);' : ''}
                    ${viewMode === 'eye-comfort' ? 'filter: sepia(0.3) brightness(0.95);' : ''}
                    display: block !important;
                    max-width: 100%;
                    height: auto !important;
                }
                .react-pdf__Page__textContent {
                    opacity: 1;
                }
                /* Professional Selection */
                .react-pdf__Page__textContent ::selection {
                    background: ${isDarkMode ? 'rgba(0, 102, 255, 0.4)' : 'rgba(0, 102, 255, 0.25)'} !important;
                }
                .react-pdf__Page__textContent span {
                    color: transparent;
                    pointer-events: auto;
                }
            `}</style>
        </div>
    );
};
