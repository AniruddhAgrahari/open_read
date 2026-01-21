import { useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';
import { useTabStore } from '../store/useTabStore';
import { mapPDFFontToCSS, loadGoogleFont } from '../utils/pdfFontEngine';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    tabId: string;
    path: string;
    onSelection: (text: string, position: { x: number, y: number }) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ tabId, path, onSelection }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { isEditMode, isDarkMode, updateTab, saveEdit, tabs } = useTabStore();
    const currentTab = tabs.find(t => t.id === tabId);

    // Use ref to access latest currentTab inside useEffect without adding it to dependencies
    const currentTabRef = useRef(currentTab);

    useEffect(() => {
        currentTabRef.current = currentTab;
    }, [currentTab]);

    useEffect(() => {
        let active = true;

        const loadPdf = async () => {
            try {
                const loadingTask = pdfjs.getDocument(path);
                const pdf = await loadingTask.promise;

                if (!active) return;

                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        await renderPage(pdf, i);
                    }

                    if (currentTabRef.current?.scrollPosition) {
                        setTimeout(() => {
                            if (containerRef.current) {
                                containerRef.current.scrollTop = currentTabRef.current!.scrollPosition.y;
                            }
                        }, 100);
                    }
                }
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };

        const renderPage = async (pdf: any, pageNum: number) => {
            const page = await pdf.getPage(pageNum);
            const outputScale = window.devicePixelRatio || 1;
            const viewport = page.getViewport({ scale: 1.5 });

            const pageContainer = document.createElement('div');
            pageContainer.className = `page-container ${isEditMode ? 'edit-mode' : ''}`;
            pageContainer.style.width = `${viewport.width}px`;
            pageContainer.style.height = `${viewport.height}px`;

            const canvas = document.createElement('canvas');
            let context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) return;

            // --- SMART DARK MODE IMAGE PATCH ---
            if (isDarkMode) {
                const originalDrawImage = context.drawImage;
                context.drawImage = function (...args: any[]) {
                    context!.save();
                    context!.filter = 'invert(1) hue-rotate(180deg)';
                    originalDrawImage.apply(context, args as any);
                    context!.restore();
                };
            }
            // -----------------------------------

            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            canvas.style.display = 'block';
            canvas.style.background = 'white';

            context.scale(outputScale, outputScale);
            context.fillStyle = 'white';
            context.fillRect(0, 0, viewport.width, viewport.height);

            pageContainer.appendChild(canvas);

            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            textLayerDiv.style.position = 'absolute';
            textLayerDiv.style.left = '0';
            textLayerDiv.style.top = '0';
            textLayerDiv.style.zIndex = '2';
            textLayerDiv.style.width = '100%';
            textLayerDiv.style.height = '100%';

            pageContainer.appendChild(textLayerDiv);
            containerRef.current?.appendChild(pageContainer);

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

            const textContent = await page.getTextContent();
            try {
                // @ts-ignore
                if (pdfjs.TextLayer) {
                    // @ts-ignore
                    const textLayer = new pdfjs.TextLayer({
                        textContentSource: textContent,
                        container: textLayerDiv,
                        viewport: viewport,
                    });
                    await textLayer.render();

                    const spans = textLayerDiv.querySelectorAll('span');
                    spans.forEach((span, idx) => {
                        const spanId = `p${pageNum}-s${idx}`;
                        const tab = currentTabRef.current; // Use fresh ref

                        // Restore persisted edit
                        if (tab?.edits && tab.edits[spanId]) {
                            span.textContent = tab.edits[spanId];
                            span.style.borderBottom = '1px dashed var(--accent-color)';
                        }


                        const item = textContent.items[idx] as any;
                        if (item && item.fontName) {
                            const fontFamily = mapPDFFontToCSS(item.fontName);
                            loadGoogleFont(fontFamily);
                            span.style.fontFamily = fontFamily;
                        }

                        if (isEditMode) {
                            span.style.cursor = 'text';
                            span.addEventListener('click', (e) => {
                                e.stopPropagation();
                                span.contentEditable = 'true';
                                span.style.background = 'rgba(255, 255, 255, 0.1)';
                                span.style.outline = '2px dashed var(--accent-color)';
                                span.style.outlineOffset = '2px';
                                span.style.color = isDarkMode ? '#e0e6ed' : '#1e293b';
                                span.style.minWidth = '5px';
                                span.focus();
                            });

                            span.addEventListener('blur', () => {
                                span.contentEditable = 'false';
                                span.style.outline = 'none';

                                if (span.textContent && span.textContent.trim() !== '') {
                                    // If text exists, keep it visible (opaque) to overlay original
                                    span.style.color = isDarkMode ? '#e0e6ed' : '#1e293b';
                                    span.style.backgroundColor = isDarkMode ? '#000000' : '#ffffff'; // Opaque bg to hide canvas text
                                    span.style.textDecoration = 'none';
                                    span.style.borderBottom = '1px dashed var(--accent-color)';

                                    saveEdit(tabId, spanId, span.textContent);
                                } else {
                                    // Revert if empty? Or just transparent
                                    span.style.color = 'transparent';
                                    span.style.background = 'transparent';
                                }
                            });

                            // Prevent bubbling for clean editing
                            span.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    span.blur();
                                }
                            });
                        } else {
                            span.style.cursor = 'text';
                            span.contentEditable = 'false';
                        }
                    });
                }
            } catch (e) {
                console.warn('Text layer rendering issue:', e);
            }
        };

        loadPdf();

        const handleMouseUp = () => {
            if (isEditMode) return;
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                onSelection(selection.toString().trim(), {
                    x: rect.left + rect.width / 2,
                    y: rect.top
                });
            }
        };

        // Debounce scroll position saving to avoid constant state updates
        let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleScroll = () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (containerRef.current) {
                    updateTab(tabId, {
                        scrollPosition: { x: 0, y: containerRef.current.scrollTop }
                    });
                }
            }, 300); // Save scroll position 300ms after scrolling stops
        };

        document.addEventListener('mouseup', handleMouseUp);
        const container = containerRef.current;
        container?.addEventListener('scroll', handleScroll);

        return () => {
            active = false;
            if (scrollTimeout) clearTimeout(scrollTimeout);
            document.removeEventListener('mouseup', handleMouseUp);
            container?.removeEventListener('scroll', handleScroll);
        };
    }, [path, onSelection, isEditMode, tabId, isDarkMode]); // Added isDarkMode to trigger re-render on toggle

    return (
        <div
            ref={containerRef}
            className={`pdf-viewer-container ${isEditMode ? 'edit-active' : ''}`}
            style={{
                width: '100%',
                padding: '40px 20px',
                background: 'var(--bg-primary)',
                overflowY: 'auto'
            }}
        />
    );
};
