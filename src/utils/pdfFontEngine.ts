/**
 * Font Engine for mapping PDF internal font names to CSS/Google Fonts
 */
export const mapPDFFontToCSS = (pdfFontName: string): string => {
    const name = pdfFontName.toLowerCase();

    // Standard PDF fonts mapping
    if (name.includes('helvetica') || name.includes('arial') || name.includes('sans')) {
        return "'Inter', sans-serif";
    }
    if (name.includes('times') || name.includes('serif')) {
        return "'PT Serif', serif";
    }
    if (name.includes('courier') || name.includes('mono')) {
        return "'JetBrains Mono', monospace";
    }

    // Fallback
    return "'Inter', sans-serif";
};

export const loadGoogleFont = (fontFamily: string) => {
    const linkId = `font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(linkId)) return;

    const fontName = fontFamily.split(',')[0].replace(/'/g, '');
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
};
