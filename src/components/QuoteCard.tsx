import React, { useState } from 'react';
import { Heart, Bookmark, Copy, Check, Pencil, Trash2 } from 'lucide-react';
import { MOOD_LABELS, Quote } from '../types';

interface QuoteCardProps {
  quote: Quote;
  featured?: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  isOwn: boolean;
  onToggleLike: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onSelectLocation: (location: string) => void;
  onSelectMood: (mood: Quote['mood']) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (id: string) => void;
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'недавно';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'только что';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} дн назад`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  featured = false,
  isLiked,
  isBookmarked,
  isOwn,
  onToggleLike,
  onToggleBookmark,
  onSelectLocation,
  onSelectMood,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = async () => {
    const shareString = `«${quote.text}»\n— ${quote.authorDescription} (${quote.contextLocation})`;
    try {
      await navigator.clipboard.writeText(shareString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <article
      className={`group flex flex-col justify-between bg-white border border-zinc-200/90 rounded-2xl transition-colors hover:border-zinc-300 ${
        featured ? 'md:col-span-2 p-7 sm:p-9' : 'p-6 sm:p-7'
      }`}
    >
      <div>
        {/* Quiet 1-line text kicker with zero pill enclosures */}
        <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 mb-4">
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelectMood(quote.mood)}
              className="font-medium text-zinc-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {MOOD_LABELS[quote.mood]}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onSelectLocation(quote.contextLocation)}
              className="hover:text-zinc-900 transition-colors cursor-pointer text-left"
              title="Фильтровать по этому месту"
            >
              {quote.contextLocation}
            </button>
          </div>
          <time
            dateTime={quote.createdAt}
            className="font-mono-num text-zinc-400 shrink-0"
          >
            {formatRelativeDate(quote.createdAt)}
          </time>
        </div>

        {/* Expressive Editorial Quote Typography */}
        <blockquote
          className={`font-editorial text-zinc-900 leading-snug tracking-normal balance-text ${
            featured
              ? 'text-2xl sm:text-3xl md:text-4xl font-medium'
              : quote.text.length < 95
              ? 'text-2xl sm:text-3xl font-medium'
              : 'text-xl sm:text-2xl font-medium'
          }`}
        >
          «{quote.text}»
        </blockquote>
      </div>

      {/* Footer: Author Attribution & Interactive Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between gap-4">
        <div className="text-xs text-zinc-600 min-w-0">
          <span className="text-zinc-400 mr-1.5">—</span>
          <span className="font-medium text-zinc-800">{quote.authorDescription}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isOwn && (
            <>
              {confirmDelete ? (
                <div className="flex items-center gap-1 mr-1">
                  <button
                    type="button"
                    onClick={() => onDelete(quote.id)}
                    className="px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Удалить?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(quote)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
                    title="Редактировать запись"
                    aria-label="Редактировать запись"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Удалить запись"
                    aria-label="Удалить запись"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Скопировать цитату"
            aria-label="Скопировать цитату"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(quote.id)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isBookmarked
                ? 'text-blue-600 bg-blue-50/70'
                : 'text-zinc-400 hover:text-zinc-900'
            }`}
            title={isBookmarked ? 'Убрать из закладок' : 'Сохранить в закладки'}
            aria-label={isBookmarked ? 'Убрать из закладок' : 'Сохранить в закладки'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onToggleLike(quote.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isLiked
                ? 'text-rose-600 bg-rose-50/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Отметить понравившуюся фразу"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="font-mono-num">{quote.likesCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
