import { UserSettings, PROVIDER_INFO } from '../types';

/**
 * Copies prompt to user's clipboard and opens a new tab with the target LLM provider.
 */
export async function openLLMProviderWithPrompt(promptText: string, settings: UserSettings): Promise<{ copied: boolean; providerName: string }> {
  let copied = false;

  // 1. Copy to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(promptText);
      copied = true;
    } else {
      // Fallback text area copy
      const textArea = document.createElement('textarea');
      textArea.value = promptText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.warn('[SummaBar] Clipboard write failed or blocked:', err);
  }

  // 2. Determine target URL
  let targetUrl = '';
  let providerName = '';

  if (settings.provider === 'custom' && settings.customUrl) {
    targetUrl = settings.customUrl;
    providerName = 'Custom LLM';
    if (targetUrl.includes('{prompt}')) {
      targetUrl = targetUrl.replace('{prompt}', encodeURIComponent(promptText));
    }
  } else {
    const info = PROVIDER_INFO[settings.provider] || PROVIDER_INFO.chatgpt;
    providerName = info.name;

    switch (settings.provider) {
      case 'chatgpt':
        // ChatGPT accepts query param ?q=
        targetUrl = `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`;
        break;
      case 'perplexity':
        // Perplexity accepts query param ?q=
        targetUrl = `https://www.perplexity.ai/?q=${encodeURIComponent(promptText)}`;
        break;
      case 'gemini':
        // Gemini supports query param or direct deep link
        targetUrl = `https://gemini.google.com/app?q=${encodeURIComponent(promptText)}`;
        break;
      case 'claude':
        // Claude works best via clipboard + direct new conversation
        targetUrl = 'https://claude.ai/new';
        break;
      case 'deepseek':
        // DeepSeek chat interface
        targetUrl = 'https://chat.deepseek.com/';
        break;
      default:
        targetUrl = `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`;
        break;
    }
  }

  // 3. Open target URL in a new tab
  window.open(targetUrl, '_blank');

  return { copied, providerName };
}
