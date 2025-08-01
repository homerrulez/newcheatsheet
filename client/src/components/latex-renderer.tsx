import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

export default function LaTeXRenderer({ content, className = '', displayMode = false }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    try {
      // Clean the content to remove problematic patterns
      let cleanContent = content
        // Remove unit annotations like ", (N)" or ", (\\text{J})"
        .replace(/,\s*\([^)]*\\text\{[^}]*\}[^)]*\)/g, '')
        .replace(/,\s*\([^)]*\)/g, '')
        // Remove standalone \\text{} commands
        .replace(/\\text\{[^}]*\}/g, '')
        // Remove \\mathrm{} commands  
        .replace(/\\mathrm\{[^}]*\}/g, '')
        // Fix escaped backslashes
        .replace(/\\\\/g, '\\')
        // Remove problematic vector notation
        .replace(/\\vec\{([^}]+)\}/g, '$1')
        // Simplify complex delimiters
        .replace(/\\left\(/g, '(')
        .replace(/\\right\)/g, ')')
        .replace(/\\left\[/g, '[')
        .replace(/\\right\]/g, ']')
        // Clean up extra spaces
        .trim();

      // Render with KaTeX
      katex.render(cleanContent, containerRef.current, {
        displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false
      });
    } catch (error) {
      console.warn('LaTeX rendering error:', error);
      // Fallback to plain text
      if (containerRef.current) {
        containerRef.current.textContent = content;
      }
    }
  }, [content, displayMode]);

  return <div ref={containerRef} className={className} />;
}