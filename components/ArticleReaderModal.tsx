'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Bookmark, 
  Heart, 
  Share2, 
  Check, 
  GitBranch, 
  FileText, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  CornerDownRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { BlogPost } from '@/lib/blog-data';

interface ArticleReaderModalProps {
  post: BlogPost | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (postId: string) => void;
  onLikePost: (postId: string) => void;
}

interface UserComment {
  id: string;
  authorName: string;
  avatar: string;
  timestamp: string;
  text: string;
}

export default function ArticleReaderModal({
  post,
  onClose,
  isSaved,
  onToggleSave,
  onLikePost,
}: ArticleReaderModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (post) {
      router.push(`/post/${post.slug || post.id}`);
      onClose();
    }
  }, [post, onClose, router]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [comments, setComments] = useState<UserComment[]>([
    {
      id: 'c1',
      authorName: 'David K., Systems Eng',
      avatar: 'DK',
      timestamp: '2 days ago',
      text: 'Brilliant breakdown. The section explaining how contiguous KV cache allocation blocked concurrent requests was eye-opening. We observed the exact same memory exhaustion pattern on our internal vLLM cluster.',
    },
    {
      id: 'c2',
      authorName: 'Prof. Li Wei',
      avatar: 'LW',
      timestamp: '1 day ago',
      text: 'Great synthesis of the empirical trade-offs. Would love to see a follow-up benchmarking chunked prefill vs speculative decoding under varying context windows.',
    },
  ]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!post) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `/post/${post.slug}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const name = newCommentName.trim() || 'Reader';
    const initials = name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const created: UserComment = {
      id: 'comm-' + Date.now(),
      authorName: name,
      avatar: initials || 'RD',
      timestamp: 'Just now',
      text: newCommentText.trim(),
    };

    setComments((prev) => [created, ...prev]);
    setNewCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/65 backdrop-blur-xs flex justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-4xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 bg-stone-50/90 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs text-stone-600 truncate mr-4">
            <span className="font-semibold text-amber-900 shrink-0">{post.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{post.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onLikePost(post.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors"
              title="Clap / Like"
            >
              <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" />
              <span>{post.likes}</span>
            </button>

            <button
              onClick={() => onToggleSave(post.id)}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
              title={isSaved ? 'Saved in reading list' : 'Bookmark article'}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors ml-1"
              aria-label="Close article"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Article Body */}
        <div className="overflow-y-auto p-6 sm:p-12 space-y-8">
          {/* Header Metadata */}
          <div className="space-y-4 border-b border-stone-200 pb-8">
            <div className="flex items-center gap-2 text-xs text-stone-500 font-sans">
              <span className="font-semibold text-amber-900 uppercase tracking-wider">{post.format}</span>
              <span aria-hidden="true">·</span>
              <span>{post.category}</span>
              <span aria-hidden="true">·</span>
              <span>{post.publishedAt}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.readTime}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl lg:text-4xl font-bold text-stone-900 leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-stone-600 font-sans leading-relaxed">
              {post.subtitle}
            </p>

            {/* Author Profile Bar */}
            <div className="pt-3 flex items-center justify-between flex-wrap gap-4 bg-stone-50 border border-stone-200/80 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-sm font-bold shrink-0">
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
                    Domain Focus: {post.author.domain}
                  </div>
                </div>
              </div>

              {post.author.github && (
                <a
                  href={post.author.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>GitHub Profile</span>
                </a>
              )}
            </div>

            {/* Reviewed Artifact Box (if Paper Review or Repo Teardown) */}
            {post.reviewedArtifact && (
              <div className="bg-amber-50/50 border border-amber-900/20 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block font-mono">
                    Reviewed Artifact:
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
          </div>

          {/* Key Takeaways Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-3">
            <h3 className="font-serif text-base font-bold text-stone-900">
              Executive Summary & Key Takeaways
            </h3>
            <ul className="space-y-2 text-sm text-stone-700">
              {post.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-amber-800 font-bold font-mono">0{idx + 1}.</span>
                  <span className="leading-relaxed">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Full Narrative Content */}
          <div className="space-y-6 text-stone-800 font-sans text-base leading-relaxed">
            {post.content.map((paragraph, index) => (
              <p key={index} className="leading-8 text-stone-800 font-serif text-lg">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tags */}
          <div className="pt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500 mr-1">Filed under:</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Comments / Discussion Section */}
          <div className="border-t border-stone-200 pt-10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-800" />
                <span>Reader Discussion & Peer Notes ({comments.length})</span>
              </h3>
              <span className="text-xs text-stone-500">Moderated academic & technical comments</span>
            </div>

            {/* Comment Submission Form */}
            <form onSubmit={handleAddComment} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your Name / Handle (e.g. Dr. Jane Smith)"
                  value={newCommentName}
                  onChange={(e) => setNewCommentName(e.target.value)}
                  className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <textarea
                rows={3}
                required
                placeholder="Share technical feedback, ask a clarifying question about the paper/repo, or critique the methodology..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg p-3 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Peer Note</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-800 text-stone-100 flex items-center justify-center font-bold text-[10px]">
                        {comment.avatar}
                      </div>
                      <span className="font-semibold text-stone-900">{comment.authorName}</span>
                    </div>
                    <span className="text-stone-400 text-[11px]">{comment.timestamp}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 pl-8 leading-relaxed">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <div>
            Published on <span className="font-serif font-bold text-stone-800">ResearchWithMe</span> under CC BY 4.0.
          </div>
          <button
            onClick={onClose}
            className="text-stone-700 hover:text-stone-900 font-medium px-3 py-1 rounded-md hover:bg-stone-100 transition-colors"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
}
