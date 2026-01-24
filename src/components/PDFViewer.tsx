import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTabStore } from '../store/useTabStore';
import { DictionaryBubble } from './DictionaryBubble';
import { DraggableTextBox } from './DraggableTextBox';
import { DraggableShape } from './DraggableShape';
import { DraggableHighlight } from './DraggableHighlight';
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
    onInteraction?: () => void;
    onTextExtracted?: (text: string) => void;
    isSidebarOpen?: boolean;
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
    jumpToPage,
    onInteraction,
    onTextExtracted,
    isSidebarOpen
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [renderedWidth, setRenderedWidth] = useState<number>(0); // The width the PDF is currently drawn at
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const resizeTimeoutRef = useRef<number | null>(null);
    const isTransitioningRef = useRef(false);
    const scrollRatioRef = useRef(0);

    const {
        viewMode,
        tabs,
        addTextBox,
        updateTextBox,
        updateBox,
        deleteTextBox,
        shapeColor
    } = useTabStore();

    const currentTab = tabs.find(t => t.id === tabId);
    const textBoxes = currentTab?.textBoxes || [];
    const zoom = currentTab?.zoom || 1.0;

    const isDarkMode = viewMode === 'dark' || viewMode === 'eye-comfort' || viewMode === 'focus';

    // Unified resize and transition logic
    useEffect(() => {
        if (!containerRef.current) return;

        const syncSize = () => {
            if (!containerRef.current) return;
            // Calculate base width from container, minus padding
            const currentWidth = Math.max(containerRef.current.clientWidth - 60, 400);
            const targetWidth = Math.min(currentWidth, 1200);

            if (targetWidth !== renderedWidth) {
                setRenderedWidth(targetWidth);
            }
        };

        const performUpdate = () => {
            if (isTransitioningRef.current || !containerRef.current) return;

            // For initial load, set it immediately
            if (renderedWidth === 0) {
                syncSize();
                return;
            }

            // Normal resize debounce
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = setTimeout(syncSize, 150) as unknown as number;
        };

        const resizeObserver = new ResizeObserver(performUpdate);
        resizeObserver.observe(containerRef.current);

        // Initial measurement
        performUpdate();

        return () => {
            resizeObserver.disconnect();
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        };
    }, [renderedWidth]);

    // Sidebar transition freeze handler
    useEffect(() => {
        if (renderedWidth === 0 || !containerRef.current) return;

        // Freeze ResizeObserver updates during transition
        isTransitioningRef.current = true;

        const container = containerRef.current;
        scrollRatioRef.current = container.scrollTop / container.scrollHeight;

        const timer = setTimeout(() => {
            isTransitioningRef.current = false;

            // After transition finishes, sync to exact new size
            const currentWidth = Math.max(container.clientWidth - 60, 400);
            const targetWidth = Math.min(currentWidth, 1200);
            setRenderedWidth(targetWidth);

            // Restore scroll position
            setTimeout(() => {
                if (container) {
                    container.scrollTop = scrollRatioRef.current * container.scrollHeight;
                }
            }, 50);
        }, 400); // Slightly longer than CSS transition

        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

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

    const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        onPageInfoChange?.(1, numPages);

        // Extract full document text for RAG
        if (onTextExtracted) {
            try {
                const pdf = await pdfjs.getDocument(path).promise;
                let fullText = '';

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .map((item: any) => item.str)
                        .join(' ');
                    fullText += `\n--- Page ${i} ---\n${pageText}`;
                }

                onTextExtracted(fullText);
            } catch (err) {
                console.error('Failed to extract document text:', err);
            }
        }
    };

    // Drawing State
    const [drawingState, setDrawingState] = useState<{
        isDrawing: boolean;
        pageIndex: number | null;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
    }>({
        isDrawing: false,
        pageIndex: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    });

    // Handle text highlighting - captures selection and creates highlight annotation
    const handleHighlightSelection = useCallback((pageIndex: number) => {
        if (activeTool !== 'highlighter') return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const pageContainer = pageRefs.current[pageIndex];
        if (!pageContainer) return;

        const containerRect = pageContainer.getBoundingClientRect();

        // Get all the client rects from the selection - this gives us line-by-line bounding boxes
        const clientRects = range.getClientRects();
        if (clientRects.length === 0) return;

        // Convert client rects to percentage coordinates relative to page container
        const rects: Array<{ x: number; y: number; width: number; height: number }> = [];

        // Group rects by line (consolidate overlapping rects on same line)
        const lineThreshold = 5; // pixels - if y difference is less than this, consider same line
        let currentLineRects: DOMRect[] = [];
        let lastY = -1000;

        Array.from(clientRects).forEach((clientRect) => {
            // Skip tiny rects (usually whitespace)
            if (clientRect.width < 2 || clientRect.height < 2) return;

            // Check if this rect is on a new line
            if (Math.abs(clientRect.top - lastY) > lineThreshold && currentLineRects.length > 0) {
                // Consolidate previous line rects into one
                const minX = Math.min(...currentLineRects.map(r => r.left));
                const maxX = Math.max(...currentLineRects.map(r => r.right));
                const minY = Math.min(...currentLineRects.map(r => r.top));
                const maxY = Math.max(...currentLineRects.map(r => r.bottom));

                rects.push({
                    x: ((minX - containerRect.left) / containerRect.width) * 100,
                    y: ((minY - containerRect.top) / containerRect.height) * 100,
                    width: ((maxX - minX) / containerRect.width) * 100,
                    height: ((maxY - minY) / containerRect.height) * 100
                });

                currentLineRects = [];
            }

            currentLineRects.push(clientRect);
            lastY = clientRect.top;
        });

        // Don't forget the last line
        if (currentLineRects.length > 0) {
            const minX = Math.min(...currentLineRects.map(r => r.left));
            const maxX = Math.max(...currentLineRects.map(r => r.right));
            const minY = Math.min(...currentLineRects.map(r => r.top));
            const maxY = Math.max(...currentLineRects.map(r => r.bottom));

            rects.push({
                x: ((minX - containerRect.left) / containerRect.width) * 100,
                y: ((minY - containerRect.top) / containerRect.height) * 100,
                width: ((maxX - minX) / containerRect.width) * 100,
                height: ((maxY - minY) / containerRect.height) * 100
            });
        }

        if (rects.length === 0) return;

        // Create the highlight annotation
        addTextBox(tabId, {
            page: pageIndex + 1,
            x: rects[0].x,
            y: rects[0].y,
            content: selection.toString(),
            type: 'highlight',
            color: shapeColor,
            rects: rects
        });

        // Clear selection after highlighting
        selection.removeAllRanges();
    }, [activeTool, shapeColor, addTextBox, tabId]);

    const handleShapeMouseDown = (e: React.MouseEvent, pageIndex: number) => {
        if (!['rect', 'circle', 'oval', 'arrow'].includes(activeTool || '')) return;

        e.preventDefault(); // Prevent browser's default text selection
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setDrawingState({
            isDrawing: true,
            pageIndex,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y
        });
    };

    const handleShapeMouseMove = (e: React.MouseEvent) => {
        if (!drawingState.isDrawing) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setDrawingState(prev => ({
            ...prev,
            currentX: x,
            currentY: y
        }));
    };

    const handleShapeMouseUp = (e: React.MouseEvent) => {
        if (!drawingState.isDrawing) return;

        const { startX, startY, currentX, currentY, pageIndex } = drawingState;

        // Finalize shape
        // Calculate Center, Width, Height, Rotation based on tool type
        const rect = e.currentTarget.getBoundingClientRect();

        let width = Math.abs(currentX - startX);
        let height = Math.abs(currentY - startY);
        let x = (startX + currentX) / 2;
        let y = (startY + currentY) / 2;
        let rotation = 0;

        if (activeTool === 'circle') {
            // Force 1:1 aspect ratio based on max dimension logic or distance logic
            // Distance logic: diameter = distance between points (in px?) or just max(w, h)
            // Let's use the bounding box logic but square it
            // Determine max dimension in *pixels* to keep it visually square
            const widthPx = width / 100 * rect.width;
            const heightPx = height / 100 * rect.height;
            const diameterPx = Math.max(widthPx, heightPx);

            width = (diameterPx / rect.width) * 100;
            height = (diameterPx / rect.height) * 100;
            // Re-center
            // Assuming start point is fixed corner
            // Actually, usually circles grow from drag start? Or center?
            // "Calculate the distance between (x0, y0) and (x1, y1) to use as the diameter"
            // If diameter, then radius = distance / 2. Center = midpoint.
            const dxPx = (currentX - startX) / 100 * rect.width;
            const dyPx = (currentY - startY) / 100 * rect.height;
            const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

            width = (distPx / rect.width) * 100;
            height = (distPx / rect.height) * 100;
            // Center is midpoint (x, y already set)
        } else if (activeTool === 'arrow') {
            // Arrow logic
            // Center is midpoint
            // Width is length
            // Height is fixed thickness (e.g. 10px? or percentage)
            const dxPx = (currentX - startX) / 100 * rect.width;
            const dyPx = (currentY - startY) / 100 * rect.height;
            const lengthPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
            const angleRad = Math.atan2(dyPx, dxPx);

            rotation = angleRad * (180 / Math.PI);
            width = (lengthPx / rect.width) * 100;
            height = 0; // Handled by SVG as 'auto' or fixed px in component
        }

        // Only add if relevant size
        if (width > 0.5 || height > 0.5 || activeTool === 'arrow') {
            addTextBox(tabId, {
                page: pageIndex! + 1,
                x: parseFloat(x.toFixed(2)),
                y: parseFloat(y.toFixed(2)),
                content: '',
                type: activeTool!, // safe because check at start
                width: parseFloat(width.toFixed(2)),
                height: parseFloat(height.toFixed(2)),
                rotation: parseFloat(rotation.toFixed(2)),
                color: shapeColor
            });
        }

        setDrawingState({
            isDrawing: false,
            pageIndex: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        });
    };

    const handlePageClick = (e: React.MouseEvent, pageNum: number) => {
        if (!isEditMode || !activeTool || activeTool === 'pointer' || activeTool === 'highlighter' || ['rect', 'circle', 'oval', 'arrow'].includes(activeTool)) {
            setSelectedBoxId(null);
            return;
        }

        // Legacy click-to-add for text tools
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
            onClick={() => { setSelectedBoxId(null); onInteraction?.(); }}
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
                        className={`pdf-page-container ${isEditMode ? 'edit-mode' : ''} ${activeTool === 'highlighter' ? 'highlighter-mode' : ''}`}
                        onMouseDown={(e) => handleShapeMouseDown(e, index)}
                        onMouseMove={handleShapeMouseMove}
                        onMouseUp={(e) => {
                            handleShapeMouseUp(e);
                            // Handle highlight selection on mouseup
                            if (activeTool === 'highlighter') {
                                handleHighlightSelection(index);
                            }
                        }}
                        // Click handled if not drawing
                        onClick={(e) => !drawingState.isDrawing && handlePageClick(e, index + 1)}
                        style={{
                            marginBottom: '24px',
                            background: isDarkMode ? '#1a1a1a' : 'white',
                            lineHeight: 0,
                            width: (renderedWidth || 800) * zoom, // Match PDF width exactly
                            position: 'relative',
                            boxShadow: isDarkMode
                                ? '0 10px 30px rgba(0,0,0,0.5)'
                                : '0 4px 20px rgba(0,0,0,0.08)',
                            cursor: ['rect', 'circle', 'oval', 'arrow'].includes(activeTool || '') ? 'crosshair' : (activeTool === 'highlighter' ? 'text' : (activeTool && activeTool !== 'pointer' ? 'text' : 'default')),
                            userSelect: drawingState.isDrawing ? 'none' : 'auto',
                            transition: isTransitioningRef.current ? 'width 0.3s ease-out' : 'none'
                        }}
                    >
                        {/* Ghost Shape Layer */}
                        {drawingState.isDrawing && drawingState.pageIndex === index && (() => {
                            const { startX, startY, currentX, currentY } = drawingState;
                            const width = Math.abs(currentX - startX);
                            const height = Math.abs(currentY - startY);
                            const x = (startX + currentX) / 2;
                            const y = (startY + currentY) / 2;
                            let finalWidth = width;
                            let finalHeight = height;
                            let rotation = 0;

                            // Rect/Oval default is fine
                            if (activeTool === 'circle') {
                                // Simplified aspect ratio preview (perfect circle in % might look oval, but let's trust max %)
                                const maxDim = Math.max(width, height);
                                finalWidth = maxDim;
                                finalHeight = maxDim;
                            } else if (activeTool === 'arrow') {
                                // Arrow preview logic
                                // Need to calculate length and rotation
                                // We can't easily access px values here without ref, so we approximate or use generic line
                                // Visual feedback: Draw a dashed generic box or line?
                                // Let's try to pass the raw data to DraggableShape styling if possible or just render a line
                                // Simplified Arrow Ghost: Line from start to current
                                const length = Math.sqrt(width * width + height * height); // in % is distorted
                                finalWidth = length;
                                finalHeight = 0;
                                rotation = Math.atan2(currentY - startY, currentX - startX) * 180 / Math.PI;
                            }

                            return (
                                <div style={{
                                    position: 'absolute',
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    width: `${finalWidth}%`,
                                    height: activeTool === 'arrow' ? '2px' : `${finalHeight}%`,
                                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                    border: activeTool === 'arrow' ? 'none' : '2px dashed #0066ff',
                                    backgroundColor: activeTool !== 'arrow' ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
                                    borderRadius: ['circle', 'oval'].includes(activeTool || '') ? '50%' : '0',
                                    pointerEvents: 'none',
                                    zIndex: 1000
                                }}>
                                    {activeTool === 'arrow' && (
                                        <div style={{ width: '100%', height: '100%', borderTop: '2px dashed #0066ff' }} />
                                    )}
                                </div>
                            );
                        })()}

                        <Page
                            pageNumber={index + 1}
                            width={renderedWidth || 800}
                            scale={zoom}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            {...(isDarkMode ? { renderMode: 'svg' } : {}) as any}
                            className={isDarkMode ? 'dark-pdf-page' : ''}
                            loading=""
                        />

                        {/* Annotations Layer */}
                        {textBoxes.filter(box => box.page === index + 1).map(box => {
                            // Render highlights first (they go behind other annotations)
                            if (box.type === 'highlight' && box.rects) {
                                return (
                                    <DraggableHighlight
                                        key={box.id}
                                        id={box.id}
                                        rects={box.rects}
                                        color={box.color}
                                        isSelected={selectedBoxId === box.id}
                                        onDelete={() => deleteTextBox(tabId, box.id)}
                                        onSelect={() => setSelectedBoxId(box.id)}
                                    />
                                );
                            }
                            if (['rect', 'circle', 'oval', 'arrow'].includes(box.type)) {
                                return (
                                    <DraggableShape
                                        key={box.id}
                                        id={box.id}
                                        type={box.type as 'rect' | 'circle' | 'oval' | 'arrow'}
                                        x={box.x}
                                        y={box.y}
                                        width={box.width}
                                        height={box.height}
                                        rotation={box.rotation}
                                        color={box.color}
                                        isSelected={selectedBoxId === box.id}
                                        onUpdate={(updates) => updateBox(tabId, box.id, updates)}
                                        onDelete={() => deleteTextBox(tabId, box.id)}
                                        onSelect={() => setSelectedBoxId(box.id)}
                                    />
                                );
                            }
                            return (
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
                            );
                        })}
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
                    transition: opacity 0.1s ease-out;
                }
                /* Smooth resize transitions to prevent white glitches */
                .react-pdf__Page {
                    transition: width 0.1s cubic-bezier(0.4, 0, 0.2, 1);
                    will-change: width, transform;
                    background-color: ${isDarkMode ? '#1a1a1a' : 'white'} !important;
                    min-height: 400px;
                }
                /* Dark Mode: Invert page for text readability */
                .react-pdf__Page__canvas,
                .react-pdf__Page__svg {
                    ${isDarkMode ? 'filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1);' : ''}
                    ${viewMode === 'eye-comfort' ? 'filter: sepia(0.3) brightness(0.95);' : ''}
                    display: block !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: contain;
                    transition: opacity 0.1s ease-out;
                    will-change: opacity;
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
                /* Show text cursor ONLY in normal mode (not edit mode) */
                .pdf-page-container:not(.edit-mode) .react-pdf__Page__textContent,
                .pdf-page-container:not(.edit-mode) .react-pdf__Page__textContent span {
                    cursor: text !important;
                }
                /* In edit mode, inherit cursor from container */
                .pdf-page-container.edit-mode .react-pdf__Page__textContent,
                .pdf-page-container.edit-mode .react-pdf__Page__textContent span {
                    cursor: inherit !important;
                }
                /* Highlighter mode - enable text selection with colored highlight */
                .pdf-page-container.highlighter-mode .react-pdf__Page__textContent,
                .pdf-page-container.highlighter-mode .react-pdf__Page__textContent span {
                    cursor: text !important;
                    user-select: text !important;
                    -webkit-user-select: text !important;
                }
                .pdf-page-container.highlighter-mode .react-pdf__Page__textContent ::selection {
                    background: ${shapeColor}66 !important;
                }
            `}</style>
        </div>
    );
};
