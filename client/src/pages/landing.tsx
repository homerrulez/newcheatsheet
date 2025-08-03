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
      <header className="absolute top-0 left-0 right-0 z-10 px-8 py-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 flex items-center justify-center">
              <img 
                src="/src/assets/brain-logo.png" 
                alt="StudyFlow" 
                className="w-20 h-20 brightness-110 contrast-125"
              />
            </div>
            <h1 className="text-xl font-light text-white tracking-wider" style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: '300', letterSpacing: '0.15em' }}>StudyFlow</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-white/90 hover:text-white font-medium hover:bg-white/10 transition-all duration-300 px-5 py-2 text-sm rounded-lg" style={{ fontFamily: '"Inter", sans-serif', fontWeight: '500' }}>
              Log In
            </Button>
            <Button variant="ghost" className="text-white/90 hover:text-white font-medium hover:bg-white/10 transition-all duration-300 px-5 py-2 text-sm rounded-lg" style={{ fontFamily: '"Inter", sans-serif', fontWeight: '500' }}>
              Register
            </Button>
          </div>
        </div>
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
        <div className="grid md:grid-cols-3 gap-16 mb-16 scale-[1.19]">
          {/* Template Workspace */}
          <div className="space-y-6">
            <Link href="/template">
              <div className="bg-gradient-to-br from-emerald-200/60 via-cyan-100/50 to-teal-100/40 backdrop-blur-md border border-emerald-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-emerald-300/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer group aspect-square flex flex-col justify-center items-center">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-900/90 backdrop-blur-sm border-2 border-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                    <Layout className="text-white text-3xl" />
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-3 text-center" style={{ fontFamily: '"Inter", sans-serif' }}>Template</h3>
                  <p className="text-base text-gray-700 text-center leading-relaxed font-medium">With Built-in AI</p>
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
              <div className="bg-gradient-to-br from-rose-200/60 via-pink-100/50 to-fuchsia-100/40 backdrop-blur-md border border-rose-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-rose-300/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer group aspect-square flex flex-col justify-center items-center">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-900/90 backdrop-blur-sm border-2 border-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                    <Brain className="text-white text-3xl" />
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-3 text-center" style={{ fontFamily: '"Inter", sans-serif' }}>Cheatsheet</h3>
                  <p className="text-base text-gray-700 text-center leading-relaxed font-medium">With Built-in AI</p>
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
              <div className="bg-gradient-to-br from-sky-200/60 via-blue-100/50 to-indigo-100/40 backdrop-blur-md border border-sky-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-sky-300/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer group aspect-square flex flex-col justify-center items-center">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-900/90 backdrop-blur-sm border-2 border-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                    <PenTool className="text-white text-3xl" />
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-3 text-center" style={{ fontFamily: '"Inter", sans-serif' }}>Document</h3>
                  <p className="text-base text-gray-700 text-center leading-relaxed font-medium">With Built-in AI</p>
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

        {/* Additional Features Section */}
        <div className="mt-40 mx-auto max-w-6xl space-y-8">
          {/* First Row - 2 boxes centered */}
          <div className="flex justify-center gap-8">
            {/* Academic Excellence */}
            <div className="bg-gradient-to-r from-white/25 via-blue-50/20 to-purple-50/15 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-lg w-80 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-200/30 hover:bg-gradient-to-r hover:from-white/35 hover:via-blue-50/30 hover:to-purple-50/25 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-cyan-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />
                Academic Excellence
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">Structured layouts designed for research papers, thesis documents, and academic publications.</p>
            </div>
            
            {/* Smart Organization */}
            <div className="bg-gradient-to-r from-white/25 via-purple-50/20 to-blue-50/15 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-lg w-80 hover:scale-105 hover:shadow-2xl hover:shadow-purple-200/30 hover:bg-gradient-to-r hover:from-white/35 hover:via-purple-50/30 hover:to-blue-50/25 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-purple-600 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
                Smart Organization
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">AI-powered content placement with automatic formula categorization and visual hierarchy.</p>
            </div>
          </div>
          
          {/* Second Row - 3 boxes */}
          <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Microsoft Word Level */}
            <div className="bg-gradient-to-r from-white/25 via-blue-50/20 to-green-50/15 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-blue-200/30 hover:bg-gradient-to-r hover:from-white/35 hover:via-blue-50/30 hover:to-green-50/25 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <PenTool className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
                Microsoft Word Level
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">True pagination with live editing, content flow, and professional document standards.</p>
            </div>
            
            {/* Print Ready */}
            <div className="bg-gradient-to-r from-white/25 via-cyan-50/20 to-purple-50/15 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-cyan-200/30 hover:bg-gradient-to-r hover:from-white/35 hover:via-cyan-50/30 hover:to-purple-50/25 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <Layout className="w-5 h-5 mr-2 text-cyan-600 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300" />
                Print Ready
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">Perfect formatting with IEEE, APA, and MLA compliance for professional submissions.</p>
            </div>
            
            {/* Dynamic Layouts */}
            <div className="bg-gradient-to-r from-white/25 via-purple-50/20 to-blue-50/15 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-purple-200/30 hover:bg-gradient-to-r hover:from-white/35 hover:via-purple-50/30 hover:to-blue-50/25 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <Grid3X3 className="w-5 h-5 mr-2 text-purple-600 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                Dynamic Layouts
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">Intelligent box sizing and collision detection for optimal space utilization.</p>
            </div>
          </div>
          
          {/* Third Row - 1 box centered */}
          <div className="flex justify-center">
            {/* AI Integration */}
            <div className="bg-gradient-to-r from-white/25 via-blue-50/20 to-green-50/15 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-lg w-80 hover:scale-105 hover:shadow-2xl hover:shadow-blue-200/30 hover:bg-gradient-to-r hover:from-white/35 hover:via-blue-50/30 hover:to-green-50/25 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />
                AI Integration
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">Real-time ChatGPT assistance with direct document insertion and contextual suggestions.</p>
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