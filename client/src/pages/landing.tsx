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
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 25%, #cbd5e1 50%, #94a3b8 75%, #64748b 100%)' }}>
      {/* Frosted overlay with floating math symbols */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-slate-50/10 to-slate-100/15 backdrop-blur-[1px] z-0">
        {/* Floating math symbols - subtle and spaced out */}
        <div className="absolute top-[40%] left-[5%] text-2xl text-slate-300/20 font-light select-none animate-float-right">∫</div>
        <div className="absolute top-[60%] right-[8%] text-xl text-slate-400/15 font-light select-none animate-float-left">π</div>
        <div className="absolute top-[75%] left-[20%] text-2xl text-slate-300/20 font-light select-none animate-float-right">√</div>
        <div className="absolute top-[30%] left-[85%] text-xl text-slate-400/15 font-light select-none animate-float-left">λ</div>
        <div className="absolute top-[85%] right-[30%] text-2xl text-slate-300/20 font-light select-none animate-float-up">∞</div>
        <div className="absolute top-[25%] right-[10%] text-xl text-slate-400/15 font-light select-none animate-float-left">∇</div>
        <div className="absolute top-[90%] left-[70%] text-2xl text-slate-300/20 font-light select-none animate-float-up">θ</div>
        <div className="absolute top-[35%] left-[3%] text-xl text-slate-400/15 font-light select-none animate-float-right">α</div>
      </div>
      {/* Header */}
      <header className="relative z-10 px-8 py-6">
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
      <main className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-20">
          <h2 className="text-7xl font-black text-gray-900 mb-6 leading-tight tracking-tight font-sans bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
            Welcome
          </h2>
          <p className="text-2xl text-gray-700 mb-16 font-medium tracking-wide">
            Choose an option to get started.
          </p>
        </div>

        {/* Workspace Cards and Video Previews */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Template Workspace */}
          <div className="space-y-6">
            <Link href="/template">
              <div className="bg-gradient-to-br from-cyan-200/80 via-purple-200/80 to-blue-200/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative">
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
          </div>

          {/* Cheat Sheet Workspace */}
          <div className="space-y-6">
            <Link href="/cheatsheet">
              <div className="bg-gradient-to-br from-cyan-200/80 via-purple-200/80 to-blue-200/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative">
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
          </div>

          {/* Document Workspace */}
          <div className="space-y-6">
            <Link href="/document/test-doc-1">
              <div className="bg-gradient-to-br from-cyan-200/80 via-purple-200/80 to-blue-200/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative">
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