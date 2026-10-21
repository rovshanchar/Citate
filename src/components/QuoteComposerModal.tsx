import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Check } from 'lucide-react';
import { MoodCategory, MOOD_LABELS, Quote } from '../types';

interface QuoteComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    text: string;
    authorDescription: string;
    contextLocation: string;
    mood: MoodCategory;
  }) => Promise<void>;
  editingQuote?: Quote | null;
}

const AUTHOR_PRESETS = [
  'Бариста в угловой кофейне',
  'Попутчик в вагоне метро',
  'Таксист на ночной смене',
  'Дама с маленькой собачкой',
  'Продавец в букинистическом',
];

const LOCATION_PRESETS = [
  'Очередь за утренним кофе',
  'Кольцевая линия метро, час пик',
  'Скамейка в осеннем парке',
  'Ночной автобус до окраины',
  'Пешеходный переход в дождь',
];

const DRAFT_STORAGE_KEY = 'golosa_ulits_draft_v1';

export const QuoteComposerModal: React.FC<QuoteComposerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingQuote,
}) => {
  const [text, setText] = useState('');
  const [authorDescription, setAuthorDescription] = useState('');
  const [contextLocation, setContextLocation] = useState('');
  const [mood, setMood] = useState<MoodCategory>(MoodCategory.PHILOSOPHY);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      return;
    }

    setFormError(null);
    setSpeechError(null);

    if (editingQuote) {
      setText(editingQuote.text);
      setAuthorDescription(editingQuote.authorDescription);
      setContextLocation(editingQuote.contextLocation);
      setMood(editingQuote.mood);
    } else {
      try {
        const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          setText(draft.text || '');
          setAuthorDescription(draft.authorDescription || '');
          setContextLocation(draft.contextLocation || '');
          setMood(draft.mood || MoodCategory.PHILOSOPHY);
        } else {
          setText('');
          setAuthorDescription('');
          setContextLocation('');
          setMood(MoodCategory.PHILOSOPHY);
        }
      } catch {
        setText('');
        setAuthorDescription('');
        setContextLocation('');
        setMood(MoodCategory.PHILOSOPHY);
      }
    }
  }, [isOpen, editingQuote]);

  useEffect(() => {
    if (isOpen && !editingQuote) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ text, authorDescription, contextLocation, mood })
        );
      } catch {
        // ignore storage quota errors
      }
    }
  }, [text, authorDescription, contextLocation, mood, isOpen, editingQuote]);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    setSpeechError(null);

    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechError(
        'Ваш браузер не поддерживает голосовой ввод Web Speech API. Пожалуйста, используйте Chrome, Safari или Edge.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ru-RU';
      recognition.interimResults = true;
      recognition.continuous = false;

      const baseText = text.trim();

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const cleaned = transcript.trim();
        if (cleaned) {
          const formatted =
            cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          setText(baseText ? `${baseText} ${formatted}` : formatted);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Доступ к микрофону запрещён. Разрешите использование микрофона в настройках браузера.');
        } else if (event.error !== 'aborted') {
          setSpeechError('Не удалось распознать речь. Попробуйте ещё раз или введите текст вручную.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechError('Не удалось запустить микрофон.');
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    stopListening();

    const trimmedText = text.trim();
    if (trimmedText.length < 3) {
      setFormError('Запишите хотя бы короткую фразу (минимум 3 символа).');
      return;
    }
    if (trimmedText.length > 600) {
      setFormError('Фраза слишком длинная (максимум 600 символов).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await onSave({
        text: trimmedText,
        authorDescription: authorDescription.trim() || 'Неизвестный прохожий',
        contextLocation: contextLocation.trim() || 'Где-то в городе',
        mood,
      });
      if (!editingQuote) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Ошибка при сохранении записи.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl my-8">
        <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold text-zinc-900 tracking-tight">
              {editingQuote ? 'Редактировать запись' : 'Зафиксировать услышанную фразу'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Сохраните прямую речь и атмосферу момента, пока она не забылась
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
            aria-label="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Quote Text + Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="quote-text" className="text-xs font-medium text-zinc-700">
                Прямая речь (цитата)
              </label>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Остановить запись речи...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-blue-600" />
                    <span>Надиктовать голосом</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <textarea
                id="quote-text"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="«Если вы не знаете, куда идёте, то хотя бы не идите так быстро...»"
                maxLength={600}
                className="w-full px-4 py-3.5 text-xl font-editorial leading-relaxed text-zinc-900 bg-zinc-50/70 border border-zinc-200 rounded-xl focus:outline-none focus:bg-white focus:border-zinc-900 transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-400">
                <span>
                  {isListening
                    ? 'Говорите в микрофон — слова появятся автоматически'
                    : 'Без кавычек — они добавятся автоматически при верстке'}
                </span>
                <span className="font-mono-num">{text.length} / 600</span>
              </div>
            </div>

            {speechError && (
              <p className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {speechError}
              </p>
            )}
          </div>

          {/* Author & Context Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="author-desc" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Кто это сказал (описание автора)
              </label>
              <input
                id="author-desc"
                type="text"
                value={authorDescription}
                onChange={(e) => setAuthorDescription(e.target.value)}
                placeholder="Например: Бариста в очках"
                maxLength={100}
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-zinc-50/70 border border-zinc-200 rounded-lg focus:outline-none focus:bg-white focus:border-zinc-900 transition-colors"
              />
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-400">
                <span>Примеры:</span>
                {AUTHOR_PRESETS.slice(0, 3).map((preset, idx) => (
                  <React.Fragment key={preset}>
                    <button
                      type="button"
                      onClick={() => setAuthorDescription(preset)}
                      className="text-zinc-600 hover:text-zinc-900 underline decoration-zinc-300 underline-offset-2 cursor-pointer"
                    >
                      {preset}
                    </button>
                    {idx < 2 && <span aria-hidden="true">·</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="context-loc" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Контекст и место (где услышано)
              </label>
              <input
                id="context-loc"
                type="text"
                value={contextLocation}
                onChange={(e) => setContextLocation(e.target.value)}
                placeholder="Например: Ночной поезд, вагон-ресторан"
                maxLength={120}
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-zinc-50/70 border border-zinc-200 rounded-lg focus:outline-none focus:bg-white focus:border-zinc-900 transition-colors"
              />
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-400">
                <span>Примеры:</span>
                {LOCATION_PRESETS.slice(0, 3).map((preset, idx) => (
                  <React.Fragment key={preset}>
                    <button
                      type="button"
                      onClick={() => setContextLocation(preset)}
                      className="text-zinc-600 hover:text-zinc-900 underline decoration-zinc-300 underline-offset-2 cursor-pointer"
                    >
                      {preset}
                    </button>
                    {idx < 2 && <span aria-hidden="true">·</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Mood Selection (Interactive Segmented Buttons) */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-2">
              Тональность и настроение
            </label>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-zinc-100 rounded-xl">
              {(Object.keys(MOOD_LABELS) as MoodCategory[]).map((key) => {
                const active = mood === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMood(key)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {MOOD_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <div className="px-4 py-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{editingQuote ? 'Сохранить изменения' : 'Опубликовать на стене'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
