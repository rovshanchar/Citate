import React, { useEffect } from 'react';
import { Shuffle, Heart, Bookmark, ArrowLeft } from 'lucide-react';
import { MOOD_LABELS, Quote } from '../types';
import { formatRelativeDate } from './QuoteCard';

interface RandomSpotlightViewProps {
  quote: Quote | null;
  onNextRandom: () => void;
  onBackToFeed: () => void;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

export const RandomSpotlightView: React.FC<RandomSpotlightViewProps> = ({
  quote,
  onNextRandom,
  onBackToFeed,
  isLiked,
  isBookmarked,
  onToggleLike,
  onToggleBookmark,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        onNextRandom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextRandom]);

  if (!quote) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500 text-sm">В архиве пока нет записей для случайного выбора.</p>
      </div>
    );
  }

  return (
    <section className="py-8 sm:py-14 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBackToFeed}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться ко всей стене</span>
        </button>
        <span className="text-xs text-zinc-400 hidden sm:inline">
          Нажмите «Пробел» для следующей случайной фразы
        </span>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-14 md:p-16">
        <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-500 mb-8">
          <span className="font-medium text-zinc-800">{MOOD_LABELS[quote.mood]}</span>
          <span aria-hidden="true">·</span>
          <span>{quote.contextLocation}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num text-zinc-400">
            {formatRelativeDate(quote.createdAt)}
          </span>
        </div>

        <blockquote className="font-editorial text-3xl sm:text-4xl md:text-5xl font-medium text-zinc-900 leading-tight balance-text">
          «{quote.text}»
        </blockquote>

        <div className="mt-10 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="text-sm text-zinc-600">
            <span className="text-zinc-400 mr-2">—</span>
            <span className="font-semibold text-zinc-900">{quote.authorDescription}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleBookmark(quote.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isBookmarked
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{isBookmarked ? 'В закладках' : 'В закладки'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleLike(quote.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isLiked
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-mono-num">{quote.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={onNextRandom}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Ещё одна случайность</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
