'use client';

import React, { useState } from 'react';
import { 
  X, 
  PenSquare, 
  GitBranch, 
  FileText, 
  CheckCircle, 
  Eye, 
  Edit3,
  Sparkles,
  Send
} from 'lucide-react';
import { BlogPost, BlogCategory, ArticleFormat, CATEGORIES, AUTHORS, Author } from '@/lib/blog-data';

interface WriteArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishPost: (post: BlogPost) => void;
}

export default function WriteArticleModal({
  isOpen,
  onClose,
  onPublishPost,
}: WriteArticleModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('GitHub Repo Teardowns');
  const [format, setFormat] = useState<ArticleFormat>('Repo Teardown');
  const [selectedAuthorKey, setSelectedAuthorKey] = useState<string>('maya-lin');
  
  // Reviewed artifact fields
  const [hasReviewedArtifact, setHasReviewedArtifact] = useState(true);
  const [artifactType, setArtifactType] = useState<'github' | 'paper'>('github');
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactIdentifier, setArtifactIdentifier] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [artifactMeta, setArtifactMeta] = useState('');

  // Content
  const [summary, setSummary] = useState('');
  const [takeaway1, setTakeaway1] = useState('');
  const [takeaway2, setTakeaway2] = useState('');
  const [takeaway3, setTakeaway3] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [tags, setTags] = useState('Engineering, Open Source, Architecture');

  if (!isOpen) return null;

  const handleFormatChange = (newFormat: ArticleFormat) => {
    setFormat(newFormat);
    if (newFormat === 'Repo Teardown') {
      setHasReviewedArtifact(true);
      setArtifactType('github');
    } else if (newFormat === 'Paper Review') {
      setHasReviewedArtifact(true);
      setArtifactType('paper');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !fullContent.trim()) return;

    const author: Author = AUTHORS[selectedAuthorKey] || AUTHORS['maya-lin'];

    const newPost: BlogPost = {
      id: 'post-' + Date.now(),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      title: title.trim(),
      subtitle: subtitle.trim() || summary.slice(0, 120),
      category,
      format,
      author,
      publishedAt: 'Just now',
      readTime: '6 min read',
      coverImage: artifactType === 'github' ? '/images/folio-code.jpeg' : '/images/folio-hero.jpeg',
      featured: false,
      reviewedArtifact: hasReviewedArtifact && artifactIdentifier.trim() ? {
        type: artifactType,
        title: artifactTitle.trim() || artifactIdentifier.trim(),
        identifier: artifactIdentifier.trim(),
        url: artifactUrl.trim() || '#',
        meta: artifactMeta.trim() || (artifactType === 'github' ? 'GitHub Open Source' : 'Peer-reviewed literature'),
      } : undefined,
      summary: summary.trim(),
      content: fullContent
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
      keyTakeaways: [takeaway1, takeaway2, takeaway3].filter((t) => t.trim().length > 0),
      tags: tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
      likes: 1,
      commentsCount: 0,
    };

    onPublishPost(newPost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/65 backdrop-blur-xs flex justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
              <PenSquare className="w-5 h-5 text-amber-800" />
              <span>Writer & Reviewer Studio</span>
            </h3>
            <p className="text-xs text-stone-500">
              Publish domain breakdowns, GitHub repo teardowns, or scientific paper reviews
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch between edit & preview */}
            <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  <span>Editor</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'edit' ? (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-5 text-xs">
            {/* Title & Subtitle */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inside vLLM & PagedAttention: Why Memory Fragmentation Was Killing LLM Serving"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Subtitle / Analytical Hook
                </label>
                <input
                  type="text"
                  placeholder="A deep architectural code teardown of how virtual memory paging concepts solved KV cache bloat..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
            </div>

            {/* Category & Format Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BlogCategory)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Format *
                </label>
                <select
                  value={format}
                  onChange={(e) => handleFormatChange(e.target.value as ArticleFormat)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  <option value="Repo Teardown">GitHub Repo Teardown</option>
                  <option value="Paper Review">Research Paper Review</option>
                  <option value="Deep-Dive Essay">Deep-Dive Essay</option>
                  <option value="Field Notes">Field Notes</option>
                  <option value="Case Study">Case Study</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Author Profile
                </label>
                <select
                  value={selectedAuthorKey}
                  onChange={(e) => setSelectedAuthorKey(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  {Object.values(AUTHORS).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.domain.split(',')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reviewed Artifact Box (Conditional) */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-amber-800" />
                  <span>Reviewed Artifact Details (GitHub Repo or Paper DOI)</span>
                </span>
                <label className="flex items-center gap-1 text-[11px] text-stone-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasReviewedArtifact}
                    onChange={(e) => setHasReviewedArtifact(e.target.checked)}
                    className="rounded text-amber-800"
                  />
                  <span>Attach Artifact</span>
                </label>
              </div>

              {hasReviewedArtifact && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-0.5">
                      Identifier / Handle *
                    </label>
                    <input
                      type="text"
                      placeholder={artifactType === 'github' ? 'e.g. vllm-project/vllm' : 'e.g. arXiv:2501.12948'}
                      value={artifactIdentifier}
                      onChange={(e) => setArtifactIdentifier(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-600 mb-0.5">
                      Direct Web Link (URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/..."
                      value={artifactUrl}
                      onChange={(e) => setArtifactUrl(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-600 mb-0.5">
                      Full Artifact Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention"
                      value={artifactTitle}
                      onChange={(e) => setArtifactTitle(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-600 mb-0.5">
                      Stars, License, or Journal Metadata
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 44.8k Stars · Python / C++ · Apache-2.0"
                      value={artifactMeta}
                      onChange={(e) => setArtifactMeta(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Executive Abstract / Summary *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Brief summary of your review or essay (shown in feed cards)..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* Key Takeaways */}
            <div className="space-y-2">
              <label className="block font-semibold text-stone-800">
                Key Takeaways (Bullet points)
              </label>
              <input
                type="text"
                placeholder="Key takeaway 1..."
                value={takeaway1}
                onChange={(e) => setTakeaway1(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
              />
              <input
                type="text"
                placeholder="Key takeaway 2..."
                value={takeaway2}
                onChange={(e) => setTakeaway2(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
              />
              <input
                type="text"
                placeholder="Key takeaway 3..."
                value={takeaway3}
                onChange={(e) => setTakeaway3(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
              />
            </div>

            {/* Full Body */}
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Full Article Body (Separate paragraphs with double enter) *
              </label>
              <textarea
                required
                rows={7}
                placeholder="Write your analytical breakdown, code teardown, and empirical takeaways here..."
                value={fullContent}
                onChange={(e) => setFullContent(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-stone-900 font-serif leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 font-mono"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="text-stone-400">Post will publish directly to the live feed.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Article</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Preview Tab */
          <div className="p-8 space-y-6 overflow-y-auto">
            <div className="space-y-2 border-b border-stone-200 pb-4">
              <div className="text-xs text-stone-500">
                <span className="font-semibold text-amber-900">{category}</span> · {format} · By {AUTHORS[selectedAuthorKey]?.name}
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                {title || 'Untitled Post'}
              </h1>
              <p className="text-sm text-stone-600 font-serif italic">
                {subtitle}
              </p>
            </div>

            {hasReviewedArtifact && artifactIdentifier && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-amber-900">Reviewed Artifact: {artifactIdentifier}</span>
                <p className="text-stone-600">{artifactMeta}</p>
              </div>
            )}

            <div className="p-4 bg-stone-50 rounded-lg space-y-2 text-xs">
              <span className="font-bold text-stone-900 uppercase">Key Takeaways</span>
              <ul className="list-disc list-inside space-y-1 text-stone-700">
                {takeaway1 && <li>{takeaway1}</li>}
                {takeaway2 && <li>{takeaway2}</li>}
                {takeaway3 && <li>{takeaway3}</li>}
              </ul>
            </div>

            <div className="space-y-4 font-serif text-stone-800 text-sm leading-relaxed">
              {fullContent ? (
                fullContent.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))
              ) : (
                <p className="text-stone-400 italic">No content written yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
