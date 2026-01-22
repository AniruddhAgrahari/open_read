import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTabStore } from '../store/useTabStore';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker properly
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    tabId: string;
    path: string;
    onSelection: (text: string, position: { x: number, y: number }) => void;
    onScroll?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ path, onSelection, onScroll }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isEditMode, isDarkMode } = useTabStore();
    const [scale] = useState(2.0); // High clarity scale

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // Handle scroll to hide bubble
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (onScroll) onScroll();
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [onScroll]);

    // Handle Selection - React-PDF renders text layers that work with standard selection API
    useEffect(() => {
        const handleMouseUp = () => {
            if (isEditMode) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                // If it's a simple click (collapsed selection), clear the bubble
                if (onScroll) onScroll(); // Use onScroll as a proxy for "dismiss bubble"
                return;
            }

            const text = selection.toString();
            
            // Basic cleaning
            const cleanedText = text
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[\r\n]+/g, ' ')
                .trim();

            if (cleanedText.length >= 2) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                onSelection(cleanedText, {
                    x: rect.left + rect.width / 2,
                    y: rect.bottom // Below the text for visibility
                });
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [onSelection, isEditMode]);

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
                padding: '40px 20px'
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
                            boxShadow: isDarkMode 
                                ? '0 10px 30px rgba(0,0,0,0.5)' 
                                : '0 4px 20px rgba(0,0,0,0.08)'
                        }}
                    >
                        <Page 
                            pageNumber={index + 1} 
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            className={isDarkMode ? 'dark-pdf-page' : ''}
                        />
                    </div>
                ))}
            </Document>

            <style>{`
                .pdf-viewer-container {
                    scrollbar-width: thin;
                    scrollbar-color: var(--glass-border) transparent;
                }
                .react-pdf__Page__canvas {
                    ${isDarkMode ? 'filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1);' : ''}
                    display: block !important;
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
