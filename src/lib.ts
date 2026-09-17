import { useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(
    message: string,
    public data?: { image?: string },
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
    signal: options?.signal || AbortSignal.timeout(55000),
  });
  const content = await response
    .json()
    .catch(() => ({ error: '服务响应异常，请确认后端已启动。' }));
  if (!response.ok) throw new ApiError(content.error || '请求失败，请稍后重试。', content);
  return content as T;
}
export const money = (value: number) => value.toFixed(2);
export const post = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
});

interface RecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: { [key: number]: { [key: number]: { transcript: string } }; length: number };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionInstance;
  webkitSpeechRecognition?: new () => RecognitionInstance;
};
export function useSpeech(onResult: (text: string) => void, onError: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<RecognitionInstance | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.abort();
      }
      clearTimeout(timer.current);
    },
    [],
  );
  const toggle = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      onErrorRef.current('当前浏览器不支持语音输入，请用 Chrome / Edge，或直接输入文字。');
      return;
    }
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = 'zh-CN';
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (event) => onResultRef.current(event.results[0][0].transcript);
    instance.onerror = (event) =>
      onErrorRef.current(
        event.error === 'not-allowed'
          ? '麦克风权限未开启，请在浏览器地址栏允许使用麦克风。'
          : event.error === 'no-speech'
            ? '没有听清，请再说一次，或用文字输入。'
            : '语音服务暂时不可用，请检查网络或改用文字输入。',
      );
    instance.onend = () => {
      setListening(false);
      clearTimeout(timer.current);
    };
    try {
      instance.start();
      setListening(true);
      timer.current = setTimeout(() => instance.stop(), 20000);
    } catch {
      onErrorRef.current('语音输入未能启动，请稍后重试。');
      setListening(false);
    }
  };
  return { listening, toggle };
}

export function parseSpokenPrice(text: string): number | null {
  const number = text.match(/\d+(?:\.\d+)?/);
  if (number) return Number(number[0]);
  const digits: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  const found = text.match(
    /([零一二两三四五六七八九十百]+)(?:元|块|点)?([零一二两三四五六七八九])?/,
  );
  if (!found) return null;
  let result = 0;
  let current = 0;
  for (const char of found[1]) {
    if (char === '十' || char === '百') {
      result += (current || 1) * (char === '十' ? 10 : 100);
      current = 0;
    } else current = digits[char];
  }
  return result + current + (found[2] ? digits[found[2]] / 10 : 0);
}
