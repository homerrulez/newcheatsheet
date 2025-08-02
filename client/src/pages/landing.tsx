import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Grid3X3, FileSpreadsheet, Play, Check, X, BookOpen, Calculator, PenTool, Layout, Brain } from 'lucide-react';
import { useState } from 'react';

export default function Landing() {
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; type: string; title: string }>({
    isOpen: false,
    type: '',
    title: ''
  });

  const openVideoModal = (type: string, title: string) => {
    setVideoModal({ isOpen: true, type, title });
  };

  const closeVideoModal = () => {
    setVideoModal({ isOpen: false, type: '', title: '' });
  };
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Frosted overlay with floating math symbols */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-blue-400/5 to-purple-600/10 backdrop-blur-[1px] z-0">
        {/* Floating math symbols - more visible */}
        <div className="absolute top-[40%] left-[5%] text-3xl text-white/25 font-light select-none animate-float-right">∫</div>
        <div className="absolute top-[60%] right-[8%] text-2xl text-white/20 font-light select-none animate-float-left">π</div>
        <div className="absolute top-[75%] left-[20%] text-3xl text-white/25 font-light select-none animate-float-right">√</div>
        <div className="absolute top-[30%] left-[85%] text-2xl text-white/20 font-light select-none animate-float-left">λ</div>
        <div className="absolute top-[85%] right-[30%] text-3xl text-white/25 font-light select-none animate-float-up">∞</div>
        <div className="absolute top-[25%] right-[10%] text-2xl text-white/20 font-light select-none animate-float-left">∇</div>
        <div className="absolute top-[90%] left-[70%] text-3xl text-white/25 font-light select-none animate-float-up">θ</div>
        <div className="absolute top-[35%] left-[3%] text-2xl text-white/20 font-light select-none animate-float-right">α</div>
        <div className="absolute top-[45%] right-[25%] text-2xl text-white/20 font-light select-none animate-float-up">Σ</div>
        <div className="absolute top-[20%] left-[40%] text-3xl text-white/25 font-light select-none animate-float-right">∂</div>
        <div className="absolute top-[80%] left-[45%] text-2xl text-white/20 font-light select-none animate-float-left">Ω</div>
        <div className="absolute top-[15%] right-[60%] text-2xl text-white/20 font-light select-none animate-float-up">φ</div>
      </div>
      {/* Header */}
      <header className="relative z-10 px-8 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="/src/assets/studyflow-logo-new.svg" 
                alt="StudyFlow" 
                className="w-10 h-10"
              />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>StudyFlow</h1>
          </div>
          <div className="flex items-center space-x-6">
            <Button variant="ghost" className="text-white/90 hover:text-white font-medium hover:bg-white/10 transition-all duration-300">
              Log in
            </Button>
            <Button variant="ghost" className="text-white/90 hover:text-white font-medium hover:bg-white/10 transition-all duration-300">
              Register
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-20">
          <h1 className="text-8xl font-normal text-white mb-6 leading-tight tracking-wide" style={{ fontFamily: '"Crimson Text", serif' }}>
            StudyFlow
          </h1>
          <p className="text-xl text-white/90 mb-16 font-medium tracking-wide italic" style={{ fontFamily: '"Playfair Display", serif' }}>
            "Where brilliant minds craft their masterpieces"
          </p>
        </div>

        {/* Workspace Cards and Video Previews */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Template Workspace */}
          <div className="space-y-6">
            <Link href="/template">
              <div className="bg-gradient-to-br from-cyan-200/80 via-purple-200/80 to-blue-200/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-gradient-to-br hover:from-cyan-300/90 hover:via-purple-300/90 hover:to-blue-300/90 aspect-square flex flex-col justify-between">
                {/* AI Lighting Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
                <div className="absolute bottom-4 left-4 w-1 h-1 bg-purple-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse delay-100"></div>
                <div className="absolute top-1/2 left-2 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce delay-200"></div>
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-300/20 via-purple-300/20 to-blue-300/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg">
                    <Layout className="text-gray-800 text-3xl" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Template</h3>
                <p className="text-lg text-gray-700 mb-6 text-center">Smart Templates Powered by AI</p>

                {/* Feature List */}
                <div className="bg-gradient-to-br from-white/60 via-cyan-50/45 to-purple-50/35 backdrop-blur-xl border border-white/50 rounded-xl p-4 space-y-3 shadow-lg shadow-cyan-200/30 ring-1 ring-white/20">
                  <p className="text-sm text-gray-700 text-center mb-3 font-medium">Use pre-designed templates with structured layouts perfect for academic reference sheets.</p>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    8.5x11 print layout
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Fixed structure
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Professional design
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Ready to print
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Embedded Video Preview */}
            <button 
              onClick={() => openVideoModal('template', 'Smart Templates Powered by AI')}
              className="w-full aspect-video bg-gradient-to-br from-cyan-300 via-purple-300 to-blue-300 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="text-white text-xl ml-1" />
              </div>
            </button>

            {/* Additional Features */}
            <div className="space-y-6 mt-8">
              <div className="bg-gradient-to-r from-white/25 via-cyan-50/20 to-purple-50/15 backdrop-blur-md border border-white/40 rounded-xl p-5 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-cyan-600" />
                  Academic Excellence
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">Structured layouts designed for research papers, thesis documents, and academic publications.</p>
              </div>
              
              <div className="bg-gradient-to-r from-white/25 via-cyan-50/20 to-purple-50/15 backdrop-blur-md border border-white/40 rounded-xl p-5 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Layout className="w-4 h-4 mr-2 text-cyan-600" />
                  Print Ready
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">Perfect formatting with IEEE, APA, and MLA compliance for professional submissions.</p>
              </div>
            </div>
          </div>

          {/* Cheat Sheet Workspace */}
          <div className="space-y-6">
            <Link href="/cheatsheet">
              <div className="bg-gradient-to-br from-cyan-200/80 via-purple-200/80 to-blue-200/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-gradient-to-br hover:from-purple-300/90 hover:via-pink-300/90 hover:to-blue-300/90 aspect-square flex flex-col justify-between">
                {/* AI Lighting Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                <div className="absolute top-3 left-3 w-2 h-2 bg-purple-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping delay-75"></div>
                <div className="absolute bottom-6 right-6 w-1 h-1 bg-pink-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse delay-150"></div>
                <div className="absolute top-1/3 right-3 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce delay-300"></div>
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-300/20 via-purple-300/20 to-blue-300/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg">
                    <Brain className="text-gray-800 text-3xl" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Cheatsheet</h3>
                <p className="text-lg text-gray-700 mb-6 text-center">Cheat Sheets Powered by AI</p>

                {/* Feature List */}
                <div className="bg-gradient-to-br from-white/65 via-purple-50/50 to-blue-50/40 backdrop-blur-xl border border-white/50 rounded-xl p-4 space-y-3 shadow-lg shadow-purple-200/30 ring-1 ring-white/20">
                  <p className="text-sm text-gray-700 text-center mb-3 font-medium">Generate organized cheat sheets with auto-resizing content boxes and intelligent formatting.</p>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Auto-sizing boxes
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Formula organization
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Sheet history
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Export ready
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Embedded Video Preview */}
            <button 
              onClick={() => openVideoModal('cheatsheet', 'Cheat Sheets Powered by AI')}
              className="w-full aspect-video bg-gradient-to-br from-cyan-300 via-purple-300 to-blue-300 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="text-white text-xl ml-1" />
              </div>
            </button>

            {/* Additional Features */}
            <div className="space-y-6 mt-8">
              <div className="bg-gradient-to-r from-white/30 via-purple-50/25 to-blue-50/20 backdrop-blur-md border border-white/40 rounded-xl p-5 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Calculator className="w-4 h-4 mr-2 text-purple-600" />
                  Smart Organization
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">AI-powered content placement with automatic formula categorization and visual hierarchy.</p>
              </div>
              
              <div className="bg-gradient-to-r from-white/30 via-purple-50/25 to-blue-50/20 backdrop-blur-md border border-white/40 rounded-xl p-5 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Grid3X3 className="w-4 h-4 mr-2 text-purple-600" />
                  Dynamic Layouts
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">Intelligent box sizing and collision detection for optimal space utilization.</p>
              </div>
            </div>
          </div>

          {/* Document Workspace */}
          <div className="space-y-6">
            <Link href="/document/test-doc-1">
              <div className="bg-gradient-to-br from-cyan-200/80 via-purple-200/80 to-blue-200/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-gradient-to-br hover:from-blue-300/90 hover:via-green-300/90 hover:to-cyan-300/90 aspect-square flex flex-col justify-between">
                {/* AI Lighting Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping delay-100"></div>
                <div className="absolute bottom-3 left-6 w-1 h-1 bg-green-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse delay-200"></div>
                <div className="absolute top-2/3 left-2 w-1.5 h-1.5 bg-cyan-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce delay-250"></div>
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-300/20 via-purple-300/20 to-blue-300/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg">
                    <PenTool className="text-gray-800 text-3xl" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2 text-center">Document</h3>
                <p className="text-lg text-gray-700 mb-6 text-center">Smart Documents Powered by AI</p>

                {/* Feature List */}
                <div className="bg-gradient-to-br from-white/70 via-blue-50/55 to-green-50/45 backdrop-blur-xl border border-white/50 rounded-xl p-4 space-y-3 shadow-lg shadow-blue-200/30 ring-1 ring-white/20">
                  <p className="text-sm text-gray-700 text-center mb-3 font-medium">Create documents with AI assistance and LaTeX rendering for academic content.</p>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Rich text editing
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    LaTeX math support
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    Document history
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-emerald-600 mr-3 flex-shrink-0" />
                    AI auto-formatting
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Embedded Video Preview */}
            <button 
              onClick={() => openVideoModal('document', 'Smart Documents Powered by AI')}
              className="w-full aspect-video bg-gradient-to-br from-cyan-300 via-purple-300 to-blue-300 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="text-white text-xl ml-1" />
              </div>
            </button>

            {/* Additional Features */}
            <div className="space-y-6 mt-8">
              <div className="bg-gradient-to-r from-white/35 via-blue-50/30 to-green-50/25 backdrop-blur-md border border-white/40 rounded-xl p-5 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <PenTool className="w-4 h-4 mr-2 text-blue-600" />
                  Microsoft Word Level
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">True pagination with live editing, content flow, and professional document standards.</p>
              </div>
              
              <div className="bg-gradient-to-r from-white/35 via-blue-50/30 to-green-50/25 backdrop-blur-md border border-white/40 rounded-xl p-5 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Brain className="w-4 h-4 mr-2 text-blue-600" />
                  AI Integration
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">Real-time ChatGPT assistance with direct document insertion and contextual suggestions.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Video Modal */}
      <Dialog open={videoModal.isOpen} onOpenChange={closeVideoModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 border-0 bg-gradient-to-br from-white/40 via-cyan-50/30 to-purple-50/20 backdrop-blur-2xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 backdrop-blur-sm rounded-lg"></div>
          <div className="relative z-10">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text">
                {videoModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4">
              <div className="aspect-video bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-gradient-to-br from-white/20 via-cyan-200/30 to-purple-200/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-xl mb-3 font-semibold tracking-wide">Video Demonstration</p>
                  <p className="text-sm opacity-90 max-w-md mx-auto leading-relaxed">
                    {videoModal.type === 'template' && 'See how Smart Templates help you create structured academic layouts instantly with AI-powered design assistance'}
                    {videoModal.type === 'cheatsheet' && 'Watch how Cheat Sheets organize your formulas with intelligent auto-sizing and dynamic layout management'}
                    {videoModal.type === 'document' && 'Experience Smart Documents with AI assistance and beautiful LaTeX rendering for academic excellence'}
                  </p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button 
                  onClick={closeVideoModal} 
                  variant="outline"
                  className="bg-gradient-to-r from-white/60 via-cyan-50/50 to-purple-50/40 backdrop-blur-md border-white/40 hover:from-white/70 hover:via-cyan-50/60 hover:to-purple-50/50 hover:backdrop-blur-lg transition-all duration-300 font-medium"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}