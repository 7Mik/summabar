export type LLMProvider = 
  | 'chatgpt' 
  | 'claude' 
  | 'gemini' 
  | 'deepseek' 
  | 'perplexity' 
  | 'custom';

export type SummaryType = 
  | 'concise' 
  | 'medium' 
  | 'extended' 
  | 'nested_bullet_points' 
  | 'timestamps';

export type AdsPreference = 'erase' | 'section' | 'keep';

export interface UserSettings {
  provider: LLMProvider;
  customUrl?: string;
  language: string; // e.g. 'it', 'en', 'es', 'fr', 'de'
  summaryType: SummaryType;
  adsPreference: AdsPreference;
  autoCopy: boolean;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface VideoComment {
  author: string;
  text: string;
  likeCount?: number;
  publishedTime?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  provider: 'chatgpt',
  customUrl: '',
  language: 'it',
  summaryType: 'medium',
  adsPreference: 'erase',
  autoCopy: true
};

export const SUPPORTED_LANGUAGES = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' }
];

export const PROVIDER_INFO: Record<LLMProvider, { name: string; url: string; icon: string }> = {
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q=',
    icon: '🤖'
  },
  claude: {
    name: 'Claude',
    url: 'https://claude.ai/new',
    icon: '🧠'
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com/app?q=',
    icon: '✨'
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    icon: '🐋'
  },
  perplexity: {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/?q=',
    icon: '🔍'
  },
  custom: {
    name: 'Custom Provider',
    url: '',
    icon: '⚙️'
  }
};
