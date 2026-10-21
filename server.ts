import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'quotes.json');

interface QuoteRecord {
  id: string;
  text: string;
  authorDescription: string;
  contextLocation: string;
  mood: 'philosophy' | 'humor' | 'absurd' | 'melancholy' | 'wisdom' | 'everyday';
  likesCount: number;
  createdAt: string;
  authorId: string;
}

const INITIAL_QUOTES: QuoteRecord[] = [
  {
    id: 'q-101',
    text: 'Если вы не знаете, куда идёте, то хотя бы не идите так быстро — людям вокруг тревожно.',
    authorDescription: 'Мужчина в твидовом пальто с таксой',
    contextLocation: 'Пешеходный переход на Тверской, 08:40',
    mood: 'philosophy',
    likesCount: 42,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-102',
    text: 'У меня нет плана Б, у меня и план А-то написан карандашом на чеке из Пятёрочки.',
    authorDescription: 'Девушка с большим тубусом для чертежей',
    contextLocation: 'Очередь за фильтр-кофе на Покровке',
    mood: 'humor',
    likesCount: 68,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-103',
    text: 'Взрослая жизнь — это когда ты покупаешь красивый блокнот и боишься испортить первую страницу следующие четыре года.',
    authorDescription: 'Продавец в книжном магазине',
    contextLocation: 'Отдел канцелярии, дождливый вечер',
    mood: 'everyday',
    likesCount: 53,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-104',
    text: 'Счастье — оно как хороший трамвай: ждёшь сорок минут на ветру, а потом приходят сразу три, но тебе уже пешком ближе.',
    authorDescription: 'Пожилой часовщик в очках с толстой оправой',
    contextLocation: 'Трамвайная остановка у Чистых прудов',
    mood: 'wisdom',
    likesCount: 91,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-105',
    text: 'Я ему говорю: «Ты мне душу не трави», а он мне: «Это не душа, это у тебя просто гемоглобин низкий и октябрь».',
    authorDescription: 'Женщина в ярко-желтом шарфе по телефону',
    contextLocation: 'Вагон метро на Кольцевой линии',
    mood: 'melancholy',
    likesCount: 37,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-106',
    text: 'Кот не может быть виноват. Даже если ваза упала в закрытой комнате, значит, у вазы просто закончился срок годности гравитации.',
    authorDescription: 'Мальчик лет восьми в резиновых сапогах',
    contextLocation: 'Ветеринарная клиника, зал ожидания',
    mood: 'absurd',
    likesCount: 84,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-107',
    text: 'Никогда не спорь с человеком, который пьёт эспрессо в одиннадцать вечера. Ему уже нечего терять, даже сон.',
    authorDescription: 'Уставший бариста в конце смены',
    contextLocation: 'Ночная кофейня у вокзала',
    mood: 'humor',
    likesCount: 49,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 64).toISOString(),
    authorId: 'system-seed',
  },
  {
    id: 'q-108',
    text: 'Все хотят уехать к морю, но никто не хочет сначала побыть тихим берегом для самого себя.',
    authorDescription: 'Попутчик у окна с термосом чая',
    contextLocation: 'Ночной поезд Москва — Санкт-Петербург',
    mood: 'philosophy',
    likesCount: 62,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 78).toISOString(),
    authorId: 'system-seed',
  },
];

function ensureDb(): QuoteRecord[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_QUOTES, null, 2), 'utf-8');
    return INITIAL_QUOTES;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_QUOTES;
  } catch {
    return INITIAL_QUOTES;
  }
}

function saveDb(quotes: QuoteRecord[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(quotes, null, 2), 'utf-8');
}

const VALID_MOODS = ['philosophy', 'humor', 'absurd', 'melancholy', 'wisdom', 'everyday'];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // GET /api/quotes - получить все цитаты
  app.get('/api/quotes', (_req, res) => {
    const quotes = ensureDb();
    res.json(quotes);
  });

  // POST /api/quotes - добавить новую цитату
  app.post('/api/quotes', (req, res) => {
    const { text, authorDescription, contextLocation, mood, authorId } = req.body || {};

    const cleanText = typeof text === 'string' ? text.trim() : '';
    const cleanAuthor = typeof authorDescription === 'string' ? authorDescription.trim() : '';
    const cleanContext = typeof contextLocation === 'string' ? contextLocation.trim() : '';
    const cleanMood = VALID_MOODS.includes(mood) ? mood : 'everyday';
    const cleanAuthorId = typeof authorId === 'string' && authorId.trim() ? authorId.trim() : 'anonymous';

    if (cleanText.length < 3 || cleanText.length > 600) {
      res.status(400).json({ error: 'Текст цитаты должен содержать от 3 до 600 символов.' });
      return;
    }

    const quotes = ensureDb();
    const newQuote: QuoteRecord = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: cleanText,
      authorDescription: (cleanAuthor || 'Неизвестный прохожий').slice(0, 100),
      contextLocation: (cleanContext || 'Где-то в городе').slice(0, 120),
      mood: cleanMood,
      likesCount: 0,
      createdAt: new Date().toISOString(),
      authorId: cleanAuthorId,
    };

    quotes.unshift(newQuote);
    saveDb(quotes);
    res.status(201).json(newQuote);
  });

  // PUT /api/quotes/:id - редактировать свою цитату
  app.put('/api/quotes/:id', (req, res) => {
    const { id } = req.params;
    const { text, authorDescription, contextLocation, mood, authorId } = req.body || {};

    const quotes = ensureDb();
    const index = quotes.findIndex((q) => q.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Цитата не найдена.' });
      return;
    }

    const existing = quotes[index];
    if (existing.authorId !== 'system-seed' && existing.authorId !== authorId) {
      res.status(403).json({ error: 'Вы можете редактировать только свои записи.' });
      return;
    }

    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (cleanText.length < 3 || cleanText.length > 600) {
      res.status(400).json({ error: 'Текст цитаты должен содержать от 3 до 600 символов.' });
      return;
    }

    const updated: QuoteRecord = {
      ...existing,
      text: cleanText,
      authorDescription: (typeof authorDescription === 'string' && authorDescription.trim()
        ? authorDescription.trim()
        : existing.authorDescription).slice(0, 100),
      contextLocation: (typeof contextLocation === 'string' && contextLocation.trim()
        ? contextLocation.trim()
        : existing.contextLocation).slice(0, 120),
      mood: VALID_MOODS.includes(mood) ? mood : existing.mood,
    };

    quotes[index] = updated;
    saveDb(quotes);
    res.json(updated);
  });

  // POST /api/quotes/:id/like - поставить или убрать лайк
  app.post('/api/quotes/:id/like', (req, res) => {
    const { id } = req.params;
    const { delta } = req.body || {};
    const step = delta === -1 ? -1 : 1;

    const quotes = ensureDb();
    const index = quotes.findIndex((q) => q.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Цитата не найдена.' });
      return;
    }

    quotes[index].likesCount = Math.max(0, quotes[index].likesCount + step);
    saveDb(quotes);
    res.json(quotes[index]);
  });

  // DELETE /api/quotes/:id - удалить свою цитату
  app.delete('/api/quotes/:id', (req, res) => {
    const { id } = req.params;
    const authorId = req.query.authorId as string | undefined;

    const quotes = ensureDb();
    const index = quotes.findIndex((q) => q.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Цитата не найдена.' });
      return;
    }

    const existing = quotes[index];
    if (existing.authorId !== authorId && existing.authorId !== 'system-seed') {
      res.status(403).json({ error: 'Можно удалять только собственные записи.' });
      return;
    }

    quotes.splice(index, 1);
    saveDb(quotes);
    res.json({ success: true, id });
  });

  // POST /api/quotes/import - импорт JSON-коллекции при переносе на VPS
  app.post('/api/quotes/import', (req, res) => {
    const { quotes: imported } = req.body || {};
    if (!Array.isArray(imported)) {
      res.status(400).json({ error: 'Некорректный формат файла импорта.' });
      return;
    }

    const current = ensureDb();
    const existingIds = new Set(current.map((q) => q.id));
    let addedCount = 0;

    for (const item of imported) {
      if (item && typeof item.text === 'string' && item.text.trim().length >= 3) {
        const id = typeof item.id === 'string' && !existingIds.has(item.id)
          ? item.id
          : `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        existingIds.add(id);
        current.unshift({
          id,
          text: item.text.trim().slice(0, 600),
          authorDescription: (typeof item.authorDescription === 'string' ? item.authorDescription.trim() : 'Неизвестный прохожий').slice(0, 100),
          contextLocation: (typeof item.contextLocation === 'string' ? item.contextLocation.trim() : 'Где-то в городе').slice(0, 120),
          mood: VALID_MOODS.includes(item.mood) ? item.mood : 'everyday',
          likesCount: typeof item.likesCount === 'number' ? Math.max(0, item.likesCount) : 0,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          authorId: typeof item.authorId === 'string' ? item.authorId : 'imported',
        });
        addedCount++;
      }
    }

    saveDb(current);
    res.json({ addedCount, total: current.length, quotes: current });
  });

  // Vite middleware в режиме разработки или раздача статики в production на VPS
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
