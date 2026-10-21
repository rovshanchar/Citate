/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Shuffle, X, Server } from 'lucide-react';
import { MoodCategory, MOOD_LABELS, Quote } from './types';
import { QuoteCard } from './components/QuoteCard';
import { QuoteComposerModal } from './components/QuoteComposerModal';
import { RandomSpotlightView } from './components/RandomSpotlightView';
import { VpsPortabilityModal } from './components/VpsPortabilityModal';

type NavTab = 'feed' | 'popular' | 'random' | 'bookmarks';

const AUTHOR_ID_KEY = 'golosa_ulits_author_id';
const LIKED_IDS_KEY = 'golosa_ulits_liked_ids';
const BOOKMARK_IDS_KEY = 'golosa_ulits_bookmark_ids';

function getOrCreateAuthorId(): string {
  try {
    const existing = localStorage.getItem(AUTHOR_ID_KEY);
    if (existing) return existing;
    const generated = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(AUTHOR_ID_KEY, generated);
    return generated;
  } catch {
    return 'anonymous-user';
  }
}

function loadStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('feed');
  const [selectedMood, setSelectedMood] = useState<MoodCategory | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [authorId] = useState<string>(() => getOrCreateAuthorId());
  const [likedIds, setLikedIds] = useState<string[]>(() => loadStringArray(LIKED_IDS_KEY));
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() =>
    loadStringArray(BOOKMARK_IDS_KEY)
  );

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isVpsModalOpen, setIsVpsModalOpen] = useState(false);
  const [randomQuoteId, setRandomQuoteId] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes');
      if (!res.ok) {
        throw new Error('Не удалось загрузить ленту цитат');
      }
      const data: Quote[] = await res.json();
      setQuotes(data);
      if (data.length > 0 && !randomQuoteId) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setRandomQuoteId(data[randomIndex].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }, [randomQuoteId]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_IDS_KEY, JSON.stringify(likedIds));
    } catch {
      // ignore
    }
  }, [likedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARK_IDS_KEY, JSON.stringify(bookmarkedIds));
    } catch {
      // ignore
    }
  }, [bookmarkedIds]);

  const pickRandomQuote = useCallback(() => {
    if (quotes.length === 0) return;
    if (quotes.length === 1) {
      setRandomQuoteId(quotes[0].id);
      return;
    }
    const candidates = quotes.filter((q) => q.id !== randomQuoteId);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomQuoteId(chosen.id);
  }, [quotes, randomQuoteId]);

  const handleOpenRandomTab = () => {
    pickRandomQuote();
    setActiveTab('random');
  };

  const handleSaveQuote = async (payload: {
    text: string;
    authorDescription: string;
    contextLocation: string;
    mood: MoodCategory;
  }) => {
    if (editingQuote) {
      const res = await fetch(`/api/quotes/${editingQuote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, authorId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Не удалось обновить цитату');
      }
      const updated: Quote = await res.json();
      setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setEditingQuote(null);
    } else {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, authorId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Не удалось опубликовать цитату');
      }
      const created: Quote = await res.json();
      setQuotes((prev) => [created, ...prev]);
      setActiveTab('feed');
    }
  };

  const handleToggleLike = async (id: string) => {
    const alreadyLiked = likedIds.includes(id);
    const delta = alreadyLiked ? -1 : 1;

    setLikedIds((prev) =>
      alreadyLiked ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setQuotes((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, likesCount: Math.max(0, q.likesCount + delta) } : q
      )
    );

    try {
      const res = await fetch(`/api/quotes/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (res.ok) {
        const updated: Quote = await res.json();
        setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
      }
    } catch {
      // optimistic UI fallback
    }
  };

  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}?authorId=${encodeURIComponent(authorId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const filteredQuotes = useMemo(() => {
    let list = [...quotes];

    if (activeTab === 'bookmarks') {
      list = list.filter((q) => bookmarkedIds.includes(q.id));
    }

    if (selectedMood !== 'all') {
      list = list.filter((q) => q.mood === selectedMood);
    }

    if (selectedLocation) {
      list = list.filter(
        (q) => q.contextLocation.toLowerCase() === selectedLocation.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const qLower = searchQuery.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.text.toLowerCase().includes(qLower) ||
          q.authorDescription.toLowerCase().includes(qLower) ||
          q.contextLocation.toLowerCase().includes(qLower)
      );
    }

    if (activeTab === 'popular') {
      list.sort((a, b) => b.likesCount - a.likesCount);
    } else {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [quotes, activeTab, bookmarkedIds, selectedMood, selectedLocation, searchQuery]);

  const spotlightRandomQuote = useMemo(() => {
    if (quotes.length === 0) return null;
    return quotes.find((q) => q.id === randomQuoteId) || quotes[0];
  }, [quotes, randomQuoteId]);

  const uniqueLocationsCount = useMemo(() => {
    return new Set(quotes.map((q) => q.contextLocation.toLowerCase())).size;
  }, [quotes]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
      {/* Mandatory 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#FAFAFA]/95 backdrop-blur-xs border-b border-zinc-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Brand Title (single text element) */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('feed');
              setSelectedMood('all');
              setSelectedLocation(null);
              setSearchQuery('');
            }}
            className="text-xl font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            Голоса Улиц
          </a>

          {/* Zone 2: 4 Single-line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'feed'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : ''
              }`}
            >
              Вся лента
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('popular')}
              className={`hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'popular'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : ''
              }`}
            >
              Популярное
            </button>
            <button
              type="button"
              onClick={handleOpenRandomTab}
              className={`hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'random'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : ''
              }`}
            >
              Случайная
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookmarks')}
              className={`hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'bookmarks'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : ''
              }`}
            >
              Закладки ({bookmarkedIds.length})
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingQuote(null);
                setIsComposerOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Записать цитату</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container (1440px desktop presence) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 sm:py-12">
        {/* Mobile Navigation Strip (visible only below md) */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-zinc-200/70 rounded-xl mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'feed' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
            }`}
          >
            Лента
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('popular')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'popular' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
            }`}
          >
            Популярное
          </button>
          <button
            type="button"
            onClick={handleOpenRandomTab}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'random' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
            }`}
          >
            Случайная
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'bookmarks' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
            }`}
          >
            Закладки ({bookmarkedIds.length})
          </button>
        </div>

        {activeTab === 'random' ? (
          <RandomSpotlightView
            quote={spotlightRandomQuote}
            onNextRandom={pickRandomQuote}
            onBackToFeed={() => setActiveTab('feed')}
            isLiked={spotlightRandomQuote ? likedIds.includes(spotlightRandomQuote.id) : false}
            isBookmarked={
              spotlightRandomQuote ? bookmarkedIds.includes(spotlightRandomQuote.id) : false
            }
            onToggleLike={handleToggleLike}
            onToggleBookmark={handleToggleBookmark}
          />
        ) : (
          <>
            {/* Editorial Intro & Quick Spotlight */}
            <section className="pb-8 sm:pb-10 border-b border-zinc-200/80">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                <div className="lg:col-span-8">
                  <p className="text-xs font-medium text-zinc-500 mb-3">
                    Публичная антология устной городской речи · Записано прохожими
                  </p>
                  <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-medium text-zinc-900 tracking-tight leading-[1.08] balance-text">
                    Великие мысли людей, чьих имён мы никогда не узнаем.
                  </h1>
                </div>

                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col justify-between gap-4 lg:items-end">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>
                      Записей в архиве:{' '}
                      <strong className="font-mono-num text-zinc-900">{quotes.length}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Локаций:{' '}
                      <strong className="font-mono-num text-zinc-900">
                        {uniqueLocationsCount}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenRandomTab}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Случайная цитата</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter & Search Toolbar */}
            <section className="py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Interactive Mood Filter Segmented Control */}
              <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedMood('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedMood === 'all'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Все настроения
                </button>
                {(Object.keys(MOOD_LABELS) as MoodCategory[]).map((moodKey) => (
                  <button
                    key={moodKey}
                    type="button"
                    onClick={() => setSelectedMood(moodKey)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedMood === moodKey
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {MOOD_LABELS[moodKey]}
                  </button>
                ))}
              </div>

              {/* Search Input & Active Location Filter */}
              <div className="flex items-center gap-3">
                {selectedLocation && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-700 bg-white border border-zinc-200 rounded-lg">
                    <span className="truncate max-w-44">Место: {selectedLocation}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedLocation(null)}
                      className="text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      aria-label="Сбросить фильтр места"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по словам, автору, месту..."
                    className="w-full pl-9 pr-8 py-2 text-xs text-zinc-900 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                      aria-label="Очистить поиск"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Quotes Bento / Editorial Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-56 bg-white border border-zinc-200/70 rounded-2xl p-6 animate-pulse flex flex-col justify-between"
                  >
                    <div className="h-3 w-1/3 bg-zinc-100 rounded" />
                    <div className="space-y-3">
                      <div className="h-5 w-full bg-zinc-100 rounded" />
                      <div className="h-5 w-4/5 bg-zinc-100 rounded" />
                    </div>
                    <div className="h-3 w-1/2 bg-zinc-100 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-16 text-center bg-white border border-zinc-200 rounded-2xl p-8">
                <p className="text-sm text-rose-600 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={fetchQuotes}
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  Попробовать снова
                </button>
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="py-20 text-center bg-white border border-zinc-200/80 rounded-2xl p-8">
                <p className="font-editorial text-2xl text-zinc-800 mb-2">
                  В этой выборке пока тихо
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
                  {activeTab === 'bookmarks'
                    ? 'Вы ещё не добавили ни одной цитаты в закладки. Нажмите на значок закладки на любой карточке, чтобы сохранить её.'
                    : 'Попробуйте изменить фильтр настроения, сбросить поисковый запрос или запишите новую услышанную фразу.'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {(selectedMood !== 'all' || selectedLocation || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMood('all');
                        setSelectedLocation(null);
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Сбросить все фильтры
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuote(null);
                      setIsComposerOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Записать первую фразу
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
                {filteredQuotes.map((quote, index) => {
                  const isFeatured =
                    index === 0 &&
                    activeTab === 'feed' &&
                    selectedMood === 'all' &&
                    !selectedLocation &&
                    !searchQuery;

                  return (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      featured={isFeatured}
                      isLiked={likedIds.includes(quote.id)}
                      isBookmarked={bookmarkedIds.includes(quote.id)}
                      isOwn={quote.authorId === authorId || quote.authorId === 'system-seed'}
                      onToggleLike={handleToggleLike}
                      onToggleBookmark={handleToggleBookmark}
                      onSelectLocation={(loc) => setSelectedLocation(loc)}
                      onSelectMood={(m) => setSelectedMood(m)}
                      onEdit={(q) => {
                        setEditingQuote(q);
                        setIsComposerOpen(true);
                      }}
                      onDelete={handleDeleteQuote}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Quiet Editorial Footer with Real User Actions (VPS Backup/Portability) */}
      <footer className="mt-16 border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            <span>Голоса Улиц — Архив прямой речи незнакомцев</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Автономное хранилище (Node.js + JSON DB)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsVpsModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-zinc-900 font-medium underline decoration-zinc-300 underline-offset-4 cursor-pointer"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Экспорт базы и перенос на VPS</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuoteComposerModal
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setEditingQuote(null);
        }}
        onSave={handleSaveQuote}
        editingQuote={editingQuote}
      />

      <VpsPortabilityModal
        isOpen={isVpsModalOpen}
        onClose={() => setIsVpsModalOpen(false)}
        quotes={quotes}
        onImportSuccess={(updatedQuotes) => {
          setQuotes(updatedQuotes);
        }}
      />
    </div>
  );
}
