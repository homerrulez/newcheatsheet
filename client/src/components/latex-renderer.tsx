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
      // Add delay to prevent race conditions when multiple boxes render simultaneously
      const renderTimeout = setTimeout(() => {
        if (!containerRef.current) return;
        
        // Process content for reliable rendering
        let mathContent = content.trim();
        
        try {
          // Clear previous content
          containerRef.current.innerHTML = '';
          
          // Remove surrounding dollar signs
          mathContent = mathContent.replace(/^\$+|\$+$/g, '');
          mathContent = mathContent.replace(/^\\\[|\\\]$/g, '');
          mathContent = mathContent.replace(/^\\\(|\\\)$/g, '');
          
          // Clean up problematic LaTeX patterns
          mathContent = mathContent.replace(/\\+$/, ''); // Remove trailing backslashes
          mathContent = mathContent.replace(/\\\s*$/, ''); // Remove trailing backslash with space
          mathContent = mathContent.replace(/\\times/g, '\\cdot'); // Replace times with cdot
          mathContent = mathContent.replace(/\\mathrm\{([^}]*)\}/g, '\\text{$1}');
          mathContent = mathContent.replace(/\\text\{Units:\s*([^}]*)\}/g, '\\text{(Units: $1)}');
          mathContent = mathContent.replace(/\\text\{([^}]*)\}/g, function(match, p1) {
            // Keep units and other text as simple text
            return p1;
          });
          
          // Fix common physics notation issues
          mathContent = mathContent.replace(/\\Phi/g, '\\phi'); // Use lowercase phi
          mathContent = mathContent.replace(/\\Delta/g, '\\Delta'); // Ensure Delta is properly formatted
          
          // Render the math with KaTeX - add retry logic
          const attemptRender = (attempt = 1) => {
            try {
              katex.render(mathContent, containerRef.current!, {
                displayMode: displayMode,
                throwOnError: true, // Change to true to catch specific errors
                strict: false,
                trust: true,
                macros: {
                  "\\cdot": "\\cdot",
                  "\\times": "\\times",
                  "\\div": "\\div"
                }
              });
              
              console.log(`LaTeX rendered successfully on attempt ${attempt}:`, mathContent);
            } catch (renderError) {
              console.error(`LaTeX render attempt ${attempt} failed:`, renderError, 'Content:', mathContent);
              
              if (attempt < 3) {
                // Retry with slight delay
                setTimeout(() => attemptRender(attempt + 1), 50 * attempt);
              } else {
                // Final fallback after 3 attempts
                if (containerRef.current) {
                  const plainText = content
                    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
                    .replace(/\\[a-zA-Z]+/g, '')
                    .replace(/[{}]/g, '');
                  
                  containerRef.current.innerHTML = `<span style="font-family: 'Times New Roman', serif; font-size: 16px; color: #d63384;">${plainText} [Failed after 3 attempts]</span>`;
                }
              }
            }
          };
          
          attemptRender();
          
        } catch (error) {
          console.error('LaTeX preprocessing failed:', error, 'Content:', content);
          if (containerRef.current) {
            containerRef.current.textContent = content;
          }
        }
      }, Math.random() * 100); // Random delay 0-100ms to prevent simultaneous rendering
      
      return () => clearTimeout(renderTimeout);
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
