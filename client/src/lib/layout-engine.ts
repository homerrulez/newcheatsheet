/**
 * Advanced Layout Engine for Document Pagination
 * 
 * This engine sits between the command interface and visual rendering system,
 * providing automatic pagination, content flow, and dynamic scaling capabilities.
 */

// Page configuration types
export interface PageConfig {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  name: string;
}

// Content measurement types
export interface ContentMetrics {
  charactersPerLine: number;
  linesPerPage: number;
  wordsPerLine: number;
  totalCapacity: number;
}

// Layout result types
export interface LayoutResult {
  pages: ContentPage[];
  totalPages: number;
  overflow: boolean;
  metrics: ContentMetrics;
}

export interface ContentPage {
  pageNumber: number;
  content: string;
  wordCount: number;
  characterCount: number;
  isFull: boolean;
}

// Font scaling configuration
export interface FontScaling {
  baseFontSize: number;
  basePageSize: { width: number; height: number };
  currentFontSize: number;
  scalingRatio: number;
}

// Page size configurations (in pixels at 96 DPI)
export const PAGE_CONFIGS: Record<string, PageConfig> = {
  'letter': {
    width: 816,
    height: 1056,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'Letter (8.5" × 11")'
  },
  'legal': {
    width: 816,
    height: 1344,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'Legal (8.5" × 14")'
  },
  'a4': {
    width: 794,
    height: 1123,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'A4 (8.27" × 11.69")'
  },
  'a3': {
    width: 1123,
    height: 1587,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'A3 (11.69" × 16.54")'
  },
  'tabloid': {
    width: 1056,
    height: 1632,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'Tabloid (11" × 17")'
  },
  'executive': {
    width: 696,
    height: 1008,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'Executive (7.25" × 10.5")'
  },
  'ledger': {
    width: 1632,
    height: 1056,
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    name: 'Ledger (17" × 11")'
  }
};

export class LayoutEngine {
  private pageConfig: PageConfig;
  private fontScaling: FontScaling;
  private lineHeight: number = 1.6;

  constructor(
    pageSize: string = 'letter',
    baseFontSize: number = 12,
    currentFontSize?: number
  ) {
    this.pageConfig = PAGE_CONFIGS[pageSize] || PAGE_CONFIGS.letter;
    this.fontScaling = {
      baseFontSize,
      basePageSize: { width: 816, height: 1056 }, // Letter size as default
      currentFontSize: currentFontSize || baseFontSize,
      scalingRatio: 1
    };
    this.calculateScalingRatio();
  }

  /**
   * Calculate font scaling ratio based on page size changes
   */
  private calculateScalingRatio(): void {
    const widthRatio = this.pageConfig.width / this.fontScaling.basePageSize.width;
    const heightRatio = this.pageConfig.height / this.fontScaling.basePageSize.height;
    
    // Use the smaller ratio to ensure content fits
    this.fontScaling.scalingRatio = Math.min(widthRatio, heightRatio);
    
    // Auto-scale font size if not explicitly set
    if (this.fontScaling.currentFontSize === this.fontScaling.baseFontSize) {
      this.fontScaling.currentFontSize = this.fontScaling.baseFontSize * this.fontScaling.scalingRatio;
    }
  }

  /**
   * Measure content capacity for current page configuration
   */
  measurePageCapacity(): ContentMetrics {
    const contentWidth = this.pageConfig.width - this.pageConfig.padding.left - this.pageConfig.padding.right;
    const contentHeight = this.pageConfig.height - this.pageConfig.padding.top - this.pageConfig.padding.bottom;
    
    // Calculate approximate character width (varies by font, using average)
    const avgCharWidth = this.fontScaling.currentFontSize * 0.6; // Approximation for most fonts
    const lineHeight = this.fontScaling.currentFontSize * this.lineHeight;
    
    const charactersPerLine = Math.floor(contentWidth / avgCharWidth);
    const linesPerPage = Math.floor(contentHeight / lineHeight);
    
    // Average words per line (assuming 5 characters per word + space)
    const wordsPerLine = Math.floor(charactersPerLine / 6);
    
    return {
      charactersPerLine,
      linesPerPage,
      wordsPerLine,
      totalCapacity: charactersPerLine * linesPerPage
    };
  }

  /**
   * Split text into words while preserving formatting
   */
  private splitIntoWords(text: string): string[] {
    // Handle HTML tags and preserve them
    const htmlTagRegex = /<[^>]*>/g;
    const tags: string[] = [];
    let tagIndex = 0;
    
    // Replace HTML tags with placeholders
    const textWithPlaceholders = text.replace(htmlTagRegex, (match) => {
      tags.push(match);
      return `__HTML_TAG_${tagIndex++}__`;
    });
    
    // Split into words
    const words = textWithPlaceholders.split(/(\s+)/);
    
    // Restore HTML tags
    return words.map(word => {
      return word.replace(/__HTML_TAG_(\d+)__/g, (match, index) => {
        return tags[parseInt(index)] || match;
      });
    });
  }

  /**
   * Main layout function that splits content into pages
   */
  LAYOUT_TEXT(content: string): LayoutResult {
    const metrics = this.measurePageCapacity();
    const words = this.splitIntoWords(content);
    const pages: ContentPage[] = [];
    
    let currentPage: ContentPage = {
      pageNumber: 1,
      content: '',
      wordCount: 0,
      characterCount: 0,
      isFull: false
    };
    
    let currentLineLength = 0;
    let currentPageLines = 0;
    
    for (const word of words) {
      // Skip empty words (but preserve single spaces)
      if (word === '') continue;
      
      const wordLength = word.replace(/<[^>]*>/g, '').length; // Count without HTML tags
      const isWhitespace = /^\s+$/.test(word);
      
      // Check if adding this word would exceed line length
      if (!isWhitespace && currentLineLength + wordLength > metrics.charactersPerLine) {
        // Start new line
        currentLineLength = 0;
        currentPageLines++;
        
        // Check if we need a new page
        if (currentPageLines >= metrics.linesPerPage) {
          currentPage.isFull = true;
          pages.push(currentPage);
          
          // Create new page
          currentPage = {
            pageNumber: pages.length + 1,
            content: '',
            wordCount: 0,
            characterCount: 0,
            isFull: false
          };
          currentPageLines = 0;
        } else {
          // Add line break to current page
          currentPage.content += '\n';
          currentPage.characterCount += 1;
        }
      }
      
      // Add word to current page
      currentPage.content += word;
      currentPage.characterCount += word.length;
      
      if (!isWhitespace) {
        currentPage.wordCount++;
        currentLineLength += wordLength;
      }
    }
    
    // Add the last page if it has content
    if (currentPage.content.trim()) {
      pages.push(currentPage);
    }
    
    return {
      pages,
      totalPages: pages.length,
      overflow: false, // Could be enhanced to detect overflow
      metrics
    };
  }

  /**
   * Preview layout without actually creating pages
   */
  PREVIEW_LAYOUT(content: string): { estimatedPages: number; metrics: ContentMetrics } {
    const metrics = this.measurePageCapacity();
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedPages = Math.ceil(wordCount / (metrics.wordsPerLine * metrics.linesPerPage));
    
    return {
      estimatedPages: Math.max(1, estimatedPages),
      metrics
    };
  }

  /**
   * Reflow content when page or font settings change
   */
  REFLOW_CONTENT(content: string, newPageSize?: string, newFontSize?: number): LayoutResult {
    if (newPageSize && PAGE_CONFIGS[newPageSize]) {
      this.pageConfig = PAGE_CONFIGS[newPageSize];
      this.calculateScalingRatio();
    }
    
    if (newFontSize) {
      this.fontScaling.currentFontSize = newFontSize;
    }
    
    return this.LAYOUT_TEXT(content);
  }

  /**
   * Get automatic font size based on page size
   */
  getScaledFontSize(): number {
    return Math.round(this.fontScaling.currentFontSize);
  }

  /**
   * Get current page configuration
   */
  getPageConfig(): PageConfig {
    return { ...this.pageConfig };
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ContentMetrics {
    return this.measurePageCapacity();
  }

  /**
   * Add content block-by-block to specific pages
   */
  ADD_TEXT_TO_PAGE(pageNumber: number, text: string, pages: ContentPage[]): ContentPage[] {
    if (pageNumber <= 0 || pageNumber > pages.length) {
      return pages;
    }
    
    const targetPage = pages[pageNumber - 1];
    const metrics = this.measurePageCapacity();
    
    // Check if page can accommodate more text
    if (targetPage.characterCount + text.length <= metrics.totalCapacity) {
      targetPage.content += text;
      targetPage.characterCount += text.length;
      targetPage.wordCount += text.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    return pages;
  }

  /**
   * Insert page break at specific position
   */
  INSERT_PAGE_BREAK(pages: ContentPage[], afterPageNumber: number): ContentPage[] {
    if (afterPageNumber <= 0 || afterPageNumber >= pages.length) {
      return pages;
    }
    
    // Create new empty page
    const newPage: ContentPage = {
      pageNumber: afterPageNumber + 1,
      content: '',
      wordCount: 0,
      characterCount: 0,
      isFull: false
    };
    
    // Insert the new page and renumber subsequent pages
    const updatedPages = [...pages];
    updatedPages.splice(afterPageNumber, 0, newPage);
    
    // Renumber pages
    updatedPages.forEach((page, index) => {
      page.pageNumber = index + 1;
    });
    
    return updatedPages;
  }

  /**
   * Set page style configurations
   */
  SET_PAGE_STYLE(
    pageSize?: string,
    fontSize?: number,
    lineHeight?: number,
    padding?: Partial<PageConfig['padding']>
  ): void {
    if (pageSize && PAGE_CONFIGS[pageSize]) {
      this.pageConfig = PAGE_CONFIGS[pageSize];
    }
    
    if (fontSize) {
      this.fontScaling.currentFontSize = fontSize;
    }
    
    if (lineHeight) {
      this.lineHeight = lineHeight;
    }
    
    if (padding) {
      this.pageConfig.padding = { ...this.pageConfig.padding, ...padding };
    }
    
    this.calculateScalingRatio();
  }
}

// Export utility functions
export const createLayoutEngine = (pageSize?: string, fontSize?: number) => {
  return new LayoutEngine(pageSize, fontSize);
};

export const calculateOptimalFontSize = (
  targetPageSize: string,
  basePageSize: string = 'letter',
  baseFontSize: number = 12
): number => {
  const targetConfig = PAGE_CONFIGS[targetPageSize];
  const baseConfig = PAGE_CONFIGS[basePageSize];
  
  if (!targetConfig || !baseConfig) return baseFontSize;
  
  const widthRatio = targetConfig.width / baseConfig.width;
  const heightRatio = targetConfig.height / baseConfig.height;
  const scalingRatio = Math.min(widthRatio, heightRatio);
  
  return Math.round(baseFontSize * scalingRatio);
};