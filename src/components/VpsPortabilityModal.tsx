import React, { useRef, useState } from 'react';
import { X, Download, Upload, Server, Check, Copy } from 'lucide-react';
import { Quote } from '../types';

interface VpsPortabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: Quote[];
  onImportSuccess: (updatedQuotes: Quote[], addedCount: number) => void;
}

export const VpsPortabilityModal: React.FC<VpsPortabilityModalProps> = ({
  isOpen,
  onClose,
  quotes,
  onImportSuccess,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `golosa-ulits-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportStatus(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.quotes;

      if (!Array.isArray(list)) {
        setImportError('Файл должен содержать JSON-массив цитат.');
        return;
      }

      const res = await fetch('/api/quotes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes: list }),
      });

      if (!res.ok) {
        throw new Error('Не удалось импортировать записи на сервер.');
      }

      const data = await res.json();
      onImportSuccess(data.quotes, data.addedCount);
      setImportStatus(`Добавлено новых записей: ${data.addedCount}. Всего в базе: ${data.total}.`);
    } catch (err: any) {
      setImportError(err?.message || 'Ошибка чтения JSON-файла.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const vpsCommands = `git clone <ваш-репозиторий> golosa-ulits
cd golosa-ulits
npm install
npm run build
NODE_ENV=production PORT=3000 npm start`;

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(vpsCommands);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl my-8">
        <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-zinc-800" />
            <h2 className="text-lg font-semibold text-zinc-900">
              Перенос на свой VPS и резервное копирование базы
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm text-zinc-600">
          <p className="leading-relaxed">
            Приложение полностью автономно и не зависит от внешних облачных баз. Все цитаты
            хранятся на сервере в файле <code className="font-mono-num text-xs bg-zinc-100 px-1.5 py-0.5 rounded">data/quotes.json</code>.
          </p>

          {/* Export / Import */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 text-xs mb-1">
                  1. Выгрузить базу цитат (JSON)
                </h3>
                <p className="text-xs text-zinc-500">
                  Скачайте все текущие записи ({quotes.length} шт.) одним файлом для переноса или бэкапа.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportJson}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать quotes.json</span>
              </button>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 text-xs mb-1">
                  2. Импортировать архив
                </h3>
                <p className="text-xs text-zinc-500">
                  Загрузите ранее сохранённый файл <code className="font-mono-num">quotes.json</code> на новом сервере.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Загрузить JSON в базу</span>
              </button>
            </div>
          </div>

          {importStatus && (
            <div className="px-4 py-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {importStatus}
            </div>
          )}

          {importError && (
            <div className="px-4 py-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {importError}
            </div>
          )}

          {/* VPS instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-900">
                Команды для запуска на любом VPS (Ubuntu / Debian + Node.js 20+):
              </span>
              <button
                type="button"
                onClick={handleCopyCommands}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Копировать</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-zinc-900 text-zinc-100 rounded-xl text-xs font-mono-num overflow-x-auto leading-relaxed">
              {vpsCommands}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
