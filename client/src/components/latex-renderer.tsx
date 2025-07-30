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
        
        // Check if content is mathematical notation or regular text
        const isMathContent = content.includes('\\') || content.includes('=') || content.includes('^') || content.includes('_') || content.includes('frac') || content.match(/[∫∑∏∇αβγδεζηθικλμνξοπρστυφχψω]/);
        
        // If it's regular text, just display it normally with proper formatting
        if (!isMathContent) {
          // Preserve line breaks and spaces in text content
          const formattedText = content
            .replace(/\n/g, '<br>')
            .replace(/  /g, '&nbsp;&nbsp;')
            .trim();
          
          containerRef.current.innerHTML = `<span style="font-family: inherit; font-size: inherit; line-height: 1.6; white-space: pre-wrap;">${formattedText}</span>`;
          return;
        }
        
        // Process content for reliable rendering
        let mathContent = content.trim();
        
        try {
          // Clear previous content
          containerRef.current.innerHTML = '';
          
          // Remove surrounding dollar signs
          mathContent = mathContent.replace(/^\$+|\$+$/g, '');
          mathContent = mathContent.replace(/^\\\[|\\\]$/g, '');
          mathContent = mathContent.replace(/^\\\(|\\\)$/g, '');
          
          // Enhanced LaTeX cleaning for complex mathematical expressions
          mathContent = mathContent.replace(/\\+$/, ''); // Remove trailing backslashes
          mathContent = mathContent.replace(/\\\s*$/, ''); // Remove trailing backslash with space
          mathContent = mathContent.replace(/\\times/g, '\\cdot'); // Replace times with cdot
          
          // Remove problematic text commands that break KaTeX
          mathContent = mathContent.replace(/\\text\{[^}]*\}/g, ''); // Remove text commands (units)
          mathContent = mathContent.replace(/\\mathrm\{[^}]*\}/g, ''); // Remove mathrm commands
          mathContent = mathContent.replace(/\([^)]*Units[^)]*\)/g, ''); // Remove units in parentheses
          
          // Remove unit annotations in parentheses with various spacing patterns
          mathContent = mathContent.replace(/\s*,\s*\([^)]*\)/g, ''); // Remove ", (N)" style units
          mathContent = mathContent.replace(/\s*\\\,\s*\([^)]*\)/g, ''); // Remove "\, (N)" style units  
          mathContent = mathContent.replace(/\s*\\,\s*\([^)]*\)/g, ''); // Remove "\, (N)" style units
          mathContent = mathContent.replace(/\s*\([^)]*\)\s*$/g, ''); // Remove trailing unit parentheses
          
          // Fix common notation issues that cause KaTeX errors
          mathContent = mathContent.replace(/\\Phi/g, '\\phi');
          mathContent = mathContent.replace(/\\_/g, '_'); // Fix escaped underscores
          mathContent = mathContent.replace(/\\left\(/g, '('); // Simplify left/right delimiters
          mathContent = mathContent.replace(/\\right\)/g, ')');
          mathContent = mathContent.replace(/\\left\[/g, '[');
          mathContent = mathContent.replace(/\\right\]/g, ']');
          mathContent = mathContent.replace(/\\left\{/g, '\\{');
          mathContent = mathContent.replace(/\\right\}/g, '\\}');
          
          // Handle vector notation issues more aggressively
          mathContent = mathContent.replace(/\\vec\{([^}]*)\}/g, '\\mathbf{$1}'); // Use mathbf instead of vec
          mathContent = mathContent.replace(/\\mathbf\{([^}]*)\}/g, '$1'); // Remove mathbf entirely
          mathContent = mathContent.replace(/\\nabla_([a-zA-Z])/g, '\\nabla_$1'); // Fix subscript nabla
          mathContent = mathContent.replace(/\\nabla\s*\\cdot/g, 'div'); // Replace nabla dot with div
          mathContent = mathContent.replace(/\\nabla\s*\\times/g, 'curl'); // Replace nabla cross with curl
          mathContent = mathContent.replace(/\\nabla/g, '\\nabla'); // Keep simple nabla
          
          // Clean up extra spaces but preserve essential LaTeX structure
          mathContent = mathContent.replace(/\s+/g, ' ').trim();
          
          // Render the math with KaTeX - add retry logic
          const attemptRender = (attempt = 1) => {
            try {
              katex.render(mathContent, containerRef.current!, {
                displayMode: displayMode,
                throwOnError: false,
                strict: false,
                trust: true,
                errorColor: '#666',
                output: 'html',
                fleqn: false,
                macros: {
                  "\\cdot": "\\cdot",
                  "\\times": "\\times", 
                  "\\div": "\\div",
                  "\\grad": "\\nabla",
                  "\\curl": "\\nabla \\times",
                  "\\divergence": "\\nabla \\cdot"
                }
              });
              
              console.log(`LaTeX rendered successfully on attempt ${attempt}:`, mathContent);
            } catch (renderError) {
              console.error(`LaTeX render attempt ${attempt} failed:`, renderError, 'Content:', mathContent);
              
              if (attempt < 3) {
                // Retry with slight delay
                setTimeout(() => attemptRender(attempt + 1), 50 * attempt);
              } else {
                // Final fallback after 3 attempts - show simplified math
                if (containerRef.current) {
                  // Create a more readable fallback by simplifying the LaTeX
                  let simplifiedMath = mathContent
                    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)') // Convert fractions
                    .replace(/\\partial/g, '∂') // Replace partial symbol
                    .replace(/\\nabla\s*\\cdot/g, 'div') // Replace nabla dot
                    .replace(/\\nabla\s*\\times/g, 'curl') // Replace nabla cross
                    .replace(/\\nabla/g, '∇') // Replace nabla
                    .replace(/\\cdot/g, '·') // Replace cdot
                    .replace(/\\mathbf\{([^}]*)\}/g, '$1') // Remove mathbf
                    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // Remove other commands
                    .replace(/\\[a-zA-Z]+/g, '') // Remove standalone commands
                    .replace(/[{}]/g, '') // Remove braces
                    .replace(/\s+/g, ' ') // Clean up spaces
                    .trim();
                  
                  containerRef.current.innerHTML = `<span style="font-family: 'Times New Roman', serif; font-size: 14px; color: #666; font-style: italic;">${simplifiedMath}</span>`;
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
