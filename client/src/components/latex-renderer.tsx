import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXRendererProps {
  content: string;
  displayMode?: boolean;
  className?: string;
}

export default function LaTeXRenderer({ content, displayMode = true, className = "" }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      try {
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Process content for reliable rendering
        let mathContent = content.trim();
        
        // Remove surrounding dollar signs
        mathContent = mathContent.replace(/^\$+|\$+$/g, '');
        mathContent = mathContent.replace(/^\\\[|\\\]$/g, '');
        mathContent = mathContent.replace(/^\\\(|\\\)$/g, '');
        
        // Convert common problematic patterns to safe equivalents
        mathContent = mathContent.replace(/\\mathrm\{([^}]*)\}/g, '\\text{$1}');
        mathContent = mathContent.replace(/\\text\{Units:\s*([^}]*)\}/g, '\\text{(Units: $1)}');
        mathContent = mathContent.replace(/\\text\{([^}]*)\}/g, function(match, p1) {
          // Keep units and other text as simple text
          return p1;
        });
        
        // Render the math with KaTeX
        katex.render(mathContent, containerRef.current, {
          displayMode: displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
          macros: {
            "\\cdot": "\\cdot",
            "\\times": "\\times",
            "\\div": "\\div"
          }
        });
        
        console.log('Successfully rendered LaTeX:', mathContent);
      } catch (error) {
        console.warn('LaTeX rendering failed:', error, 'Content:', content);
        // Fallback to plain text display
        if (containerRef.current) {
          containerRef.current.textContent = content;
        }
      }
    }
  }, [content, displayMode]);

  return (
    <div 
      ref={containerRef} 
      className={`latex-content ${className}`}
      style={{ 
        minHeight: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    />
  );
}
