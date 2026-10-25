'use client';

import React, { useState, useEffect } from 'react';
import { Mail, X, Send, CheckCircle2, Rss, Sparkles, ShieldCheck } from 'lucide-react';

export default function ArticleNewsletterPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check if already subscribed or dismissed
    try {
      const isSub = localStorage.getItem('rwm_newsletter_subscribed') === 'true';
      const isDismissed = localStorage.getItem('rwm_newsletter_popup_dismissed') === 'true';
      if (isSub || isDismissed) {
        return;
      }
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    const handleScroll = () => {
      if (typeof window === 'undefined') return;

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;

      const scrollPercent = (window.scrollY / totalHeight) * 100;

      // Trigger popup when reader scrolls past 65% of the page
      if (scrollPercent > 65) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('rwm_newsletter_popup_dismissed', 'true');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubscribed(true);
      try {
        localStorage.setItem('rwm_newsletter_subscribed', 'true');
        localStorage.setItem('rwm_newsletter_popup_dismissed', 'true');
        localStorage.setItem('rwm_newsletter_email', email);
      } catch (e) {
        console.warn(e);
      }

      // Automatically hide after 3.5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 3500);
    }, 600);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 max-w-md w-[calc(100vw-2rem)] sm:w-full shadow-2xl rounded-2xl bg-stone-900 border border-stone-800 text-stone-100 font-sans p-5 sm:p-6 animate-in slide-in-from-bottom-5 duration-300">
      {/* Top Header & Dismiss Button */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/50 text-amber-400 flex items-center justify-center shrink-0">
            <Rss className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold block leading-tight">
              Enjoying this teardown?
            </span>
            <h4 className="font-serif font-bold text-base text-white tracking-tight leading-snug">
              Weekly Research Digest
            </h4>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          title="Dismiss for 30 days"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isSubscribed ? (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 flex items-center gap-2.5 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">
            Subscribed! You will receive next Tuesday&apos;s research digest.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-stone-300 leading-relaxed font-serif">
            Get curated paper reviews, open-source C++/Rust architecture teardowns, and empirical replication notes delivered every Tuesday. Zero ads.
          </p>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@institution.edu"
                  required
                  className="w-full bg-stone-950 border border-stone-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                />
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors shrink-0 shadow-xs"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-200" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-400 font-sans">{errorMsg}</p>
            )}
          </form>

          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-1 border-t border-stone-800/80">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>CC BY 4.0 · No spam</span>
            </span>
            <button
              onClick={handleDismiss}
              className="text-stone-400 hover:text-stone-300 underline"
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
