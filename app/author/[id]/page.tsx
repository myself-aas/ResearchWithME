'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  FileText, 
  GitBranch, 
  GraduationCap, 
  Heart, 
  MessageSquare, 
  Quote, 
  Search, 
  ShieldCheck, 
  SlidersHorizontal,
  Bookmark,
  Check,
  Building2,
  Lock,
  Sparkles
} from 'lucide-react';
import { Author, BlogPost, AUTHORS, INITIAL_BLOG_POSTS, BlogCategory } from '@/lib/blog-data';
import { useAuth } from '@/lib/auth-context';

export default function AuthorDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const authorId = params.id;
  const { user, hasAuthorPermissions } = useAuth();

  const [author, setAuthor] = useState<Author | null>(null);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [metrics, setMetrics] = useState<{
    totalArticles?: number;
    totalLikes?: number;
    totalComments?: number;
    reviewedArtifactsCount?: number;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search within author's archive
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'readTime'>('newest');

  // Bookmarks state
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rwm_saved_articles');
      if (stored) setSavedIds(JSON.parse(stored));
    } catch (e) {
      console.warn('Bookmarks load error:', e);
    }
  }, []);

  const toggleSaveArticle = (articleId: string) => {
    try {
      const exists = savedIds.includes(articleId);
      const next = exists ? savedIds.filter((id) => id !== articleId) : [...savedIds, articleId];
      setSavedIds(next);
      localStorage.setItem('rwm_saved_articles', JSON.stringify(next));
    } catch (e) {
      console.warn('Bookmarks save error:', e);
    }
  };

  useEffect(() => {
    async function loadAuthorData() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/authors/${encodeURIComponent(authorId)}`);
        if (res.ok) {
          const data = await res.json();
          setAuthor(data.author);
          setArticles(data.articles || []);
          setMetrics(data.metrics || {});
        } else {
          // Fallback to local data matching
          const localAuthor = AUTHORS[authorId] || Object.values(AUTHORS).find(
            (a) => a.id.toLowerCase() === authorId.toLowerCase() || a.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === authorId.toLowerCase()
          );
          if (localAuthor) {
            setAuthor(localAuthor);
            const matchingPosts = INITIAL_BLOG_POSTS.filter(
              (p) => p.author.id === localAuthor.id || p.author.name === localAuthor.name
            );
            setArticles(matchingPosts);
            setMetrics({
              totalArticles: matchingPosts.length,
              totalLikes: matchingPosts.reduce((acc, p) => acc + (p.likes || 0), 0),
              totalComments: matchingPosts.reduce((acc, p) => acc + (p.commentsCount || 0), 0),
              reviewedArtifactsCount: matchingPosts.filter((p) => p.reviewedArtifact).length,
            });
          } else {
            setError('Author profile not found');
          }
        }
      } catch (err) {
        console.warn('API error, using static fallback:', err);
        const localAuthor = AUTHORS[authorId];
        if (localAuthor) {
          setAuthor(localAuthor);
          const matchingPosts = INITIAL_BLOG_POSTS.filter((p) => p.author.id === localAuthor.id);
          setArticles(matchingPosts);
        } else {
          setError('Author profile not found');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAuthorData();
  }, [authorId]);

  // Filter & sort articles
  const filteredArticles = articles
    .filter((post) => {
      if (selectedCategory !== 'All' && post.category !== selectedCategory) return false;
      if (selectedFormat !== 'All' && post.format !== selectedFormat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(q) ||
          post.subtitle.toLowerCase().includes(q) ||
          post.summary.toLowerCase().includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q)) ||
          post.reviewedArtifact?.identifier.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
      if (sortBy === 'readTime') {
        const getMins = (str: string) => parseInt(str) || 0;
        return getMins(b.readTime) - getMins(a.readTime);
      }
      return 0; // maintain newest insertion order
    });

  const uniqueCategories = Array.from(new Set(articles.map((a) => a.category)));
  const uniqueFormats = Array.from(new Set(articles.map((a) => a.format)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
        <BlogHeader />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-16 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-stone-300 border-t-amber-900 animate-spin mx-auto"></div>
            <p className="text-sm text-stone-600 font-serif">
              Loading verified author dossier & publication archive...
            </p>
          </div>
        </main>
        <BlogFooter />
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
        <BlogHeader />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-16">
          <div className="bg-white border border-stone-200 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7 text-stone-400" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Author Not Found
            </h1>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              We couldn’t find an author profile matching ID <code className="bg-stone-100 px-2 py-0.5 rounded font-mono text-xs">{authorId}</code>. They may not have verified their credentials yet or the link is invalid.
            </p>
            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Publications Feed</span>
              </Link>
            </div>
          </div>
        </main>
        <BlogFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900">
      <BlogHeader savedCount={savedIds.length} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Publications</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Author Verification ID:</span>
            <span className="font-mono text-stone-700 bg-stone-200/60 px-2 py-0.5 rounded text-[11px]">
              {author.id}
            </span>
          </div>
        </div>

        {/* Complete Author Profile Card */}
        <AuthorProfileCard author={author} metrics={metrics} />

        {/* Editorial Policy & OAuth Requirement Notice */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-5 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-4 h-4 text-amber-900" />
            <span>ResearchWithMe Verified Author Policy</span>
          </div>
          <p className="text-stone-700 leading-relaxed font-serif">
            To preserve editorial rigor and eliminate unverified speculative content, only practitioners with authenticated <strong>ORCID</strong> (academic researchers), <strong>GitHub</strong> (core open-source maintainers), or <strong>Institutional/University domain email</strong> are authorized to publish articles and review artifacts. Readers logged in via standard Gmail have access to explore, comment, and save publications.
          </p>
          <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-amber-900">
            <span>Author status: <strong className="uppercase">Validated ({author.verifiedVia})</strong></span>
            <span>·</span>
            <span>Attested by: <strong>{author.verifiedTitle}</strong></span>
          </div>
        </div>

        {/* Author's Historical Publications Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Publication Archive & Reviews</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">
                Historical Articles by {author.name}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Displaying {filteredArticles.length} of {articles.length} published essays, teardowns, and peer reviews
              </p>
            </div>

            {/* Write Studio quick link if the current user has author rights */}
            <div className="flex items-center gap-2">
              <Link
                href="/write"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Submit / Draft Article</span>
              </Link>
            </div>
          </div>

          {/* Search & Filtering Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Internal Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={`Search among ${author.name}'s articles...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  <option value="All">All Categories ({articles.length})</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({articles.filter((a) => a.category === cat).length})
                    </option>
                  ))}
                </select>

                {/* Format Filter */}
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  <option value="All">All Formats</option>
                  {uniqueFormats.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  <option value="newest">Most Recent</option>
                  <option value="likes">Most Liked</option>
                  <option value="readTime">Longest Read</option>
                </select>
              </div>
            </div>
          </div>

          {/* Articles Feed */}
          {filteredArticles.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-4">
              <FileText className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                No articles match your filter criteria
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Try clearing search terms or selecting a different category to view this author&apos;s other published works.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedFormat('All');
                }}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((post) => {
                const isSaved = savedIds.includes(post.id);
                const safeCover = post.coverImage && post.coverImage.trim() !== '' ? post.coverImage.trim() : '/images/folio-code.jpeg';

                return (
                  <article
                    key={post.id}
                    className="bg-white border border-stone-200 rounded-xl p-5 sm:p-6 hover:border-stone-300 hover:shadow-xs transition-all flex flex-col md:flex-row gap-5"
                  >
                    {/* Cover thumbnail if available */}
                    <Link
                      href={`/post/${post.slug}`}
                      className="relative w-full md:w-48 h-32 md:h-auto rounded-lg overflow-hidden bg-stone-900 shrink-0 block group"
                    >
                      <Image
                        src={safeCover}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 192px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-white font-mono uppercase">
                        {post.format}
                      </div>
                    </Link>

                    {/* Article Details */}
                    <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 font-sans flex-wrap">
                          <span className="font-semibold text-amber-900">{post.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{post.publishedAt}</span>
                          <span aria-hidden="true">·</span>
                          <span>{post.readTime}</span>
                        </div>

                        <Link href={`/post/${post.slug}`} className="block group">
                          <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors leading-snug">
                            {post.title}
                          </h3>
                        </Link>

                        <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed font-sans">
                          {post.subtitle}
                        </p>
                      </div>

                      {/* Reviewed Artifact Tag if present */}
                      {post.reviewedArtifact && (
                        <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {post.reviewedArtifact.type === 'github' ? (
                              <GitBranch className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                            )}
                            <span className="font-mono text-stone-800 truncate text-[11px]">
                              {post.reviewedArtifact.identifier}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 shrink-0 truncate max-w-[180px]">
                            {post.reviewedArtifact.meta}
                          </span>
                        </div>
                      )}

                      {/* Bottom row: Key tags, stats, action buttons */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {post.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-stone-500">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600/20" />
                            <span>{post.likes || 0}</span>
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                            <span>{post.commentsCount || 0}</span>
                          </span>

                          <Link
                            href={`/cite?slug=${post.slug}`}
                            className="text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 transition-colors"
                            title="Generate Citation"
                          >
                            <Quote className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cite</span>
                          </Link>

                          <button
                            onClick={() => toggleSaveArticle(post.id)}
                            className={`p-1 rounded transition-colors ${
                              isSaved ? 'text-amber-900' : 'text-stone-400 hover:text-stone-700'
                            }`}
                            title={isSaved ? 'Saved to Reading List' : 'Save for later'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-900' : ''}`} />
                          </button>

                          <Link
                            href={`/post/${post.slug}`}
                            className="font-semibold text-amber-900 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Read Article</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
