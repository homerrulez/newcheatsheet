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
          {/* Free Plan */}
          <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-white/30">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Free</h3>
              <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>$0</div>
              <p className="text-sm text-white/70">per month</p>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Basic document editing
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                5 documents limit
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Basic templates
              </div>
              <div className="flex items-center text-sm text-white/60">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                No AI assistance
              </div>
            </div>
            
            <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0 py-3" style={{ fontFamily: '"Inter", sans-serif' }}>
              Get Started
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-cyan-500/30 backdrop-blur-md border border-blue-300/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden hover:scale-105 transform scale-110 ring-2 ring-blue-300/60">
            <div className="absolute top-4 right-4 bg-blue-400 text-white text-xs px-3 py-1 rounded-full font-medium">
              Popular
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Pro</h3>
              <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>$12</div>
              <p className="text-sm text-white/70">per month</p>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Unlimited documents
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                AI-powered assistance
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Advanced templates
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                LaTeX support
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Real-time collaboration
              </div>
            </div>
            
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 py-3" style={{ fontFamily: '"Inter", sans-serif' }}>
              Start Free Trial
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden hover:scale-105 hover:bg-white/30">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: '"Inter", sans-serif' }}>Enterprise</h3>
              <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: '"Inter", sans-serif' }}>$49</div>
              <p className="text-sm text-white/70">per month</p>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Everything in Pro
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Team collaboration
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Advanced AI models
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Priority support
              </div>
              <div className="flex items-center text-sm text-white/90">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Custom integrations
              </div>
            </div>
            
            <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0 py-3" style={{ fontFamily: '"Inter", sans-serif' }}>
              Contact Sales
            </Button>
          </div>
        </div>

        {/* Feature Access Links */}
        <div className="text-center mb-16">
          <p className="text-white/80 mb-6 text-lg" style={{ fontFamily: '"Inter", sans-serif' }}>
            Try our workspaces with any plan
          </p>
          <div className="flex justify-center gap-6">
            <Link href="/template">
              <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-6 py-3" style={{ fontFamily: '"Inter", sans-serif' }}>
                <Layout className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </Link>
            <Link href="/document">
              <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-6 py-3" style={{ fontFamily: '"Inter", sans-serif' }}>
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </Button>
            </Link>
            <Link href="/cheatsheet">
              <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-6 py-3" style={{ fontFamily: '"Inter", sans-serif' }}>
                <Grid3X3 className="w-4 h-4 mr-2" />
                Cheat Sheets
              </Button>
            </Link>
          </div>
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