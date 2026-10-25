'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Check, Send, Sparkles, ShieldCheck, CheckCircle2, Rss } from 'lucide-react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Digest topic preferences
  const [preferences, setPreferences] = useState({
    teardowns: true,
    papers: true,
    clinical: false,
    policy: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rwm_newsletter_subscribed');
      if (stored === 'true') {
        setIsSubscribed(true);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handleTogglePref = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid academic or professional email address.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    // Simulate API registration delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubscribed(true);
      try {
        localStorage.setItem('rwm_newsletter_subscribed', 'true');
        localStorage.setItem('rwm_newsletter_email', email);
      } catch (e) {
        console.warn(e);
      }
    }, 600);
  };

  const handleReset = () => {
    setIsSubscribed(false);
    try {
      localStorage.removeItem('rwm_newsletter_subscribed');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="bg-stone-950/80 border border-stone-800/90 rounded-2xl p-6 sm:p-8 space-y-5 my-10 shadow-lg text-stone-200 font-sans">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left Copy Header */}
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-800/40 text-amber-300 font-mono text-[11px]">
            <Rss className="w-3.5 h-3.5 text-amber-400" />
            <span>Weekly Research & Architecture Digest</span>
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
            Subscribe to Weekly Peer Critiques & Code Teardowns
          </h3>

          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
            Delivered every Tuesday morning. Curated literature breakdowns, GPU runtime memory profiling, and open-science replication notes. No ads, no tracking.
          </p>
        </div>

        {/* Right Assurance Badge */}
        <div className="shrink-0 flex items-center gap-2 text-stone-400 text-xs font-mono bg-stone-900/80 px-3 py-2 rounded-xl border border-stone-800/80 self-start">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>CC BY 4.0 · Unsubscribe anytime</span>
        </div>
      </div>

      {/* Form or Success State */}
      {isSubscribed ? (
        <div className="p-5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">
                Subscribed! Welcome to the ResearchWithMe Weekly Digest
              </h4>
              <p className="text-xs text-emerald-300/90 leading-relaxed font-sans">
                You are registered for weekly dispatches. Your first edition will arrive next Tuesday.
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="text-xs text-stone-400 hover:text-stone-200 underline font-mono shrink-0 self-end sm:self-center"
          >
            Manage Email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input & Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email (e.g. researcher@jhu.edu or dev@engineer.io)"
                required
                className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-all font-sans"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-colors shadow-xs shrink-0"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Subscribing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-200" />
                  <span>Subscribe to Digest</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-sans">{errorMsg}</p>
          )}

          {/* Topic Preference Selectors */}
          <div className="pt-2 border-t border-stone-800/60 flex flex-wrap items-center gap-3 text-xs text-stone-400">
            <span className="font-semibold text-stone-300 font-mono text-[11px]">
              Customize Topics:
            </span>

            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-stone-200 transition-colors">
              <input
                type="checkbox"
                checked={preferences.teardowns}
                onChange={() => handleTogglePref('teardowns')}
                className="rounded border-stone-700 bg-stone-900 text-amber-800 focus:ring-amber-700 focus:ring-offset-stone-950"
              />
              <span>GitHub Repo Teardowns</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-stone-200 transition-colors">
              <input
                type="checkbox"
                checked={preferences.papers}
                onChange={() => handleTogglePref('papers')}
                className="rounded border-stone-700 bg-stone-900 text-amber-800 focus:ring-amber-700 focus:ring-offset-stone-950"
              />
              <span>Peer Paper Reviews</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-stone-200 transition-colors">
              <input
                type="checkbox"
                checked={preferences.clinical}
                onChange={() => handleTogglePref('clinical')}
                className="rounded border-stone-700 bg-stone-900 text-amber-800 focus:ring-amber-700 focus:ring-offset-stone-950"
              />
              <span>Clinical & Health</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-stone-200 transition-colors">
              <input
                type="checkbox"
                checked={preferences.policy}
                onChange={() => handleTogglePref('policy')}
                className="rounded border-stone-700 bg-stone-900 text-amber-800 focus:ring-amber-700 focus:ring-offset-stone-950"
              />
              <span>Data Science & Policy</span>
            </label>
          </div>
        </form>
      )}
    </div>
  );
}
