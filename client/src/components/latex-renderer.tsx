import { useEffect, useRef } from 'react';

interface LaTeXRendererProps {
  content: string;
  displayMode?: boolean;
  className?: string;
}

export default function LaTeXRenderer({ content, displayMode = false, className = "" }: LaTeXRendererProps) {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (elementRef.current && typeof window !== 'undefined') {
      // Dynamically load KaTeX if not already loaded
      if (!(window as any).katex) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
        script.onload = () => {
          const autoRenderScript = document.createElement('script');
          autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
          autoRenderScript.onload = () => renderMath();
          document.head.appendChild(autoRenderScript);
        };
        document.head.appendChild(script);

        // Also load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
        document.head.appendChild(link);
      } else {
        renderMath();
      }
    }
  }, [content, displayMode]);

  const renderMath = () => {
    if (elementRef.current && (window as any).katex) {
      try {
        (window as any).katex.render(content, elementRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
        });
      } catch (error) {
        console.warn('KaTeX rendering failed:', error);
        if (elementRef.current) {
          elementRef.current.textContent = content;
        }
      }
    }
  };

  return <span ref={elementRef} className={className}>{content}</span>;
}
