/**
 * Document Command Interface
 * 
 * Provides a high-level command interface that integrates with the layout engine
 * for automatic pagination and content management.
 */

import { LayoutEngine, LayoutResult, ContentPage } from './layout-engine';

export interface DocumentState {
  content: string;
  pages: ContentPage[];
  currentPage: number;
  layoutEngine: LayoutEngine;
  metrics: any;
}

export interface CommandResult {
  success: boolean;
  message: string;
  newState?: Partial<DocumentState>;
  previewMode?: boolean;
}

export class DocumentCommandInterface {
  private state: DocumentState;

  constructor(
    initialContent: string = '',
    pageSize: string = 'letter',
    fontSize: number = 12
  ) {
    const layoutEngine = new LayoutEngine(pageSize, fontSize);
    const layout = layoutEngine.LAYOUT_TEXT(initialContent);
    
    this.state = {
      content: initialContent,
      pages: layout.pages,
      currentPage: 1,
      layoutEngine,
      metrics: layout.metrics
    };
  }

  /**
   * Get current document state
   */
  getState(): DocumentState {
    return { ...this.state };
  }

  /**
   * Execute a command with automatic layout management
   */
  executeCommand(command: string, args: any[] = []): CommandResult {
    const cmd = command.toUpperCase();
    
    try {
      switch (cmd) {
        case 'ADD_TEXT':
          return this.addText(args[0], args[1]);
        
        case 'INSERT_PAGE':
          return this.insertPage(args[0]);
        
        case 'DELETE_PAGE':
          return this.deletePage(args[0]);
        
        case 'SET_FONT_SIZE':
          return this.setFontSize(args[0]);
        
        case 'SET_PAGE_SIZE':
          return this.setPageSize(args[0]);
        
        case 'LAYOUT_TEXT':
          return this.layoutText(args[0]);
        
        case 'PREVIEW_LAYOUT':
          return this.previewLayout(args[0]);
        
        case 'REFLOW_CONTENT':
          return this.reflowContent(args[0], args[1]);
        
        case 'GO_TO_PAGE':
          return this.goToPage(args[0]);
        
        case 'GET_PAGE_COUNT':
          return this.getPageCount();
        
        case 'GET_METRICS':
          return this.getMetrics();
        
        case 'CLEAR_CONTENT':
          return this.clearContent();
        
        case 'REPLACE_TEXT':
          return this.replaceText(args[0], args[1]);
        
        case 'FIND_TEXT':
          return this.findText(args[0]);
        
        default:
          return {
            success: false,
            message: `Unknown command: ${command}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing command ${command}: ${error.message}`
      };
    }
  }

  /**
   * Add text with automatic pagination
   */
  private addText(text: string, pageNumber?: number): CommandResult {
    if (!text) {
      return { success: false, message: 'No text provided' };
    }

    let newContent: string;
    
    if (pageNumber && pageNumber <= this.state.pages.length) {
      // Insert text at specific page
      const targetPage = this.state.pages[pageNumber - 1];
      const beforeContent = this.state.pages.slice(0, pageNumber - 1).map(p => p.content).join('\n\n');
      const afterContent = this.state.pages.slice(pageNumber).map(p => p.content).join('\n\n');
      
      newContent = [beforeContent, targetPage.content + text, afterContent]
        .filter(part => part.trim())
        .join('\n\n');
    } else {
      // Append to end
      newContent = this.state.content + (this.state.content ? '\n\n' : '') + text;
    }

    const layout = this.state.layoutEngine.LAYOUT_TEXT(newContent);
    
    this.state = {
      ...this.state,
      content: newContent,
      pages: layout.pages,
      metrics: layout.metrics
    };

    return {
      success: true,
      message: `Text added. Document now has ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Insert a new page at specified position
   */
  private insertPage(afterPageNumber: number = this.state.pages.length): CommandResult {
    if (afterPageNumber < 0 || afterPageNumber > this.state.pages.length) {
      return {
        success: false,
        message: `Invalid page number. Document has ${this.state.pages.length} pages.`
      };
    }

    const updatedPages = this.state.layoutEngine.INSERT_PAGE_BREAK(this.state.pages, afterPageNumber);
    
    this.state = {
      ...this.state,
      pages: updatedPages
    };

    return {
      success: true,
      message: `Page inserted after page ${afterPageNumber}. Document now has ${updatedPages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Delete a specific page and reflow content
   */
  private deletePage(pageNumber: number): CommandResult {
    if (pageNumber < 1 || pageNumber > this.state.pages.length) {
      return {
        success: false,
        message: `Invalid page number. Document has ${this.state.pages.length} pages.`
      };
    }

    if (this.state.pages.length === 1) {
      return {
        success: false,
        message: 'Cannot delete the only page in the document.'
      };
    }

    // Remove the page and rebuild content
    const remainingPages = this.state.pages.filter(page => page.pageNumber !== pageNumber);
    const newContent = remainingPages.map(page => page.content).join('\n\n');
    
    const layout = this.state.layoutEngine.LAYOUT_TEXT(newContent);
    
    this.state = {
      ...this.state,
      content: newContent,
      pages: layout.pages,
      metrics: layout.metrics,
      currentPage: Math.min(this.state.currentPage, layout.pages.length)
    };

    return {
      success: true,
      message: `Page ${pageNumber} deleted. Document now has ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Change font size and reflow content
   */
  private setFontSize(fontSize: number): CommandResult {
    if (fontSize < 6 || fontSize > 72) {
      return {
        success: false,
        message: 'Font size must be between 6 and 72 points.'
      };
    }

    const layout = this.state.layoutEngine.REFLOW_CONTENT(this.state.content, undefined, fontSize);
    
    this.state = {
      ...this.state,
      pages: layout.pages,
      metrics: layout.metrics
    };

    return {
      success: true,
      message: `Font size changed to ${fontSize}pt. Document reflowed to ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Change page size and reflow content
   */
  private setPageSize(pageSize: string): CommandResult {
    const layout = this.state.layoutEngine.REFLOW_CONTENT(this.state.content, pageSize);
    
    if (layout.pages.length === 0) {
      return {
        success: false,
        message: `Invalid page size: ${pageSize}`
      };
    }

    this.state = {
      ...this.state,
      pages: layout.pages,
      metrics: layout.metrics
    };

    return {
      success: true,
      message: `Page size changed to ${pageSize}. Document reflowed to ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Layout text with automatic pagination
   */
  private layoutText(content: string): CommandResult {
    const layout = this.state.layoutEngine.LAYOUT_TEXT(content);
    
    this.state = {
      ...this.state,
      content,
      pages: layout.pages,
      metrics: layout.metrics
    };

    return {
      success: true,
      message: `Content laid out across ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Preview layout without applying changes
   */
  private previewLayout(content: string): CommandResult {
    const preview = this.state.layoutEngine.PREVIEW_LAYOUT(content);
    
    return {
      success: true,
      message: `Preview: Content would span approximately ${preview.estimatedPages} pages.`,
      previewMode: true,
      newState: {
        metrics: preview.metrics
      }
    };
  }

  /**
   * Reflow content with new settings
   */
  private reflowContent(pageSize?: string, fontSize?: number): CommandResult {
    const layout = this.state.layoutEngine.REFLOW_CONTENT(this.state.content, pageSize, fontSize);
    
    this.state = {
      ...this.state,
      pages: layout.pages,
      metrics: layout.metrics
    };

    const changes = [];
    if (pageSize) changes.push(`page size: ${pageSize}`);
    if (fontSize) changes.push(`font size: ${fontSize}pt`);
    
    return {
      success: true,
      message: `Content reflowed with ${changes.join(', ')}. Document now has ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Navigate to specific page
   */
  private goToPage(pageNumber: number): CommandResult {
    if (pageNumber < 1 || pageNumber > this.state.pages.length) {
      return {
        success: false,
        message: `Invalid page number. Document has ${this.state.pages.length} pages.`
      };
    }

    this.state = {
      ...this.state,
      currentPage: pageNumber
    };

    return {
      success: true,
      message: `Navigated to page ${pageNumber}.`,
      newState: this.state
    };
  }

  /**
   * Get total page count
   */
  private getPageCount(): CommandResult {
    return {
      success: true,
      message: `Document has ${this.state.pages.length} pages.`
    };
  }

  /**
   * Get current metrics
   */
  private getMetrics(): CommandResult {
    const metrics = this.state.layoutEngine.getCurrentMetrics();
    
    return {
      success: true,
      message: `Metrics: ${metrics.charactersPerLine} chars/line, ${metrics.linesPerPage} lines/page, ${metrics.wordsPerLine} words/line, ${metrics.totalCapacity} total capacity.`
    };
  }

  /**
   * Clear all content
   */
  private clearContent(): CommandResult {
    const layout = this.state.layoutEngine.LAYOUT_TEXT('');
    
    this.state = {
      ...this.state,
      content: '',
      pages: layout.pages.length > 0 ? layout.pages : [{
        pageNumber: 1,
        content: '',
        wordCount: 0,
        characterCount: 0,
        isFull: false
      }],
      currentPage: 1,
      metrics: layout.metrics
    };

    return {
      success: true,
      message: 'Document content cleared.',
      newState: this.state
    };
  }

  /**
   * Replace text throughout document
   */
  private replaceText(searchText: string, replaceText: string): CommandResult {
    if (!searchText) {
      return { success: false, message: 'No search text provided.' };
    }

    const newContent = this.state.content.replace(new RegExp(searchText, 'g'), replaceText);
    const layout = this.state.layoutEngine.LAYOUT_TEXT(newContent);
    
    this.state = {
      ...this.state,
      content: newContent,
      pages: layout.pages,
      metrics: layout.metrics
    };

    return {
      success: true,
      message: `Text replaced. Document now has ${layout.pages.length} pages.`,
      newState: this.state
    };
  }

  /**
   * Find text and return page locations
   */
  private findText(searchText: string): CommandResult {
    if (!searchText) {
      return { success: false, message: 'No search text provided.' };
    }

    const results: { page: number; position: number }[] = [];
    
    this.state.pages.forEach((page, index) => {
      let position = page.content.indexOf(searchText);
      while (position !== -1) {
        results.push({ page: index + 1, position });
        position = page.content.indexOf(searchText, position + 1);
      }
    });

    if (results.length === 0) {
      return {
        success: true,
        message: `Text "${searchText}" not found in document.`
      };
    }

    return {
      success: true,
      message: `Found "${searchText}" in ${results.length} locations: ${results.map(r => `Page ${r.page}`).join(', ')}.`
    };
  }
}

// Export utility functions
export const createDocumentInterface = (content?: string, pageSize?: string, fontSize?: number) => {
  return new DocumentCommandInterface(content, pageSize, fontSize);
};

export const executeDocumentCommand = (
  docInterface: DocumentCommandInterface,
  command: string,
  ...args: any[]
): CommandResult => {
  return docInterface.executeCommand(command, args);
};