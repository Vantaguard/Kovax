'use client';

import { acceptAllConsents } from './actions';
import { useState, useTransition } from 'react';

export default function ConsentClient() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState({
    terms: false,
    privacy: false,
    data: false,
  });

  const allChecked = checked.terms && checked.privacy && checked.data;

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptAllConsents();
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl mb-6 border border-amber-500/30">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Consent Required</h1>
          <p className="text-slate-400 text-lg">
            Before accessing the platform, please review and accept the following agreements.
          </p>
        </div>

        {/* Consent Cards */}
        <div className="space-y-4 mb-8">
          {/* Terms of Service */}
          <label
            htmlFor="consent-terms"
            className={`block bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border cursor-pointer transition-all duration-200 ${
              checked.terms
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="pt-1">
                <input
                  id="consent-terms"
                  type="checkbox"
                  checked={checked.terms}
                  onChange={(e) => setChecked({ ...checked, terms: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📄</span>
                  <h3 className="text-lg font-semibold text-white">Terms of Service</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  I agree to the Terms of Service governing the use of this platform, including
                  acceptable use policies, intellectual property rights, and account responsibilities.
                  I understand that violation of these terms may result in account suspension.
                </p>
              </div>
            </div>
          </label>

          {/* Privacy Policy */}
          <label
            htmlFor="consent-privacy"
            className={`block bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border cursor-pointer transition-all duration-200 ${
              checked.privacy
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="pt-1">
                <input
                  id="consent-privacy"
                  type="checkbox"
                  checked={checked.privacy}
                  onChange={(e) => setChecked({ ...checked, privacy: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🔒</span>
                  <h3 className="text-lg font-semibold text-white">Privacy Policy</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  I acknowledge and accept the Privacy Policy, including how my personal data is
                  collected, processed, stored, and shared. I understand my rights regarding data
                  access, correction, deletion, and portability under applicable data protection laws.
                </p>
              </div>
            </div>
          </label>

          {/* Data Processing */}
          <label
            htmlFor="consent-data"
            className={`block bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border cursor-pointer transition-all duration-200 ${
              checked.data
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="pt-1">
                <input
                  id="consent-data"
                  type="checkbox"
                  checked={checked.data}
                  onChange={(e) => setChecked({ ...checked, data: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚙️</span>
                  <h3 className="text-lg font-semibold text-white">Data Processing Agreement</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  I consent to the processing of my data as described in the Data Processing Agreement.
                  This includes activity logging, performance analytics, and automated system operations
                  necessary for the platform to function. I can withdraw this consent at any time through
                  my profile settings.
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Accept Button */}
        <div className="text-center">
          <button
            onClick={handleAccept}
            disabled={!allChecked || isPending}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              allChecked && !isPending
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 cursor-pointer'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Accept All & Continue'
            )}
          </button>
          {!allChecked && (
            <p className="text-slate-500 text-sm mt-3">
              Please check all boxes to continue
            </p>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-xs">
            You can withdraw your consent at any time through your profile settings.
            <br />
            All consent actions are logged for compliance purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
