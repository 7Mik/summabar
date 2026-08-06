const PENDING_PROMPT_KEY = 'summabar_pending_prompt';

interface PendingPromptData {
  text: string;
  timestamp: number;
  provider?: string;
}

function getPendingPrompt(): Promise<PendingPromptData | null> {
  return new Promise<PendingPromptData | null>(resolve => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        let resolved = false;
        const finish = (data: any) => {
          if (!resolved) {
            resolved = true;
            if (data && data[PENDING_PROMPT_KEY]) {
              resolve(data[PENDING_PROMPT_KEY] as PendingPromptData);
            } else {
              resolve(null);
            }
          }
        };

        const res: any = chrome.storage.local.get([PENDING_PROMPT_KEY], finish);
        if (res && typeof res.then === 'function') {
          res.then(finish).catch(() => finish(null));
        }
      } catch {
        resolve(null);
      }
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
    return;
  }

  // Rich textarea / contenteditable (Gemini, Claude, ChatGPT, etc.)
  // Select all existing content to ensure any prefilled draft is replaced
  try {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } catch {
    // Ignore selection errors
  }

  const normTarget = text.replace(/\s+/g, '');

  // 1. Try simulated ClipboardEvent 'paste' (Native handling for Gemini rich-textarea, ProseMirror, Quill)
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    });
    el.dispatchEvent(pasteEvent);
  } catch (e) {
    console.warn('[SummaBar Injector] Paste event simulation error:', e);
  }

  // Check if paste event successfully populated the element
  let normInserted = (el.textContent || '').replace(/\s+/g, '');
  if (normInserted.length >= normTarget.length * 0.8) {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // 2. Fallback to execCommand('insertText')
  try {
    document.execCommand('insertText', false, text);
  } catch {
    // Ignore execCommand error
  }

  // Check if execCommand successfully populated the element
  normInserted = (el.textContent || '').replace(/\s+/g, '');
  if (normInserted.length >= normTarget.length * 0.8) {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // 3. Final fallback: build structured HTML paragraphs line by line
  const lines = text.split('\n');
  el.innerHTML = '';
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line || '\u200B';
    el.appendChild(p);
  }

  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function autoInjectPrompt(): void {
  let promptRetries = 0;

  const attemptCheck = () => {
    getPendingPrompt().then(data => {
      if (!data || !data.text) {
        if (promptRetries < 5) {
          promptRetries++;
          setTimeout(attemptCheck, 250);
        }
        return;
      }

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
        'chat.deepseek.com': 'deepseek',
        'chatgpt.com': 'chatgpt',
        'www.chatgpt.com': 'chatgpt',
        'perplexity.ai': 'perplexity',
        'www.perplexity.ai': 'perplexity'
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

        // Candidate input elements across ChatGPT, Perplexity, Gemini, AI Studio, Claude, Mistral, Grok, DeepSeek
        const targetInput =
          // ChatGPT targets
          document.querySelector('#prompt-textarea') ||
          // Gemini & AI Studio targets
          document.querySelector('ms-prompt-input textarea') ||
          document.querySelector('rich-textarea div[contenteditable="true"]') ||
          document.querySelector('.input-area div[contenteditable="true"]') ||
          document.querySelector('.prompt-input textarea') ||
          // Claude & ProseMirror targets
          document.querySelector('.ProseMirror') ||
          // Mistral, Grok, DeepSeek, Perplexity & Generic targets
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
  };

  attemptCheck();
}

// Run auto-injection when page is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  autoInjectPrompt();
} else {
  window.addEventListener('DOMContentLoaded', autoInjectPrompt);
}
