'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Bookmark, GitBranch, FileText } from 'lucide-react';
import { BlogPost } from '@/lib/blog-data';

interface FeaturedArticleProps {
  post: BlogPost;
  isSaved: boolean;
  onToggleSave: (postId: string) => void;
}

export default function FeaturedArticle({
  post,
  isSaved,
  onToggleSave,
}: FeaturedArticleProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs hover:border-stone-300 transition-all group grid grid-cols-1 lg:grid-cols-12">
        {/* Cover Image side */}
        <Link 
          href={`/post/${post.slug}`} 
          className="lg:col-span-5 relative min-h-[260px] sm:min-h-[340px] bg-stone-900 overflow-hidden block"
        >
          <Image
            src={post.coverImage && post.coverImage.trim() !== '' ? post.coverImage : '/images/folio-hero.jpeg'}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-900/20 to-transparent" />
          
          <div className="absolute top-4 left-4">
            <span className="bg-amber-900/90 text-white text-xs font-semibold px-2.5 py-1 rounded-md tracking-wider uppercase backdrop-blur-xs font-sans">
              Featured Editorial
            </span>
          </div>

          {post.reviewedArtifact && (
            <div className="absolute bottom-4 left-4 right-4 bg-stone-900/80 backdrop-blur-md border border-stone-700/60 p-3 rounded-lg text-xs text-white space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
                {post.reviewedArtifact.type === 'github' ? (
                  <GitBranch className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>Reviewing: {post.reviewedArtifact.identifier}</span>
              </div>
              <div className="text-stone-300 text-[11px] line-clamp-1">
                {post.reviewedArtifact.meta}
              </div>
            </div>
          )}
        </Link>

        {/* Content Side */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6 font-sans">
          <div className="space-y-4">
            {/* Meta row */}
            <div className="flex items-center gap-2 text-xs text-stone-500 font-sans flex-wrap">
              <span className="font-semibold text-amber-900">{post.category}</span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-700 font-medium">{post.format}</span>
              <span aria-hidden="true">·</span>
              <span>{post.publishedAt}</span>
              <span aria-hidden="true">·</span>
              <span>{post.readTime}</span>
            </div>

            {/* Title & Subtitle */}
            <Link href={`/post/${post.slug}`} className="block group">
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors leading-tight">
                {post.title}
              </h2>
            </Link>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-sans">
              {post.subtitle}
            </p>

            {/* Key findings teaser */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 text-xs space-y-1.5">
              <span className="font-semibold text-stone-900 uppercase tracking-wider text-[11px] block">
                Key Takeaways:
              </span>
              <ul className="space-y-1 text-stone-700">
                {post.keyTakeaways.slice(0, 2).map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-800 font-bold">›</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Author Card & CTA Bottom Row */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
            <Link 
              href={`/author/${post.author.id}`}
              className="flex items-center gap-3 group/author hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-xs font-bold group-hover/author:bg-amber-900 transition-colors">
                {post.author.avatar}
              </div>
              <div>
                <span className="font-semibold text-stone-900 text-xs block group-hover/author:text-amber-900 transition-colors">
                  {post.author.name}
                </span>
                <span className="text-[11px] text-stone-500 block">
                  {post.author.role}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(post.id);
                }}
                className={`p-2 rounded-lg transition-colors border ${
                  isSaved
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save article'}
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>

              <Link
                href={`/post/${post.slug}`}
                className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
              >
                <span>Read Full Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
