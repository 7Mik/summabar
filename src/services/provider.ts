import { UserSettings, PROVIDER_INFO } from '../types';

/**
 * Copies prompt to user's clipboard and opens a new tab with the target LLM provider.
 */
export async function openLLMProviderWithPrompt(
  promptText: string, 
  settings: UserSettings
): Promise<{ copied: boolean; providerName: string; viaClipboard: boolean; copyOnly: boolean }> {
  let copied = false;

  // 1. Copy prompt to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(promptText);
      copied = true;
    } else {
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

  // If user selected 'clipboard' only, do not open any tab
  if (settings.provider === 'clipboard') {
    return { copied, providerName: 'Clipboard', viaClipboard: true, copyOnly: true };
  }

  // 2. Determine target URL and mode
  let targetUrl = '';
  let providerName = '';
  let viaClipboard = false;

  if (settings.provider === 'custom' && settings.customUrl) {
    targetUrl = settings.customUrl;
    providerName = 'Custom LLM';
    if (targetUrl.includes('{prompt}')) {
      targetUrl = targetUrl.replace('{prompt}', encodeURIComponent(promptText));
    } else {
      viaClipboard = true;
    }
  } else {
    const info = PROVIDER_INFO[settings.provider] || PROVIDER_INFO.chatgpt;
    providerName = info.name;

    switch (settings.provider) {
      case 'chatgpt':
        targetUrl = `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`;
        break;
      case 'perplexity':
        targetUrl = `https://www.perplexity.ai/?q=${encodeURIComponent(promptText)}`;
        break;
      case 'gemini':
        targetUrl = 'https://gemini.google.com/app';
        viaClipboard = true;
        break;
      case 'aistudio':
        targetUrl = 'https://aistudio.google.com/prompts/new_chat';
        viaClipboard = true;
        break;
      case 'mistral':
        targetUrl = 'https://chat.mistral.ai/chat';
        viaClipboard = true;
        break;
      case 'grok':
        targetUrl = 'https://grok.com/';
        viaClipboard = true;
        break;
      case 'claude':
        targetUrl = 'https://claude.ai/new';
        viaClipboard = true;
        break;
      case 'deepseek':
        targetUrl = 'https://chat.deepseek.com/';
        viaClipboard = true;
        break;
      default:
        targetUrl = `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`;
        break;
    }
  }

  // 3. Save pending prompt to storage for auto-injector content script
  const autoInjectProviders = ['gemini', 'aistudio', 'claude', 'mistral', 'grok', 'deepseek'];
  if (autoInjectProviders.includes(settings.provider)) {
    const pendingData = { text: promptText, timestamp: Date.now(), provider: settings.provider };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          const res: any = chrome.storage.local.set({ summabar_pending_prompt: pendingData }, done);
          if (res && typeof res.then === 'function') {
            res.then(done);
          }
          setTimeout(done, 500);
        });
        // Failsafe cleanup if injector never runs
        setTimeout(() => {
          chrome.storage.local.remove(['summabar_pending_prompt']);
        }, 120000);
      } catch (err) {
        console.warn('[SummaBar] Error setting pending prompt:', err);
      }
    }
  }

  // 4. Open target URL in a new tab
  window.open(targetUrl, '_blank');

  return { copied, providerName, viaClipboard, copyOnly: false };
}
