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
        
        console.log('Successfully rendered LaTeX:', mathContent, 'Original:', content);
      } catch (error) {
        console.error('LaTeX rendering failed:', error, 'Content:', content, 'Processed:', mathContent);
        // Enhanced fallback: try rendering without problematic commands
        try {
          if (containerRef.current) {
            // Try stripping all LaTeX commands and rendering as plain text with some formatting
            const plainText = content
              .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
              .replace(/\\[a-zA-Z]+/g, '')
              .replace(/[{}]/g, '');
            
            containerRef.current.innerHTML = `<span style="font-family: 'Times New Roman', serif; font-size: 16px;">${plainText}</span>`;
          }
        } catch (fallbackError) {
          console.error('Fallback rendering also failed:', fallbackError);
          if (containerRef.current) {
            containerRef.current.textContent = content;
          }
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
