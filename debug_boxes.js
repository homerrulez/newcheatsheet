// Script to analyze LaTeX content and identify problematic boxes
const problematicPatterns = [
  /\\frac\{.*?\}\{.*?\}/g,  // Fraction patterns
  /\\nabla\s*\\cdot/g,      // Vector calculus
  /\\nabla\s*\\times/g,     // Curl operator
  /\\mathbf\{.*?\}/g,       // Bold vectors
  /\\text\{.*?\}/g,         // Text commands
  /\\mathrm\{.*?\}/g,       // Roman text
  /\\left[^\\]*\\right/g,   // Left-right delimiters
  /\\vec\{.*?\}/g,          // Vector notation
];

const analyzeContent = (content) => {
  const issues = [];
  
  problematicPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      const patternNames = [
        'Fractions',
        'Divergence operator', 
        'Curl operator',
        'Bold vectors',
        'Text commands',
        'Roman text',
        'Left-right delimiters',
        'Vector notation'
      ];
      issues.push({
        pattern: patternNames[index],
        matches: matches,
        count: matches.length
      });
    }
  });
  
  return issues;
};

// This would be used to analyze the boxes
console.log('Box content analyzer ready');