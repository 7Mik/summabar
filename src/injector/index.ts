const PENDING_PROMPT_KEY = 'summabar_pending_prompt';

interface PendingPromptData {
  text: string;
  timestamp: number;
  provider?: string;
}

function getPendingPrompt(): Promise<PendingPromptData | null> {
  return new Promise<PendingPromptData | null>(resolve => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([PENDING_PROMPT_KEY], res => {
        if (res && res[PENDING_PROMPT_KEY]) {
          resolve(res[PENDING_PROMPT_KEY] as PendingPromptData);
        } else {
          resolve(null);
        }
      });
    } else {
      resolve(null);
    }
  });
}

function clearPendingPrompt(): void {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove([PENDING_PROMPT_KEY]);
  }
}

function injectTextIntoElement(el: HTMLElement, text: string): void {
  el.focus();

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    (el as HTMLInputElement).value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Rich textarea / contenteditable (Gemini, Claude, etc.)
    const paragraph = el.querySelector('p') || el;
    paragraph.textContent = text;
    
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function autoInjectPrompt(): void {
  getPendingPrompt().then(data => {
    if (!data || !data.text) return;

    // Check if prompt is less than 2 minutes old
    if (Date.now() - data.timestamp > 120000) {
      clearPendingPrompt();
      return;
    }

    const hostMap: Record<string, string> = {
      'gemini.google.com': 'gemini',
      'aistudio.google.com': 'aistudio',
      'claude.ai': 'claude',
      'chat.mistral.ai': 'mistral',
      'grok.com': 'grok',
      'x.ai': 'grok',
      'chat.deepseek.com': 'deepseek'
    };
    
    if (data.provider && hostMap[location.hostname] && data.provider !== hostMap[location.hostname]) {
      return;
    }

    // Clear from storage immediately to prevent cross-tab duplication
    clearPendingPrompt();

    console.log('[SummaBar Injector] Found pending prompt for AI provider:', location.hostname);

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;

      // Candidate input elements across Gemini, AI Studio, Claude, Mistral, Grok, DeepSeek
      const targetInput =
        // Gemini & AI Studio targets
        document.querySelector('ms-prompt-input textarea') ||
        document.querySelector('rich-textarea div[contenteditable="true"]') ||
        document.querySelector('.input-area div[contenteditable="true"]') ||
        document.querySelector('.prompt-input textarea') ||
        // Claude & ProseMirror targets
        document.querySelector('.ProseMirror') ||
        // Mistral, Grok, DeepSeek & Generic targets
        document.querySelector('textarea[placeholder*="Ask"]') ||
        document.querySelector('textarea[placeholder*="Message"]') ||
        document.querySelector('textarea[placeholder*="Chiedi"]') ||
        document.querySelector('main div[contenteditable="true"]') ||
        document.querySelector('main textarea');

      if (targetInput) {
        clearInterval(interval);
        console.log('[SummaBar Injector] Injecting prompt into input element:', targetInput);
        injectTextIntoElement(targetInput as HTMLElement, data.text);
      } else if (attempts >= 25) {
        clearInterval(interval);
        console.warn('[SummaBar Injector] Input element not found after retries.');
      }
    }, 400);
  });
}

// Run auto-injection when page is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  autoInjectPrompt();
} else {
  window.addEventListener('DOMContentLoaded', autoInjectPrompt);
}
