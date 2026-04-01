import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8 inline-block">
            <span className="px-4 py-2 bg-slate-800/60 backdrop-blur-sm text-amber-400 text-sm font-medium rounded-full border border-amber-500/30">
              🚀 Production-Ready Multi-tenant Platform
            </span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Welcome to
            <span className="block bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent">
              Kovax
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed max-w-2xl mx-auto">
            Enterprise-grade SaaS platform built for modern organizations. 
            Secure, scalable, and ready to power your business.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold rounded-xl shadow-2xl hover:shadow-amber-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-slate-800/60 backdrop-blur-sm text-white font-semibold rounded-xl border-2 border-slate-600/50 hover:bg-slate-700/60 hover:scale-105 transition-all duration-300"
            >
              Get Started
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 hover:bg-slate-800/60 hover:border-amber-500/30 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">Secure by Default</h3>
              <p className="text-slate-300">Enterprise-grade security with RLS and multi-tenant isolation</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 hover:bg-slate-800/60 hover:border-amber-500/30 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Lightning Fast</h3>
              <p className="text-slate-300">Built on Next.js 15 with optimized performance</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 hover:bg-slate-800/60 hover:border-amber-500/30 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-2">Production Ready</h3>
              <p className="text-slate-300">Clean architecture with TypeScript and best practices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
