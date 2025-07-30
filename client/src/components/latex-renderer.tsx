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
          
          // Aggressive LaTeX cleaning for problematic patterns
          mathContent = mathContent.replace(/\\+$/, ''); // Remove trailing backslashes
          mathContent = mathContent.replace(/\\\s*$/, ''); // Remove trailing backslash with space
          mathContent = mathContent.replace(/\\times/g, '\\cdot'); // Replace times with cdot
          
          // Handle text and units more aggressively
          mathContent = mathContent.replace(/\\text\{[^}]*\}/g, ''); // Remove all text commands
          mathContent = mathContent.replace(/\\mathrm\{[^}]*\}/g, ''); // Remove all mathrm commands
          mathContent = mathContent.replace(/\([^)]*Units[^)]*\)/g, ''); // Remove units in parentheses
          mathContent = mathContent.replace(/Units[^,})\]]*[,})\]]/g, ''); // Remove Units: text
          
          // Fix problematic symbols and commands
          mathContent = mathContent.replace(/\\Phi/g, '\\phi');
          mathContent = mathContent.replace(/\\Delta/g, '\\Delta');
          mathContent = mathContent.replace(/\\_/g, '_'); // Fix escaped underscores
          mathContent = mathContent.replace(/\\,/g, ' '); // Replace \, with space
          
          // Remove any remaining backslash-letter combinations that might cause issues
          mathContent = mathContent.replace(/\\[a-zA-Z]+(?![{_^])/g, ''); // Remove standalone commands
          
          // Clean up extra spaces and normalize
          mathContent = mathContent.replace(/\s+/g, ' ').trim();
          
          // Render the math with KaTeX - add retry logic
          const attemptRender = (attempt = 1) => {
            try {
              katex.render(mathContent, containerRef.current!, {
                displayMode: displayMode,
                throwOnError: false, // Keep false to prevent crashes
                strict: false,
                trust: true,
                errorColor: '#d63384',
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
