'use client';

import Link from 'next/link';

export default function PublicNavbar() {
  return (
    <div className="bg-slate-900 shadow-xl border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent">
              Kovax
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 text-sm font-medium text-slate-900 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
