import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTabStore } from '../store/useTabStore';
import { DictionaryBubble } from './DictionaryBubble';
import { DraggableTextBox } from './DraggableTextBox';
import { AnimatePresence } from 'framer-motion';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker properly
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    tabId: string;
    path: string;
    isEditMode: boolean;
    activeTool: string | null;
    onSelection: (text: string, position: { x: number, y: number }) => void;
    selection?: { text: string, position: { x: number, y: number } } | null;
    onCloseSelection?: () => void;
    onDeepDive?: (text: string) => void;
    onPageInfoChange?: (current: number, total: number) => void;
    jumpToPage?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
    tabId,
    path,
    isEditMode,
    activeTool,
    onSelection,
    selection,
    onCloseSelection,
    onDeepDive,
    onPageInfoChange,
    jumpToPage
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    const {
        viewMode,
        tabs,
        addTextBox,
        updateTextBox,
        deleteTextBox
    } = useTabStore();

    const currentTab = tabs.find(t => t.id === tabId);
    const textBoxes = currentTab?.textBoxes || [];

    const isDarkMode = viewMode === 'dark' || viewMode === 'eye-comfort' || viewMode === 'focus';

    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth - 60;
                setContainerWidth(Math.max(width, 400));
            }
        };

        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(containerRef.current);
        updateWidth();

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        const options = {
            root: containerRef.current,
            threshold: 0.2,
        };

        const callback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.getAttribute('data-page-index') || '0', 10) + 1;
                    if (pageNum !== currentPage) {
                        setCurrentPage(pageNum);
                        onPageInfoChange?.(pageNum, numPages);
                    }
                }
            });
        };

        const observer = new IntersectionObserver(callback, options);
        const pageElements = containerRef.current?.querySelectorAll('.pdf-page-container');
        pageElements?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [numPages, onPageInfoChange, currentPage]);

    useEffect(() => {
        if (jumpToPage && jumpToPage > 0 && jumpToPage <= numPages) {
            const targetPage = pageRefs.current[jumpToPage - 1];
            if (targetPage) {
                targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [jumpToPage, numPages]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        onPageInfoChange?.(1, numPages);
    };

    const handlePageClick = (e: React.MouseEvent, pageNum: number) => {
        if (!isEditMode || !activeTool || activeTool === 'pointer') {
            setSelectedBoxId(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        addTextBox(tabId, {
            page: pageNum,
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
            content: '',
            type: activeTool
        });

        // Let user type immediately after adding
        // We'll need the ID, which is random, so we might need a small delay or a better way to auto-select
    };

    useEffect(() => {
        const handleMouseUp = () => {
            if (activeTool) return;

            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                if (onCloseSelection) onCloseSelection();
                return;
            }

            const text = sel.toString();
            const cleanedText = text.trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();

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
    }, [onSelection, activeTool, onCloseSelection]);

    return (
        <div
            ref={containerRef}
            className={`pdf-viewer-container custom-scrollbar ${activeTool ? 'edit-active' : ''}`}
            onClick={() => setSelectedBoxId(null)}
            style={{
                width: '100%',
                height: '100%',
                background: isDarkMode ? '#1a1a1a' : '#f5f5f7',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                position: 'relative'
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
                        ref={(el) => {
                            pageRefs.current[index] = el;
                        }}
                        data-page-index={index}
                        className="pdf-page-container"
                        onClick={(e) => handlePageClick(e, index + 1)}
                        style={{
                            marginBottom: '24px',
                            background: 'white',
                            lineHeight: 0,
                            maxWidth: '100%',
                            position: 'relative',
                            boxShadow: isDarkMode
                                ? '0 10px 30px rgba(0,0,0,0.5)'
                                : '0 4px 20px rgba(0,0,0,0.08)',
                            cursor: activeTool && activeTool !== 'pointer' ? 'crosshair' : 'default'
                        }}
                    >
                        <Page
                            pageNumber={index + 1}
                            width={containerWidth ? Math.min(containerWidth, 1000) : 800}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            {...(isDarkMode ? { renderMode: 'svg' } : {}) as any}
                            className={isDarkMode ? 'dark-pdf-page' : ''}
                        />

                        {/* Annotations Layer */}
                        {textBoxes.filter(box => box.page === index + 1).map(box => (
                            <DraggableTextBox
                                key={box.id}
                                id={box.id}
                                content={box.content}
                                type={box.type}
                                x={box.x}
                                y={box.y}
                                isSelected={selectedBoxId === box.id}
                                onUpdate={(content) => updateTextBox(tabId, box.id, content)}
                                onDelete={() => deleteTextBox(tabId, box.id)}
                                onSelect={() => setSelectedBoxId(box.id)}
                            />
                        ))}
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
                    overflow: visible !important;
                }
                /* Dark Mode: Invert page for text readability */
                .react-pdf__Page__canvas,
                .react-pdf__Page__svg {
                    ${isDarkMode ? 'filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1);' : ''}
                    ${viewMode === 'eye-comfort' ? 'filter: sepia(0.3) brightness(0.95);' : ''}
                    display: block !important;
                    max-width: 100%;
                    height: auto !important;
                }
                /* Smart Image Preservation: Counter-invert images in SVG mode */
                .react-pdf__Page__svg image {
                    ${isDarkMode ? 'filter: invert(1) hue-rotate(180deg);' : ''}
                }
                .react-pdf__Page__textContent {
                    opacity: 1;
                }
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
