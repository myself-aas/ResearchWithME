'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, useRouter } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  ArrowLeft, 
  Bookmark, 
  Heart, 
  Share2, 
  Check, 
  GitBranch, 
  FileText, 
  ExternalLink, 
  Clock, 
  Quote, 
  Send, 
  MessageSquare,
  Sparkles,
  BookOpen,
  Twitter,
  Linkedin,
  Copy,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Tag
} from 'lucide-react';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { CommentRecord } from '@/lib/db';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import ArticleNewsletterPopup from '@/components/ArticleNewsletterPopup';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function ArticlePage(props: PageProps) {
  const resolvedParams = use(props.params);
  if (props.searchParams) {
    use(props.searchParams);
  }
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');
  const [copiedTakeawayIndex, setCopiedTakeawayIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  // Load article, comments, and bookmark state
  useEffect(() => {
    async function fetchArticleAndComments() {
      try {
        setLoading(true);
        // Fetch article
        const res = await fetch(`/api/articles/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data.article);

          // Fetch comments
          const commRes = await fetch(`/api/comments?postId=${data.article.id}`);
          if (commRes.ok) {
            const commData = await commRes.json();
            setComments(commData.comments || []);
          }
        } else {
          // Fallback to in-memory initial posts
          const fallback = INITIAL_BLOG_POSTS.find((p) => p.slug === slug || p.id === slug);
          if (fallback) {
            setPost(fallback);
          }
        }
      } catch (err) {
        console.error('Error loading article:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchArticleAndComments();

    // Check localStorage bookmarks
    try {
      const stored = localStorage.getItem('rwm_saved_posts');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setSavedCount(ids.length);
        setIsSaved(ids.includes(slug));
      }
    } catch (e) {
      console.warn('localStorage access failed:', e);
    }
  }, [slug]);

  // Scroll reading progress
  const [readingProgress, setReadingProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setReadingProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggleSave = () => {
    try {
      const stored = localStorage.getItem('rwm_saved_posts');
      let ids: string[] = stored ? JSON.parse(stored) : [];
      if (post) {
        if (ids.includes(post.id)) {
          ids = ids.filter((id) => id !== post.id);
          setIsSaved(false);
        } else {
          ids.push(post.id);
          setIsSaved(true);
        }
        localStorage.setItem('rwm_saved_posts', JSON.stringify(ids));
        setSavedCount(ids.length);
      }
    } catch (e) {
      console.warn('Bookmark toggle error:', e);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    setIsLiked(true);
    setPost((prev) => (prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null));

    try {
      await fetch(`/api/articles/${post.id}`, { method: 'PATCH' });
    } catch (err) {
      console.error('Failed to register like:', err);
    }
  };

  const shareUrl = currentUrl || (post ? `https://researchwith.me/post/${post.slug}` : '');
  const twitterShareUrl = post 
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${post.title}" by ${post.author.name} on @ResearchWithMe:`)}&url=${encodeURIComponent(shareUrl)}`
    : '';
  const linkedInShareUrl = post
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : '';

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!post) return;
    const activeShareUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const shareData = {
      title: post.title,
      text: `Read "${post.title}" by ${post.author.name} on ResearchWithMe`,
      url: activeShareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn('Native share cancelled or unsupported:', err);
      }
    } else {
      handleShare();
    }
  };

  // Find 3 similar posts based on tag overlap & category match
  const relatedPosts = React.useMemo(() => {
    if (!post) return [];

    const candidates = INITIAL_BLOG_POSTS.filter((p) => p.id !== post.id && p.slug !== post.slug);

    const scored = candidates.map((candidate) => {
      const tagMatches = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      const categoryMatch = candidate.category === post.category ? 2 : 0;
      const formatMatch = candidate.format === post.format ? 1 : 0;
      const score = tagMatches * 3 + categoryMatch + formatMatch;
      return { post: candidate, score };
    });

    scored.sort((a, b) => b.score - a.score || new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime());

    return scored.slice(0, 3).map((item) => item.post);
  }, [post]);

  const getTakeawayTwitterUrl = (takeaway: string) => {
    if (!post) return '#';
    const text = `"${takeaway}" — from "${post.title}" by ${post.author.name} on @ResearchWithMe`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  };

  const handleCopyTakeaway = (takeaway: string, index: number) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`"${takeaway}" — from "${post?.title}" by ${post?.author.name}: ${shareUrl}`);
      setCopiedTakeawayIndex(index);
      setTimeout(() => setCopiedTakeawayIndex(null), 2000);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !post) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          authorName: newCommentName.trim() || 'Reader',
          text: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans">
        <BlogHeader savedCount={savedCount} />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-sans">Loading manuscript...</p>
        </div>
        <BlogFooter onCategorySelect={() => {}} onOpenWriteModal={() => {}} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans">
        <BlogHeader savedCount={savedCount} />
        <div className="flex-1 max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-stone-400 mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-stone-900">Article Not Found</h1>
          <p className="text-xs text-stone-600 leading-relaxed">
            The requested article or review URL does not exist or may have been moved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Feed</span>
          </Link>
        </div>
        <BlogFooter onCategorySelect={() => {}} onOpenWriteModal={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      {/* Top sticky scroll progress bar */}
      <div 
        className="fixed top-0 left-0 right-0 h-1 bg-amber-800 z-50 transition-all duration-75"
        style={{ width: `${readingProgress}%` }}
      />

      <BlogHeader savedCount={savedCount} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-8 font-sans">
          <Link href="/" className="hover:text-stone-900 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Articles</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-amber-900">{post.category}</span>
          <span aria-hidden="true">/</span>
          <span className="text-stone-400 truncate max-w-xs">{post.title}</span>
        </div>

        {/* Article Header Container */}
        <header className="space-y-4 border-b border-stone-200 pb-8">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-sans flex-wrap">
            <span className="font-semibold text-amber-900 uppercase tracking-wider">{post.format}</span>
            <span aria-hidden="true">·</span>
            <span>{post.publishedAt}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              {post.readTime}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 leading-[1.18] tracking-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-xl text-stone-600 font-serif leading-relaxed">
            {post.subtitle}
          </p>

          {/* Author Card */}
          <div className="pt-4 flex items-center justify-between flex-wrap gap-4 bg-stone-50 border border-stone-200/80 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-sm font-bold shrink-0">
                {post.author.avatar}
              </div>
              <div>
                <div className="font-bold text-stone-900 text-sm">
                  {post.author.name}
                </div>
                <div className="text-xs text-amber-900 font-medium">
                  {post.author.role}
                </div>
                <div className="text-xs text-stone-500">
                  {post.author.domain}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  isLiked
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
                title="Clap / Like this article"
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600 text-red-600' : 'text-stone-400'}`} />
                <span>{post.likes}</span>
              </button>

              <button
                onClick={handleToggleSave}
                className={`p-2 rounded-lg border text-xs transition-colors ${
                  isSaved
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
                title={isSaved ? 'Saved in reading list' : 'Bookmark for later'}
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>

              {/* Native Mobile Share Intent Button */}
              <button
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900 bg-stone-900 hover:bg-amber-950 text-white text-xs font-semibold transition-colors shadow-2xs"
                title="Trigger native mobile share sheet"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* Social Share to X */}
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-900 hover:text-white hover:border-stone-900 text-xs font-medium text-stone-700 transition-colors"
                title="Share this article on X / Twitter"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-500 fill-current" />
                <span className="hidden sm:inline">Share on X</span>
              </a>

              {/* Social Share to LinkedIn */}
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] text-xs font-medium text-stone-700 transition-colors"
                title="Share this article on LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>

              {/* Copy Link */}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors"
                title="Copy direct share link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </button>

              <Link
                href={`/cite?article=${post.slug}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors"
                title="Cite this post"
              >
                <Quote className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Cite</span>
              </Link>
            </div>
          </div>

          {/* Reviewed Artifact Inspection Card */}
          {post.reviewedArtifact && (
            <div className="bg-amber-50/50 border border-amber-900/20 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block font-mono">
                  Reviewed Artifact
                </span>
                <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  {post.reviewedArtifact.type === 'github' ? (
                    <GitBranch className="w-4 h-4 text-amber-800" />
                  ) : (
                    <FileText className="w-4 h-4 text-amber-800" />
                  )}
                  <span>{post.reviewedArtifact.title}</span>
                </div>
                <div className="text-xs text-stone-600 font-mono">
                  {post.reviewedArtifact.identifier} · {post.reviewedArtifact.meta}
                </div>
              </div>

              <a
                href={post.reviewedArtifact.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 bg-amber-900 hover:bg-amber-950 text-white px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                <span>Inspect Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </header>

        {/* Featured Image */}
        {post.coverImage && post.coverImage.trim() !== '' && (
          <div className="my-8 relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden bg-stone-900">
            <Image
              src={post.coverImage.trim()}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover opacity-95"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Key Takeaways Box */}
        <section className="bg-stone-50 border border-stone-200 rounded-xl p-6 sm:p-7 space-y-4 my-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-stone-200/60">
            <h2 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-800" />
              <span>Key Takeaways & Core Arguments</span>
            </h2>
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              Share individual findings
            </span>
          </div>
          <ul className="space-y-3 text-sm text-stone-700 font-sans">
            {post.keyTakeaways.map((takeaway, idx) => (
              <li 
                key={idx} 
                className="group p-3.5 rounded-lg bg-white border border-stone-200/80 hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-2.5 flex-1">
                  <span className="text-amber-800 font-bold font-mono shrink-0 pt-0.5">0{idx + 1}.</span>
                  <span className="leading-relaxed text-stone-800">{takeaway}</span>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                  <a
                    href={getTakeawayTwitterUrl(takeaway)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-colors"
                    title="Share this specific takeaway on X"
                  >
                    <Twitter className="w-3 h-3 text-sky-500 fill-current" />
                    <span>Post</span>
                  </a>
                  <button
                    onClick={() => handleCopyTakeaway(takeaway, idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-colors"
                    title="Copy insight quote with citation"
                  >
                    {copiedTakeawayIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-stone-500" />
                        <span>Quote</span>
                      </>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Full Narrative Content */}
        <article className="space-y-6 text-stone-800 font-serif text-lg leading-8 my-8">
          {post.content.map((paragraph, index) => (
            <p key={index} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </article>

        {/* Dedicated Social Sharing & Discussion Section */}
        <section className="my-10 p-6 sm:p-7 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Share This Peer Review & Analysis</span>
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                Help expand rigorous research discourse
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
                Found these teardowns or benchmark critiques valuable? Share directly with colleagues on X and LinkedIn to foster open scientific feedback.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-stone-800 text-white border border-stone-700 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-400 fill-current" />
                <span>Post on X</span>
              </a>

              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0077b5] hover:bg-[#006097] text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs"
              >
                <Linkedin className="w-3.5 h-3.5 text-white" />
                <span>Share on LinkedIn</span>
              </a>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold tracking-wide transition-all"
                title="Copy permanent share link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Tags */}
        <div className="pt-6 border-t border-stone-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 mr-1">Filed under:</span>
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?search=${encodeURIComponent(tag)}`}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 rounded-md font-medium transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>

        {/* Complete Author Dossier & Credentials Card */}
        <section className="pt-10 mt-10 border-t border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              About the Author & Verified Credentials
            </h3>
            <Link
              href={`/author/${post.author.id}`}
              className="text-xs font-semibold text-amber-900 hover:underline flex items-center gap-1"
            >
              <span>View Historical Publications ({post.author.articleCount})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <AuthorProfileCard author={post.author} compact={false} />
        </section>

        {/* Related Articles Component (Suggests 3 similar posts based on tag overlap) */}
        {relatedPosts.length > 0 && (
          <section className="pt-10 mt-10 border-t border-stone-200 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-900 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                  <span>Suggested Research & Teardowns</span>
                </span>
                <h3 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
                  Related Articles & Technical Reviews
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <span>Matched via tags:</span>
                <span className="text-amber-900 font-semibold">
                  #{post.tags.slice(0, 2).join(', #')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => {
                const commonTags = related.tags.filter((t) => post.tags.includes(t));

                return (
                  <article
                    key={related.id}
                    className="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-stone-300 hover:shadow-md transition-all flex flex-col justify-between group shadow-2xs"
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <Link href={`/post/${related.slug}`} className="relative h-40 w-full bg-stone-900 overflow-hidden block">
                        <Image
                          src={related.coverImage && related.coverImage.trim() !== '' ? related.coverImage : '/images/folio-hero.jpeg'}
                          alt={related.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-stone-900/90 text-stone-100 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono border border-stone-700/50">
                            {related.format}
                          </span>
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="p-4 space-y-2.5 font-sans">
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="font-semibold text-amber-900">{related.category}</span>
                          <span className="font-mono text-stone-400">{related.readTime}</span>
                        </div>

                        <Link href={`/post/${related.slug}`} className="block">
                          <h4 className="font-serif font-bold text-stone-900 group-hover:text-amber-900 transition-colors text-base leading-snug line-clamp-2">
                            {related.title}
                          </h4>
                        </Link>

                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {related.summary}
                        </p>

                        {/* Matching Tags */}
                        {commonTags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {commonTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono bg-amber-50 text-amber-950 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between text-xs text-stone-600 font-sans">
                      <span className="font-medium text-stone-800 text-[11px]">
                        By {related.author.name}
                      </span>
                      <Link
                        href={`/post/${related.slug}`}
                        className="font-semibold text-amber-900 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Read Post</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Peer Discussion / Comments Section */}
        <section id="discussion" className="border-t border-stone-200 pt-12 mt-12 space-y-8 font-sans">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-bold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-800" />
              <span>Peer Discussion & Comments ({comments.length})</span>
            </h3>
            <span className="text-xs text-stone-500 font-mono">Moderated technical discourse</span>
          </div>

          {/* Comment submission form */}
          <form onSubmit={handlePostComment} className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Your Name and Role (e.g. Alex V., Systems Eng)"
                value={newCommentName}
                onChange={(e) => setNewCommentName(e.target.value)}
                className="bg-white border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            <textarea
              rows={3}
              required
              placeholder="Contribute technical insights, verify claims against your workloads, or critique the methodology..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg p-3 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed font-sans"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingComment ? 'Posting...' : 'Post Peer Note'}</span>
              </button>
            </div>
          </form>

          {/* Comments list */}
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="p-4 sm:p-5 rounded-xl bg-white border border-stone-200/90 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-bold text-xs">
                      {c.avatar}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-900 block leading-tight">{c.authorName}</span>
                      {c.authorRole && (
                        <span className="text-[11px] text-stone-500 block">{c.authorRole}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-stone-400 text-[11px] font-mono">{c.timestamp}</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 pl-9 leading-relaxed font-sans">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Non-intrusive bottom scroll newsletter signup popup */}
      <ArticleNewsletterPopup />

      <BlogFooter
        onCategorySelect={() => router.push('/')}
        onOpenWriteModal={() => router.push('/write')}
      />
    </div>
  );
}
