import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { FileText, Grid3X3, FileSpreadsheet, Play, Check } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f3e5f5 50%, #e8f5e8 100%)' }}>
      {/* Header */}
      <header className="px-8 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>  
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Math Company</h1>
          </div>
          <div className="flex items-center space-x-6">
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900 font-medium">
              Log in
            </Button>
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900 font-medium">
              Register
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-20">
          <h2 className="text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Welcome
          </h2>
          <p className="text-2xl text-gray-700 mb-16">
            Choose an option to get started.
          </p>
        </div>

        {/* Workspace Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Template Workspace */}
          <Link href="/template">
            <div className="bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet className="text-white text-3xl" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Template</h3>
              <p className="text-lg text-gray-700 mb-4 text-center">Smart Templates Powered by AI</p>
              
              {/* Video Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <Play className="text-white text-lg ml-1" />
                </div>
              </div>

              {/* Feature List */}
              <div className="bg-white/60 rounded-xl p-4 space-y-3">
                <p className="text-sm text-gray-600 text-center mb-3">Use pre-designed templates with structured layouts perfect for academic reference sheets.</p>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  8.5x11 print layout
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Fixed structure
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Professional design
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Ready to print
                </div>
              </div>
            </div>
          </Link>

          {/* Cheat Sheet Workspace */}
          <Link href="/cheatsheet">
            <div className="bg-gradient-to-br from-purple-100 to-pink-50 border-2 border-purple-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center">
                  <Grid3X3 className="text-white text-3xl" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Cheatsheet</h3>
              <p className="text-lg text-gray-700 mb-4 text-center">Cheat Sheets Powered by AI</p>
              
              {/* Video Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <Play className="text-white text-lg ml-1" />
                </div>
              </div>

              {/* Feature List */}
              <div className="bg-white/60 rounded-xl p-4 space-y-3">
                <p className="text-sm text-gray-600 text-center mb-3">Generate organized cheat sheets with auto-resizing content boxes and intelligent formatting.</p>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Auto-sizing boxes
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Formula organization
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Sheet history
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Export ready
                </div>
              </div>
            </div>
          </Link>

          {/* Document Workspace */}
          <Link href="/document">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-50 border-2 border-blue-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center">
                  <FileText className="text-white text-3xl" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Document</h3>
              <p className="text-lg text-gray-700 mb-4 text-center">Smart Documents Powered by AI</p>
              
              {/* Video Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <Play className="text-white text-lg ml-1" />
                </div>
              </div>

              {/* Feature List */}
              <div className="bg-white/60 rounded-xl p-4 space-y-3">
                <p className="text-sm text-gray-600 text-center mb-3">Create and edit documents with AI-powered assistance and beautiful LaTeX rendering for mathematical content.</p>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Rich text editing
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  LaTeX math support
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Document history
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  AI auto-formatting
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Video Showcase Section */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-green-200 via-purple-200 to-blue-200 rounded-3xl p-8 shadow-lg">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <Play className="text-white text-3xl ml-1" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}