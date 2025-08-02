import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Grid3X3, Layout, Play, BookOpen, Calculator, PenTool, Brain } from 'lucide-react';
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

        {/* Subscription Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
          {/* Template Workspace - Free Plan */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-500/25 via-emerald-500/25 to-teal-500/25 backdrop-blur-md border border-green-300/50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-gradient-to-br hover:from-green-500/35 hover:via-emerald-500/35 hover:to-teal-500/35 aspect-square flex flex-col justify-between">
              <div className="flex flex-col items-center mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-green-300/20 via-emerald-300/20 to-teal-300/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                  <Layout className="text-white text-2xl" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>Template</h3>
                <p className="text-sm text-white/80 text-center">Smart Templates - Free</p>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>$0</div>
                <p className="text-xs text-white/70">per month</p>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Basic templates
                </div>
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  5 documents limit
                </div>
                <div className="flex items-center text-xs text-white/60">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                  No AI assistance
                </div>
              </div>
              
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0 py-2 text-sm" style={{ fontFamily: '"Inter", sans-serif' }}>
                Get Started
              </Button>
            </div>
            
            <button
              onClick={() => openVideoModal('template', 'Template Workspace')}
              className="w-full aspect-video bg-gradient-to-br from-green-300 via-emerald-300 to-teal-300 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="text-white text-xl ml-1" />
              </div>
            </button>
          </div>

          {/* Document Workspace - Pro Plan */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-cyan-500/30 backdrop-blur-md border border-blue-300/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden hover:scale-105 transform scale-110 ring-2 ring-blue-300/60 aspect-square flex flex-col justify-between">
              <div className="absolute top-4 right-4 bg-blue-400 text-white text-xs px-3 py-1 rounded-full font-medium">
                Popular
              </div>
              <div className="flex flex-col items-center mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-300/20 via-purple-300/20 to-cyan-300/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                  <FileText className="text-white text-2xl" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>Document</h3>
                <p className="text-sm text-white/80 text-center">Microsoft Word-Level</p>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>$12</div>
                <p className="text-xs text-white/70">per month</p>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Unlimited documents
                </div>
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  AI-powered assistance
                </div>
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Live pagination
                </div>
              </div>
              
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 py-2 text-sm" style={{ fontFamily: '"Inter", sans-serif' }}>
                Start Free Trial
              </Button>
            </div>
            
            <button
              onClick={() => openVideoModal('document', 'Document Workspace')}
              className="w-full aspect-video bg-gradient-to-br from-blue-300 via-purple-300 to-cyan-300 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="text-white text-xl ml-1" />
              </div>
            </button>
          </div>

          {/* CheatSheet Workspace - Enterprise Plan */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-500/25 via-indigo-500/25 to-violet-500/25 backdrop-blur-md border border-purple-300/50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-gradient-to-br hover:from-purple-500/35 hover:via-indigo-500/35 hover:to-violet-500/35 aspect-square flex flex-col justify-between">
              <div className="flex flex-col items-center mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-300/20 via-indigo-300/20 to-violet-300/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                  <Grid3X3 className="text-white text-2xl" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>CheatSheet</h3>
                <p className="text-sm text-white/80 text-center">Interactive Study Cards</p>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>$49</div>
                <p className="text-xs text-white/70">per month</p>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Everything in Pro
                </div>
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Team collaboration
                </div>
                <div className="flex items-center text-xs text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Advanced AI models
                </div>
              </div>
              
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0 py-2 text-sm" style={{ fontFamily: '"Inter", sans-serif' }}>
                Contact Sales
              </Button>
            </div>
            
            <button
              onClick={() => openVideoModal('cheatsheet', 'CheatSheet Workspace')}
              className="w-full aspect-video bg-gradient-to-br from-purple-300 via-indigo-300 to-violet-300 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Play className="text-white text-xl ml-1" />
              </div>
            </button>
          </div>
        </div>

        {/* Feature Access Note */}
        <div className="text-center mb-16">
          <p className="text-white/80 mb-2 text-lg" style={{ fontFamily: '"Inter", sans-serif' }}>
            Choose your workspace and pricing plan
          </p>
          <p className="text-white/60 text-sm" style={{ fontFamily: '"Inter", sans-serif' }}>
            Each workspace type comes with different subscription options
          </p>
        </div>

        {/* Feature Boxes - Bottom Section */}
        <div className="mt-40 mx-auto max-w-6xl space-y-8">
          {/* First Row - 2 boxes centered */}
          <div className="flex justify-center gap-8">
            {/* Academic Excellence */}
            <div className="bg-gradient-to-r from-white/20 via-blue-50/15 to-purple-50/10 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-lg w-80 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-200/20 hover:bg-gradient-to-r hover:from-white/25 hover:via-blue-50/20 hover:to-purple-50/15 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-cyan-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />
                Academic Excellence
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">Structured layouts designed for research papers, thesis documents, and academic publications.</p>
            </div>
            
            {/* Smart Organization */}
            <div className="bg-gradient-to-r from-white/20 via-purple-50/15 to-blue-50/10 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-lg w-80 hover:scale-105 hover:shadow-2xl hover:shadow-purple-200/20 hover:bg-gradient-to-r hover:from-white/25 hover:via-purple-50/20 hover:to-blue-50/15 transition-all duration-300 cursor-pointer group">
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
            <div className="bg-gradient-to-r from-white/20 via-blue-50/15 to-green-50/10 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-blue-200/20 hover:bg-gradient-to-r hover:from-white/25 hover:via-blue-50/20 hover:to-green-50/15 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <PenTool className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
                Microsoft Word Level
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">True pagination with live editing, content flow, and professional document standards.</p>
            </div>
            
            {/* Print Ready */}
            <div className="bg-gradient-to-r from-white/20 via-cyan-50/15 to-purple-50/10 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-cyan-200/20 hover:bg-gradient-to-r hover:from-white/25 hover:via-cyan-50/20 hover:to-purple-50/15 transition-all duration-300 cursor-pointer group">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <Layout className="w-5 h-5 mr-2 text-cyan-600 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300" />
                Print Ready
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">Perfect formatting with IEEE, APA, and MLA compliance for professional submissions.</p>
            </div>
            
            {/* Dynamic Layouts */}
            <div className="bg-gradient-to-r from-white/20 via-purple-50/15 to-blue-50/10 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-lg hover:scale-105 hover:shadow-2xl hover:shadow-purple-200/20 hover:bg-gradient-to-r hover:from-white/25 hover:via-purple-50/20 hover:to-blue-50/15 transition-all duration-300 cursor-pointer group">
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
            <div className="bg-gradient-to-r from-white/20 via-blue-50/15 to-green-50/10 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow-lg w-80 hover:scale-105 hover:shadow-2xl hover:shadow-blue-200/20 hover:bg-gradient-to-r hover:from-white/25 hover:via-blue-50/20 hover:to-green-50/15 transition-all duration-300 cursor-pointer group">
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
        <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-md border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Playfair Display", serif' }}>
              {videoModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {videoModal.type === 'template' && 'Template Workspace Demo Video'}
                {videoModal.type === 'document' && 'Document Workspace Demo Video'}
                {videoModal.type === 'cheatsheet' && 'CheatSheet Workspace Demo Video'}
              </p>
              <Button 
                onClick={closeVideoModal}
                className="mt-4 bg-gray-600 hover:bg-gray-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}