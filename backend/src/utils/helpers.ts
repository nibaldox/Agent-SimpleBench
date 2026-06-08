import { ChatMessage } from '../models/types';

export function summarizeHistory(
  history: ChatMessage[],
  keepLast: number = 6,
  maxChars: number = 1200
): ChatMessage[] {
  if (history.length <= keepLast) {
    return history;
  }

  const older = history.slice(0, -keepLast);
  const recent = history.slice(-keepLast);

  const summaryText = older
    .map(m => `${m.role}: ${m.content || ''}`)
    .join(' | ');

  const truncatedSummary = summaryText.length > maxChars
    ? summaryText.substring(0, maxChars) + '…'
    : summaryText;

  const summaryMsg: ChatMessage = {
    role: 'system',
    content: `Context summary: ${truncatedSummary}`
  };

  return [summaryMsg, ...recent];
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.floor(text.length / 4));
}

export const languageInstructions: Record<string, string> = {
  english: 'Respond in English.',
  spanish: 'Responde en español.',
  french: 'Répondez en français.',
  german: 'Antworten Sie auf Deutsch.',
  italian: 'Rispondi in italiano.',
  portuguese: 'Responda em português.',
  dutch: 'Antwoord in het Nederlands.',
  polish: 'Odpowiedz po polsku.',
  turkish: 'Türkçe cevap verin.',
  swedish: 'Svara på svenska.',
  arabic: 'أجب باللغة العربية.',
  hindi: 'हिन्दी में उत्तर दें।',
  chinese: '请用中文回答。',
  japanese: '日本語で答えてください.',
  korean: '한국어로 답변해 주세요.',
  russian: 'Отвечайте на русском языке.',
  greek: 'Απαντήστε στα ελληνικά.',
  danish: 'Svar på dansk.',
  norwegian: 'Svar på norsk.',
  finnish: 'Vastaa suomeksi.'
};
