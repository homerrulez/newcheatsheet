import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface EnhancedMathRendererProps {
  content: string;
  displayMode?: boolean;
  className?: string;
  renderType?: 'physics' | 'chemistry' | 'engineering' | 'mathematics' | 'auto';
}

export default function EnhancedMathRenderer({ 
  content, 
  displayMode = true, 
  className = "",
  renderType = 'auto'
}: EnhancedMathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      const renderTimeout = setTimeout(() => {
        if (!containerRef.current) return;
        
        // Enhanced mathematical content detection
        const isMathContent = detectMathContent(content, renderType);
        
        if (!isMathContent) {
          // Handle regular text content
          const formattedText = content
            .replace(/\n/g, '<br>')
            .replace(/  /g, '&nbsp;&nbsp;')
            .trim();
          
          containerRef.current.innerHTML = `<span style="font-family: inherit; font-size: inherit; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${formattedText}</span>`;
          return;
        }
        
        // Process mathematical content
        let mathContent = preprocessMathContent(content, renderType);
        
        try {
          containerRef.current.innerHTML = '';
          setRenderError(null);
          
          // Render with KaTeX
          katex.render(mathContent, containerRef.current, {
            displayMode,
            throwOnError: false,
            errorColor: '#cc0000',
            macros: {
              // Physics macros
              "\\vec": "\\mathbf{#1}",
              "\\div": "\\text{div}",
              "\\curl": "\\text{curl}",
              "\\grad": "\\nabla",
              
              // Chemistry macros
              "\\chem": "\\text{#1}",
              "\\reaction": "\\ce{#1}",
              
              // Engineering macros
              "\\stress": "\\sigma",
              "\\strain": "\\varepsilon",
              "\\force": "\\mathbf{F}",
              "\\moment": "\\mathbf{M}",
              
              // Mathematical macros
              "\\abs": "|#1|",
              "\\norm": "\\|#1\\|",
              "\\set": "\\{#1\\}",
              "\\seq": "(#1)",
              "\\mat": "\\begin{pmatrix} #1 \\end{pmatrix}"
            }
          });
        } catch (error) {
          console.error('Math rendering error:', error);
          setRenderError(error instanceof Error ? error.message : 'Rendering failed');
          containerRef.current.innerHTML = `<span style="color: #cc0000; font-family: monospace;">${mathContent}</span>`;
        }
      }, 100);
      
      return () => clearTimeout(renderTimeout);
    }
  }, [content, displayMode, renderType]);

  return (
    <div className={className}>
      <div ref={containerRef} />
      {renderError && (
        <div style={{ 
          color: '#cc0000', 
          fontSize: '0.8em', 
          fontStyle: 'italic',
          marginTop: '4px'
        }}>
          Rendering error: {renderError}
        </div>
      )}
    </div>
  );
}

// Enhanced mathematical content detection
function detectMathContent(content: string, renderType: string): boolean {
  const physicsPatterns = [
    /\\vec/, /\\nabla/, /\\mathbf/, /\\frac/, /\\partial/, /\\int/, /\\sum/, /\\prod/,
    /\\alpha/, /\\beta/, /\\gamma/, /\\delta/, /\\epsilon/, /\\zeta/, /\\eta/,
    /\\theta/, /\\iota/, /\\kappa/, /\\lambda/, /\\mu/, /\\nu/, /\\xi/, /\\pi/,
    /\\rho/, /\\sigma/, /\\tau/, /\\upsilon/, /\\phi/, /\\chi/, /\\psi/, /\\omega/
  ];
  
  const chemistryPatterns = [
    /[A-Z][a-z]?_\d+/, /\\rightarrow/, /\\leftarrow/, /\\ce{/, /\\chem{/,
    /H_2O/, /CO_2/, /CH_4/, /NH_3/, /H_2SO_4/, /NaOH/, /HCl/
  ];
  
  const engineeringPatterns = [
    /\\sigma/, /\\tau/, /\\epsilon/, /\\varepsilon/, /\\force/, /\\moment/,
    /\\stress/, /\\strain/, /\\modulus/, /\\poisson/, /\\shear/
  ];
  
  const mathPatterns = [
    /\\int/, /\\sum/, /\\prod/, /\\lim/, /\\inf/, /\\sup/, /\\max/, /\\min/,
    /\\sin/, /\\cos/, /\\tan/, /\\log/, /\\ln/, /\\exp/, /\\sqrt/, /\\abs/,
    /\\norm/, /\\set/, /\\seq/, /\\mat/, /\\det/, /\\tr/, /\\rank/
  ];
  
  const basicPatterns = [/\\/, /=/, /\^/, /_/, /frac/, /infty/, /pm/, /mp/];
  
  let patterns: RegExp[] = [];
  
  switch (renderType) {
    case 'physics':
      patterns = [...physicsPatterns, ...basicPatterns];
      break;
    case 'chemistry':
      patterns = [...chemistryPatterns, ...basicPatterns];
      break;
    case 'engineering':
      patterns = [...engineeringPatterns, ...basicPatterns];
      break;
    case 'mathematics':
      patterns = [...mathPatterns, ...basicPatterns];
      break;
    case 'auto':
    default:
      patterns = [...physicsPatterns, ...chemistryPatterns, ...engineeringPatterns, ...mathPatterns, ...basicPatterns];
      break;
  }
  
  return patterns.some(pattern => pattern.test(content)) || 
         content.match(/[∫∑∏∇αβγδεζηθικλμνξοπρστυφχψω]/);
}

// Enhanced mathematical content preprocessing
function preprocessMathContent(content: string, renderType: string): string {
  let mathContent = content.trim();
  
  // Remove surrounding delimiters
  mathContent = mathContent.replace(/^\$+|\$+$/g, '');
  mathContent = mathContent.replace(/^\\\[|\\\]$/g, '');
  mathContent = mathContent.replace(/^\\\(|\\\)$/g, '');
  
  // Remove trailing backslashes
  mathContent = mathContent.replace(/\\+$/, '');
  mathContent = mathContent.replace(/\\\s*$/, '');
  
  // Physics notation preprocessing
  if (renderType === 'physics' || renderType === 'auto') {
    mathContent = mathContent.replace(/\\vec\{([^}]*)\}/g, '\\mathbf{$1}');
    mathContent = mathContent.replace(/\\nabla\s*\\cdot/g, '\\text{div}');
    mathContent = mathContent.replace(/\\nabla\s*\\times/g, '\\text{curl}');
    mathContent = mathContent.replace(/\\mathbf\{([^}]*)\}/g, '\\mathbf{$1}');
  }
  
  // Chemistry notation preprocessing
  if (renderType === 'chemistry' || renderType === 'auto') {
    mathContent = mathContent.replace(/([A-Z][a-z]?)_(\d+)/g, '$1_{$2}');
    mathContent = mathContent.replace(/\\rightarrow/g, '\\to');
    mathContent = mathContent.replace(/\\leftarrow/g, '\\gets');
    mathContent = mathContent.replace(/\\ce\{([^}]*)\}/g, '\\text{$1}');
  }
  
  // Engineering notation preprocessing
  if (renderType === 'engineering' || renderType === 'auto') {
    mathContent = mathContent.replace(/\\stress\{([^}]*)\}/g, '\\sigma_{$1}');
    mathContent = mathContent.replace(/\\strain\{([^}]*)\}/g, '\\varepsilon_{$1}');
    mathContent = mathContent.replace(/\\force\{([^}]*)\}/g, '\\mathbf{F}_{$1}');
    mathContent = mathContent.replace(/\\moment\{([^}]*)\}/g, '\\mathbf{M}_{$1}');
  }
  
  // Mathematical notation preprocessing
  if (renderType === 'mathematics' || renderType === 'auto') {
    mathContent = mathContent.replace(/\\abs\{([^}]*)\}/g, '|$1|');
    mathContent = mathContent.replace(/\\norm\{([^}]*)\}/g, '\\|$1\\|');
    mathContent = mathContent.replace(/\\set\{([^}]*)\}/g, '\\{$1\\}');
    mathContent = mathContent.replace(/\\seq\{([^}]*)\}/g, '($1)');
  }
  
  // Clean up problematic commands
  mathContent = mathContent.replace(/\\text\{[^}]*\}/g, '');
  mathContent = mathContent.replace(/\\mathrm\{[^}]*\}/g, '');
  mathContent = mathContent.replace(/\\textup\{[^}]*\}/g, '');
  mathContent = mathContent.replace(/\([^)]*Units[^)]*\)/g, '');
  
  // Remove unit annotations
  mathContent = mathContent.replace(/\s*,\s*\([^)]*\)/g, '');
  mathContent = mathContent.replace(/\s*\\\,\s*\([^)]*\)/g, '');
  mathContent = mathContent.replace(/\s*\\,\s*\([^)]*\)/g, '');
  mathContent = mathContent.replace(/\s*\([^)]*\)\s*$/g, '');
  
  // Fix common notation issues
  mathContent = mathContent.replace(/\\Phi/g, '\\phi');
  mathContent = mathContent.replace(/\\_/g, '_');
  mathContent = mathContent.replace(/\\left\(/g, '(');
  mathContent = mathContent.replace(/\\right\)/g, ')');
  mathContent = mathContent.replace(/\\left\[/g, '[');
  mathContent = mathContent.replace(/\\right\]/g, ']');
  mathContent = mathContent.replace(/\\left\{/g, '\\{');
  mathContent = mathContent.replace(/\\right\}/g, '\\}');
  
  // Clean up extra spaces
  mathContent = mathContent.replace(/\s+/g, ' ').trim();
  
  return mathContent;
} 