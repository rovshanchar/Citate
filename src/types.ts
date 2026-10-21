export enum MoodCategory {
  PHILOSOPHY = 'philosophy',
  HUMOR = 'humor',
  ABSURD = 'absurd',
  MELANCHOLY = 'melancholy',
  WISDOM = 'wisdom',
  EVERYDAY = 'everyday',
}

export interface Quote {
  id: string;
  text: string;
  authorDescription: string;
  contextLocation: string;
  mood: MoodCategory;
  likesCount: number;
  createdAt: string;
  authorId: string;
}

export interface CreateQuotePayload {
  text: string;
  authorDescription: string;
  contextLocation: string;
  mood: MoodCategory;
  authorId: string;
}

export interface UpdateQuotePayload {
  text: string;
  authorDescription: string;
  contextLocation: string;
  mood: MoodCategory;
  authorId: string;
}

export const MOOD_LABELS: Record<MoodCategory, string> = {
  [MoodCategory.PHILOSOPHY]: 'Философия',
  [MoodCategory.HUMOR]: 'Юмор',
  [MoodCategory.ABSURD]: 'Абсурд',
  [MoodCategory.MELANCHOLY]: 'Грусть',
  [MoodCategory.WISDOM]: 'Мудрость',
  [MoodCategory.EVERYDAY]: 'Жизнь',
};
