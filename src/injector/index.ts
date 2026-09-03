const PENDING_PROMPT_KEY = 'summabar_pending_prompt';

function getProviderForHost(hostname: string): string | null {
  const host = (hostname || '').toLowerCase();
  
  if (host === 'gemini.google.com') return 'gemini';
  if (host === 'aistudio.google.com') return 'aistudio';
  if (host === 'claude.ai' || host.endsWith('.claude.ai')) return 'claude';
  if (host === 'chat.mistral.ai' || host.endsWith('.mistral.ai')) return 'mistral';
  if (host === 'grok.com' || host === 'x.ai' || host.endsWith('.grok.com') || host.endsWith('.x.ai')) return 'grok';
  if (host === 'chat.deepseek.com' || host.endsWith('.deepseek.com')) return 'deepseek';
  if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) return 'chatgpt';
  if (host === 'perplexity.ai' || host.endsWith('.perplexity.ai')) return 'perplexity';

  return null;
}

interface PendingPromptData {
  text: string;
  timestamp: number;
  provider?: string;
}

function clearPendingPrompt(): void {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove([PENDING_PROMPT_KEY]);
  }
}

function getPendingPromptAndClaim(): Promise<PendingPromptData | null> {
  return new Promise<PendingPromptData | null>(resolve => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        let resolved = false;
        const finish = (data: any) => {
          if (!resolved) {
            resolved = true;
            if (data && data[PENDING_PROMPT_KEY]) {
              const pending = data[PENDING_PROMPT_KEY] as PendingPromptData;

              // 1. If prompt is expired (> 2 min), clean up storage and ignore
              if (Date.now() - pending.timestamp > 120000) {
                clearPendingPrompt();
                resolve(null);
                return;
              }

              // 2. Validate provider matching BEFORE claiming/removing from storage
              const currentProvider = getProviderForHost(location.hostname);
              if (!currentProvider || (pending.provider && pending.provider !== currentProvider)) {
                // Host is unrecognized or prompt belongs to a different AI provider! Leave in storage for target tab
                resolve(null);
                return;
              }

              // 3. Atomically claim by removing from storage immediately on matched read
              // This prevents cross-tab duplication while keeping data in memory for retries
              clearPendingPrompt();
              resolve(pending);
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

function isContentMatching(insertedText: string, targetText: string): boolean {
  const normInserted = (insertedText || '').replace(/\s+/g, '');
  const normTarget = (targetText || '').replace(/\s+/g, '');

  if (!normInserted || !normTarget) return false;

  // 1. Exact match or full target inclusion
  if (normInserted === normTarget || normInserted.includes(normTarget)) {
    return true;
  }

  // 2. High fidelity match: length ratio must be 95%-105% AND contain both prefix and suffix
  const prefix = normTarget.slice(0, Math.min(80, normTarget.length));
  const suffix = normTarget.slice(Math.max(0, normTarget.length - 80));
  const lengthRatio = normInserted.length / normTarget.length;
  const lengthValid = lengthRatio >= 0.95 && lengthRatio <= 1.05;

  return lengthValid && normInserted.includes(prefix) && normInserted.includes(suffix);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function injectTextIntoElement(el: HTMLElement, text: string): void {
  el.focus();

  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    (el as HTMLInputElement).value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // Check if target already contains the full prompt to avoid duplicate injection
  if (isContentMatching(el.textContent || '', text)) {
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

  // 1. Try native synchronous execCommand('insertText') first
  // execCommand is synchronous in Chromium and updates DOM immediately without async race conditions
  let execSuccess = false;
  try {
    execSuccess = document.execCommand('insertText', false, text);
  } catch {
    execSuccess = false;
  }

  if (execSuccess && isContentMatching(el.textContent || '', text)) {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // 2. Fallback to simulated ClipboardEvent 'paste' ONLY if execCommand did not populate the content
  if (!isContentMatching(el.textContent || '', text)) {
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      // Also provide text/html for Firefox & ProseMirror rich text editors
      const htmlContent = text
        .split('\n')
        .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
        .join('');
      dataTransfer.setData('text/html', htmlContent);

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });
      el.dispatchEvent(pasteEvent);
    } catch (e) {
      console.warn('[SummaBar Injector] Paste event simulation error:', e);
    }

    if (isContentMatching(el.textContent || '', text)) {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }

  // 3. Final fallback: build structured HTML paragraphs line by line
  if (!isContentMatching(el.textContent || '', text)) {
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
}

/**
 * Checks if an element is fully rendered, visible, and interactable in the DOM.
 */
function isElementReady(el: Element | null): boolean {
  if (!el || !document.contains(el)) return false;

  // Verify dimension and non-hidden CSS style
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Check if disabled, read-only, or inactive
  if ((el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  if ((el as HTMLInputElement).readOnly) {
    return false;
  }
  if (el.getAttribute('contenteditable') === 'false') {
    return false;
  }

  return true;
}

/**
 * Finds the active, interactive input element across supported AI providers.
 */
function findTargetInput(): HTMLElement | null {
  const candidateSelectors = [
    // ChatGPT targets
    '#prompt-textarea',
    // Gemini & AI Studio targets
    'ms-prompt-input textarea',
    'rich-textarea div[contenteditable="true"]',
    '.input-area div[contenteditable="true"]',
    '.prompt-input textarea',
    // Claude & ProseMirror targets
    '.ProseMirror',
    // Mistral, Grok, DeepSeek, Perplexity & Generic targets
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Chiedi"]',
    'main div[contenteditable="true"]',
    'main textarea'
  ];

  for (const selector of candidateSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (isElementReady(el)) {
        return el as HTMLElement;
      }
    }
  }

  return null;
}

let hasInjected = false;

function autoInjectPrompt(): void {
  if (hasInjected) return;
  let promptRetries = 0;

  const attemptCheck = () => {
    if (hasInjected) return;
    getPendingPromptAndClaim().then(data => {
      if (!data || !data.text) {
        if (promptRetries < 5) {
          promptRetries++;
          setTimeout(attemptCheck, 250);
        }
        return;
      }

      console.log('[SummaBar Injector] Claimed pending prompt for AI provider:', location.hostname);

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;

        if (hasInjected) {
          clearInterval(interval);
          return;
        }

        const targetInput = findTargetInput();

        if (targetInput) {
          clearInterval(interval);
          hasInjected = true;
          console.log('[SummaBar Injector] Injecting prompt into ready input element:', targetInput);
          injectTextIntoElement(targetInput, data.text);
        } else if (attempts >= 30) {
          clearInterval(interval);
          console.warn('[SummaBar Injector] Input element not found or not ready after 30 retries (12s).');
        }
      }, 400);
    });
  };

  attemptCheck();
}

// Ensure execution only in top window (not inside iframes)
if (window.top === window) {
  // Run auto-injection when page is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    autoInjectPrompt();
  } else {
    window.addEventListener('DOMContentLoaded', autoInjectPrompt, { once: true });
  }
}
