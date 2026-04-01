'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      
      // Sign up the user — trigger creates public.users with status='draft'
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        if (signUpError.message.includes('Database error saving new user')) {
          setError(
            'Registration failed: The database trigger could not create your user profile. ' +
            'Please ask your administrator to run the fix_intern_lifecycle.sql script in the Supabase SQL Editor.'
          );
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user) {
        // If email confirmation is required, the user identity may not be confirmed yet
        if (data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists. Please sign in instead.');
          return;
        }
        
        // Sign them out immediately — they cannot access dashboard until admin approves
        await supabase.auth.signOut();
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-md w-full space-y-6 relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl mb-4 shadow-lg shadow-amber-500/20">
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Account Created!</h2>
          <p className="text-slate-300 text-lg">
            Your account has been registered successfully. However, you will not be able to sign in until an administrator approves your account.
          </p>
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl border border-amber-500/20">
            <p className="text-amber-400 font-medium text-sm">⚠ Pending Admin Approval</p>
            <p className="text-slate-400 text-sm mt-2">Registered as: <span className="text-white font-medium">{formData.email}</span></p>
          </div>
          <p className="text-slate-500 text-sm">Your administrator will review and activate your account. You will be able to sign in once approved.</p>
          <Link href="/login" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium transition-colors">
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

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
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-2">
            Create Account
          </h2>
          <p className="text-slate-400">
            Join Kovax and start managing your organization
          </p>
        </div>
        <form className="mt-8 space-y-4 bg-slate-800/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-700/50" onSubmit={handleSubmit}>
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
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
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
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-slate-900/50 border border-slate-600 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-slate-900/50 border border-slate-600 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-900/30 border border-red-500/50 p-4 animate-bounce backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">⚠️</span>
                <p className="text-sm font-medium text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-900 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Register Now</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
