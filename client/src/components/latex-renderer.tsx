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
        // Clean and preprocess the content
        let processedContent = content;
        
        // Remove outer dollar signs if present
        processedContent = processedContent.replace(/^\$+|\$+$/g, '');
        
        // Handle display math mode markers
        processedContent = processedContent.replace(/^\\\[|\\\]$/g, '');
        processedContent = processedContent.replace(/^\\\(|\\\)$/g, '');
        
        // Clean up problematic LaTeX commands that cause rendering issues
        processedContent = processedContent.replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
        processedContent = processedContent.replace(/\\quad/g, '\\,');
        processedContent = processedContent.replace(/\\cdot([ms])/g, '\\cdot\\mathrm{$1}');
        
        // Fix common formatting issues with units
        processedContent = processedContent.replace(/Units:\s*/g, '\\,\\mathrm{(Units:\\,');
        processedContent = processedContent.replace(/\(Units:\s*([^)]+)\)/g, '\\,\\mathrm{(Units:\\,$1)}');
        
        (window as any).katex.render(processedContent, elementRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
          macros: {
            "\\cdot": "\\cdot",
            "\\times": "\\times", 
            "\\div": "\\div",
            "\\mathrm": "\\mathrm"
          }
        });
      } catch (error) {
        console.warn('KaTeX rendering failed for:', content, error);
        // Enhanced fallback: try simpler rendering
        try {
          if (elementRef.current) {
            const simplifiedContent = content.replace(/\\text\{([^}]*)\}/g, '$1');
            (window as any).katex.render(simplifiedContent, elementRef.current, {
              displayMode: false,
              throwOnError: false,
              strict: false
            });
          }
        } catch (fallbackError) {
          console.warn('Fallback rendering also failed:', fallbackError);
          if (elementRef.current) {
            elementRef.current.textContent = content;
          }
        }
      }
    }
  };

  return <span ref={elementRef} className={className}>{content}</span>;
}
