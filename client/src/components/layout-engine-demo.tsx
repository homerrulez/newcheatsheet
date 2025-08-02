/**
 * Layout Engine Demo Component
 * 
 * Demonstrates the advanced layout engine capabilities including:
 * - Automatic pagination based on content
 * - Dynamic font scaling when page size changes
 * - Content reflow capabilities
 * - Preview mode functionality
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { LayoutEngine, createLayoutEngine, PAGE_CONFIGS } from '@/lib/layout-engine';
import { DocumentCommandInterface, createDocumentInterface } from '@/lib/document-commands';
import { 
  FileText, Play, Eye, RotateCcw, Zap, 
  Layout, Type, Clock, Layers 
} from 'lucide-react';

export default function LayoutEngineDemo() {
  const [pageSize, setPageSize] = useState('letter');
  const [fontSize, setFontSize] = useState(12);
  const [inputContent, setInputContent] = useState(`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.`);

  const [layoutEngine] = useState(() => createLayoutEngine(pageSize, fontSize));
  const [documentInterface] = useState(() => createDocumentInterface(inputContent, pageSize, fontSize));
  const [layoutResult, setLayoutResult] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Demo functions
  const runLayoutDemo = () => {
    const engine = createLayoutEngine(pageSize, fontSize);
    const result = engine.LAYOUT_TEXT(inputContent);
    setLayoutResult(result);
    setMetrics(result.metrics);
  };

  const runPreviewDemo = () => {
    const engine = createLayoutEngine(pageSize, fontSize);
    const preview = engine.PREVIEW_LAYOUT(inputContent);
    setPreviewResult(preview);
  };

  const runReflowDemo = () => {
    const engine = createLayoutEngine('letter', 12); // Start with letter size
    const result = engine.REFLOW_CONTENT(inputContent, pageSize, fontSize);
    setLayoutResult(result);
    setMetrics(result.metrics);
  };

  const runCommandDemo = () => {
    const docInterface = createDocumentInterface(inputContent, pageSize, fontSize);
    
    // Demonstrate command execution
    const commands = [
      ['LAYOUT_TEXT', inputContent],
      ['SET_FONT_SIZE', fontSize],
      ['SET_PAGE_SIZE', pageSize],
      ['GET_METRICS'],
      ['PREVIEW_LAYOUT', inputContent + '\n\nAdditional content for preview...']
    ];

    let result;
    commands.forEach(([command, ...args]) => {
      result = docInterface.executeCommand(command, args);
      console.log(`${command}:`, result);
    });

    const finalState = docInterface.getState();
    setLayoutResult(finalState.layoutEngine.LAYOUT_TEXT(finalState.content));
    setMetrics(finalState.metrics);
  };

  // Auto-run layout when settings change
  useEffect(() => {
    runLayoutDemo();
  }, [pageSize, fontSize, inputContent]);

  const currentPageConfig = PAGE_CONFIGS[pageSize];
  const scaledFontSize = fontSize * (currentPageConfig.width / PAGE_CONFIGS.letter.width);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Layout Engine Demonstration
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Advanced automatic pagination and content flow management
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layout className="w-5 h-5 mr-2" />
            Layout Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Page Size
              </label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGE_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Font Size
              </label>
              <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}pt</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Auto-scaled Font
              </label>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                {Math.round(scaledFontSize)}pt
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Page Dimensions
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {currentPageConfig.width} × {currentPageConfig.height}px
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Content to Layout
            </label>
            <Textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="Enter content to demonstrate automatic pagination..."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={runLayoutDemo} className="flex items-center">
              <Play className="w-4 h-4 mr-2" />
              Run Layout
            </Button>
            <Button onClick={runPreviewDemo} variant="outline" className="flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Preview Only
            </Button>
            <Button onClick={runReflowDemo} variant="outline" className="flex items-center">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reflow Content
            </Button>
            <Button onClick={runCommandDemo} variant="outline" className="flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Command Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metrics Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Type className="w-5 h-5 mr-2" />
              Page Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Characters/Line:</span>
                    <Badge variant="secondary">{metrics.charactersPerLine}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Lines/Page:</span>
                    <Badge variant="secondary">{metrics.linesPerPage}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Words/Line:</span>
                    <Badge variant="secondary">{metrics.wordsPerLine}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Capacity:</span>
                    <Badge variant="secondary">{metrics.totalCapacity}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Run layout to see metrics
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preview Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Preview Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Pages:</span>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {previewResult.estimatedPages}
                  </Badge>
                </div>
                <Separator />
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Characters per line: {previewResult.metrics.charactersPerLine}</div>
                  <div>Lines per page: {previewResult.metrics.linesPerPage}</div>
                  <div>Total capacity: {previewResult.metrics.totalCapacity}</div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Click "Preview Only" to see estimation
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Layout Results */}
      {layoutResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Layers className="w-5 h-5 mr-2" />
                Layout Results
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {layoutResult.totalPages} Pages
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {layoutResult.pages.map((page, index) => (
                <Card key={index} className="bg-gray-50 dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Page {page.pageNumber}
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {page.wordCount} words
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {page.characterCount} chars
                        </Badge>
                        {page.isFull && (
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                            Full
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-white dark:bg-gray-900 p-3 rounded border max-h-32 overflow-y-auto">
                      {page.content.substring(0, 200)}
                      {page.content.length > 200 && '...'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Layout Engine Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Automatic Pagination</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Splits content into pages based on font size, page dimensions, and available space.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Smart Font Scaling</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically adjusts font size when page size changes to maintain readability.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Content Reflow</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dynamically reflows content when layout parameters change.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Preview Mode</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimates page count without actually creating pages for performance.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Command Interface</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                High-level commands for document manipulation and layout management.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">Multiple Page Sizes</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Supports 7 different page sizes with accurate inch-based measurements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}