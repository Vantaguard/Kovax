'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { LoginCredentials } from '@/types/auth';
import { checkLoginRateLimit, processLoginSuccess, checkUserStatus, checkUserExists } from './actions';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Pick up error messages from middleware redirects
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const rateLimitCheck = await checkLoginRateLimit();
      if (rateLimitCheck.error) {
        setError(rateLimitCheck.error);
        return;
      }

      const supabase = createClient();
      
      // NEW: Check if account exists before attempting login to provide specific feedback
      const exists = await checkUserExists(credentials.email);
      
      if (!exists) {
        setError('This email address is not registered in our system.');
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (signInError) {
        // Provide specific feedback for unconfirmed emails
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setError('Your email address has not been confirmed yet. Please check your inbox for the confirmation link.');
        } else {
          setError('Invalid login credentials. Please check your email and password.');
        }
        return;
      }

      if (data.user) {
        // Server-side status check — deny draft/inactive users
        const statusCheck = await checkUserStatus();
        if (!statusCheck.allowed) {
          setError(statusCheck.reason || 'Access denied.');
          return;
        }

        await processLoginSuccess();
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl mb-4 shadow-lg shadow-amber-500/20">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-400">
            Sign in to access your dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-slate-800/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-700/50" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-slate-900/50 border border-slate-600 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-slate-900/50 border border-slate-600 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-900/30 border border-red-500/50 p-4 animate-shake backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">⚠️</span>
                <p className="text-sm font-medium text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-900 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-4 border-t border-slate-700/50 pt-4">
            <p className="text-slate-400 text-sm">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                Sign Up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
