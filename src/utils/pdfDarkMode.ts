export const applySmartDarkMode = (ctx: CanvasRenderingContext2D, isDarkMode: boolean) => {
  if (!isDarkMode) return ctx;

  const originalDrawImage = ctx.drawImage;
  // Softer dark mode filter
  const darkFilter = 'invert(0.9) hue-rotate(180deg)';

  // Hook into drawImage to disable filter for images (XObjects)
  ctx.drawImage = function (...args: any[]) {
    const currentFilter = this.filter;
    this.filter = 'none'; // CRITICAL: Disable inversion for images

    // Ensure we handle different drawImage signatures
    // @ts-ignore
    const result = originalDrawImage.apply(this, args);

    this.filter = currentFilter;
    return result;
  };

  // Set initial filter for text, paths and rects
  ctx.filter = darkFilter;

  return ctx;
};
