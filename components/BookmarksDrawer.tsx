'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bookmark, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import { BlogPost } from '@/lib/blog-data';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedPosts: BlogPost[];
  onRemoveBookmark: (postId: string) => void;
  onReadPost: (post: BlogPost) => void;
}

export default function BookmarksDrawer({
  isOpen,
  onClose,
  savedPosts,
  onRemoveBookmark,
  onReadPost,
}: BookmarksDrawerProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      router.push('/bookmarks');
      onClose();
    }
  }, [isOpen, onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex justify-end">
      <div 
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between font-sans border-l border-stone-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-900 fill-amber-900" />
            <h3 className="font-serif font-bold text-base text-stone-900">
              Saved Articles ({savedPosts.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {savedPosts.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <Bookmark className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-800">Your reading list is empty</p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Bookmark interesting repo teardowns or paper reviews to save them for later reading.
              </p>
            </div>
          ) : (
            savedPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors space-y-2 group"
              >
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-semibold text-amber-900">{post.category}</span>
                  <span>{post.readTime}</span>
                </div>

                <h4
                  onClick={() => {
                    onReadPost(post);
                    onClose();
                  }}
                  className="font-serif text-sm font-bold text-stone-900 group-hover:text-amber-900 transition-colors cursor-pointer leading-snug line-clamp-2"
                >
                  {post.title}
                </h4>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-stone-100">
                  <span className="text-stone-600 text-[11px]">By {post.author.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemoveBookmark(post.id)}
                      className="p-1 text-stone-400 hover:text-red-700 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onReadPost(post);
                        onClose();
                      }}
                      className="text-amber-900 font-medium text-xs hover:underline flex items-center gap-0.5"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Saved locally in session</span>
          <button
            onClick={onClose}
            className="text-stone-800 font-medium hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
