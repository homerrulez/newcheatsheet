import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Declare global renderMathInElement function
declare global {
  interface Window {
    renderMathInElement?: (element: HTMLElement, options?: any) => void;
  }
}

interface LaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

export default function LaTeXRenderer({ content, className = "", displayMode = true }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      try {
        // Process LaTeX content for beautiful rendering
        const processedContent = processLaTeXContent(content);
        containerRef.current.innerHTML = processedContent;
        
        // Render LaTeX after content is set
        setTimeout(() => {
          if (containerRef.current && typeof window.renderMathInElement !== 'undefined') {
            window.renderMathInElement(containerRef.current, {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
              ],
              throwOnError: false,
              errorColor: '#cc0000',
              macros: {
                // Physics macros
                "\\vec": "\\mathbf{#1}",
                "\\div": "\\text{div}",
                "\\curl": "\\text{curl}",
                "\\grad": "\\nabla",
                "\\force": "\\mathbf{F}",
                "\\moment": "\\mathbf{M}",
                "\\velocity": "\\mathbf{v}",
                "\\acceleration": "\\mathbf{a}",
                "\\momentum": "\\mathbf{p}",
                "\\energy": "E",
                "\\kinetic": "K",
                "\\potential": "U",
                "\\work": "W",
                "\\power": "P",
                "\\pressure": "P",
                "\\density": "\\rho",
                "\\temperature": "T",
                "\\entropy": "S",
                "\\enthalpy": "H",
                "\\heat": "Q",
                
                // Chemistry macros
                "\\chem": "\\text{#1}",
                "\\reaction": "\\ce{#1}",
                "\\molecule": "\\ce{#1}",
                "\\concentration": "[#1]",
                "\\equilibrium": "\\rightleftharpoons",
                "\\catalyst": "\\text{catalyst}",
                "\\activation": "E_a",
                "\\rate": "k",
                "\\order": "n",
                
                // Engineering macros
                "\\stress": "\\sigma",
                "\\strain": "\\varepsilon",
                "\\modulus": "E",
                "\\poisson": "\\nu",
                "\\shear": "\\tau",
                "\\torsion": "T",
                "\\bending": "M",
                "\\deflection": "\\delta",
                "\\frequency": "f",
                "\\wavelength": "\\lambda",
                "\\amplitude": "A",
                "\\phase": "\\phi",
                "\\impedance": "Z",
                "\\resistance": "R",
                "\\capacitance": "C",
                "\\inductance": "L",
                "\\voltage": "V",
                "\\current": "I",
                
                // Calculus macros
                "\\derivative": "\\frac{d}{dx}",
                "\\partial": "\\frac{\\partial}{\\partial}",
                "\\integral": "\\int",
                "\\definite": "\\int_{#1}^{#2}",
                "\\limit": "\\lim",
                "\\series": "\\sum",
                "\\product": "\\prod",
                "\\convergence": "\\to",
                "\\infinity": "\\infty",
                "\\differential": "d",
                "\\partialdiff": "\\partial",
                
                // Mathematical macros
                "\\abs": "|#1|",
                "\\norm": "\\|#1\\|",
                "\\set": "\\{#1\\}",
                "\\seq": "(#1)",
                "\\mat": "\\begin{pmatrix} #1 \\end{pmatrix}",
                "\\det": "\\det",
                "\\tr": "\\text{tr}",
                "\\rank": "\\text{rank}",
                "\\nullity": "\\text{nullity}",
                "\\eigenvalue": "\\lambda",
                "\\eigenvector": "\\mathbf{v}",
                "\\transpose": "T",
                "\\inverse": "^{-1}",
                "\\conjugate": "\\overline{#1}",
                "\\real": "\\text{Re}",
                "\\imaginary": "\\text{Im}",
                "\\mod": "\\bmod",
                "\\gcd": "\\gcd",
                "\\lcm": "\\text{lcm}",
                "\\factorial": "!",
                "\\binomial": "\\binom{#1}{#2}",
                "\\permutation": "P(#1,#2)",
                "\\combination": "C(#1,#2)"
              }
            });
            setRenderError(null);
          }
        }, 100);
      } catch (error) {
        console.error('LaTeX rendering error:', error);
        setRenderError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }, [content]);

  function processLaTeXContent(content: string): string {
    return content
      // Convert LaTeX delimiters to standard format
      .replace(/\\[(]([^)]+)\\[)]/g, (match, equation) => {
        return `$${equation}$`; // Standard LaTeX delimiters
      })
      .replace(/\\[[[]([^\]]+)\\[\]]/g, (match, equation) => {
        return `$$${equation}$$`; // Display math delimiters
      })
      // Format numbered equations nicely
      .replace(/(\d+)\.\s*\*\*([^*]+):\*\*\s*\\[(]([^)]+)\\[)]/g, 
        '\n$1. $2:\n   $$$3$$\n')
      .replace(/(\d+)\.\s*\*\*([^*]+)\*\*\s*\\[(]([^)]+)\\[)]/g, 
        '\n$1. $2:\n   $$$3$$\n')
      // Remove markdown bold formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Convert remaining LaTeX delimiters
      .replace(/\\[(]/g, '$').replace(/\\[)]/g, '$')
      // Clean up extra spaces and formatting
      .replace(/\n\s*\n/g, '\n\n') // Remove excessive blank lines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .trim();
  }

  return (
    <div 
      ref={containerRef}
      className={`latex-content ${className}`}
      style={{ 
        fontFamily: 'Times New Roman, serif', 
        fontSize: '12pt', 
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap'
      }}
    >
      {renderError && (
        <div style={{ color: '#cc0000', fontSize: '10pt', fontStyle: 'italic' }}>
          LaTeX Error: {renderError}
        </div>
      )}
    </div>
  );
}
