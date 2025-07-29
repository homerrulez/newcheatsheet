import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { FileText, Grid3X3, FileSpreadsheet, CheckCircle, Bot, Calculator, Smartphone } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="text-white text-lg" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">StudyFlow</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </Button>
            <Button variant="ghost" size="sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Your Academic <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Powerhouse</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Transform your study sessions with AI-powered document editing, dynamic cheat sheets, and beautiful LaTeX formatting. Everything you need for academic excellence.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
            <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />LaTeX Support</span>
            <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />AI Integration</span>
            <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Auto-formatting</span>
          </div>
        </div>

        {/* Workspace Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Smart Documents */}
          <Link href="/document">
            <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300 hover-lift">
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 workspace-card-document rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileText className="text-white text-3xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Smart Documents</h3>
                  <p className="text-slate-600 mb-6">Create and edit documents with AI-powered assistance and beautiful LaTeX rendering for mathematical content.</p>
                  <ul className="text-sm text-slate-500 space-y-2 text-left">
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Rich text editing</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />LaTeX math support</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Document history</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />AI auto-formatting</li>
                  </ul>
                </div>
                <div className="px-8 pb-8">
                  <Button className="w-full workspace-card-document text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                    Start Writing
                  </Button>
                </div>
              </div>
            </div>
          </Link>

          {/* Dynamic Cheat Sheets */}
          <Link href="/cheatsheet">
            <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300 hover-lift">
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 workspace-card-cheatsheet rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Grid3X3 className="text-white text-3xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Dynamic Cheat Sheets</h3>
                  <p className="text-slate-600 mb-6">Generate organized cheat sheets with auto-resizing content boxes and intelligent formatting.</p>
                  <ul className="text-sm text-slate-500 space-y-2 text-left">
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Auto-sizing boxes</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Formula organization</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Sheet history</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Export ready</li>
                  </ul>
                </div>
                <div className="px-8 pb-8">
                  <Button className="w-full workspace-card-cheatsheet text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                    Create Sheet
                  </Button>
                </div>
              </div>
            </div>
          </Link>

          {/* Template Sheets */}
          <Link href="/template">
            <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300 hover-lift">
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 workspace-card-template rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileSpreadsheet className="text-white text-3xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Template Sheets</h3>
                  <p className="text-slate-600 mb-6">Use pre-designed templates with structured layouts perfect for academic reference sheets.</p>
                  <ul className="text-sm text-slate-500 space-y-2 text-left">
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />8.5x11 print layout</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Fixed structure</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Professional design</li>
                    <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Ready to print</li>
                  </ul>
                </div>
                <div className="px-8 pb-8">
                  <Button className="w-full workspace-card-template text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-12">Powered by Modern Technology</h3>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Bot className="text-blue-600 text-2xl" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">AI Integration</h4>
              <p className="text-sm text-slate-600">ChatGPT powered assistance</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Calculator className="text-purple-600 text-2xl" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">LaTeX Support</h4>
              <p className="text-sm text-slate-600">Beautiful mathematical notation</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="text-green-600 text-2xl w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Auto-Sizing</h4>
              <p className="text-sm text-slate-600">Dynamic content adjustment</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Smartphone className="text-orange-600 text-2xl" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Responsive</h4>
              <p className="text-sm text-slate-600">Works on any device</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
