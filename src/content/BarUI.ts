import { getSettings } from '../services/storage';
import { getYouTubeVideoId, getTranscript } from '../services/transcript';
import { fetchVideoComments } from '../services/comments';
import { buildVideoSummaryPrompt, buildCommentSummaryPrompt } from '../services/prompts';
import { openLLMProviderWithPrompt } from '../services/provider';
import { openSettingsModal } from './SettingsModal';
import { t } from '../services/i18n';

function showToast(message: string): void {
  const existing = document.querySelector('.summabar-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'summabar-toast';
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function isYouTubeDarkTheme(): boolean {
  const htmlDark = document.documentElement.getAttribute('dark');
  const appDark = document.querySelector('ytd-app')?.hasAttribute('dark');
  const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return htmlDark === 'true' || htmlDark === '' || !!appDark || preferDark;
}

function applyThemeToBar(el: HTMLElement): void {
  const dark = isYouTubeDarkTheme();
  el.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export class BarUI {
  private element: HTMLElement | null = null;
  private isProcessing: boolean = false;
  private checkInterval: number | null = null;
  private userLang: string = 'it';
  private themeObserver: MutationObserver | null = null;
  private destroyed: boolean = false;

  public render(): void {
    this.destroyed = false;
    getSettings().then(s => {
      if (this.destroyed) return;
      this.userLang = s.language;
      this.ensureInserted();
    });

    if (!this.checkInterval) {
      this.checkInterval = window.setInterval(() => {
        if (getYouTubeVideoId()) {
          this.ensureInserted();
        } else {
          this.destroy();
        }
      }, 500);
    }

    if (!this.themeObserver) {
      this.themeObserver = new MutationObserver(() => {
        if (this.element) {
          applyThemeToBar(this.element);
        }
      });
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
    }
  }

  private ensureInserted(): void {
    const existing = document.getElementById('summabar-root');
    
    if (existing) {
      applyThemeToBar(existing);
      if (existing.getBoundingClientRect().height > 0) {
        return;
      }
    }

    // List of candidate containers ordered by priority (Sidebar first, then watch metadata/comments)
    const selectors = [
      '#secondary-inner',
      '#secondary',
      '#related #items',
      '#related',
      'ytd-watch-next-feed-renderer',
      '#above-the-fold',
      'ytd-watch-metadata',
      '#below',
      '#primary-inner',
      '#comments'
    ];

    let targetContainer: Element | null = null;
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) {
        targetContainer = found;
        break;
      }
    }

    if (!targetContainer) {
      return;
    }

    // If element is already attached to this target container, let YouTube finish layout rendering
    if (existing && existing.parentElement === targetContainer) {
      return;
    }

    if (existing) {
      existing.remove();
    }

    if (!this.element || !document.contains(this.element)) {
      this.element = this.createBarElement();
      this.attachEvents();
    }

    if (targetContainer.firstChild) {
      targetContainer.insertBefore(this.element, targetContainer.firstChild);
    } else {
      targetContainer.appendChild(this.element);
    }

    console.log('[SummaBar] Attached bar to container:', targetContainer);
  }

  private createBarElement(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'summabar-root';
    applyThemeToBar(el);
    el.innerHTML = `
      <div class="summabar-container">
        <div class="summabar-actions">
          <!-- 1) Pill 1: SummaBar Brand | Settings Gear Split Pill -->
          <div class="summabar-split-pill">
            <div class="summabar-brand-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span>SummaBar</span>
            </div>
            <div class="summabar-divider"></div>
            <button class="summabar-split-btn summabar-icon-only-btn" id="sb-btn-settings" title="${t('settingsTitle', this.userLang)}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>

          <!-- 2) Pill 2: Summarize Video | Summarize Comments Split Pill -->
          <div class="summabar-split-pill">
            <button class="summabar-split-btn" id="sb-btn-video">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>
              <span>${t('summarizeVideo', this.userLang)}</span>
            </button>
            <div class="summabar-divider"></div>
            <button class="summabar-split-btn" id="sb-btn-comments">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>${t('summarizeComments', this.userLang)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
    return el;
  }

  private attachEvents(): void {
    if (!this.element) return;

    const btnVideo = this.element.querySelector('#sb-btn-video') as HTMLButtonElement;
    const btnComments = this.element.querySelector('#sb-btn-comments') as HTMLButtonElement;
    const btnSettings = this.element.querySelector('#sb-btn-settings') as HTMLButtonElement;

    btnVideo?.addEventListener('click', () => this.handleSummarizeVideo(btnVideo));
    btnComments?.addEventListener('click', () => this.handleSummarizeComments(btnComments));
    btnSettings?.addEventListener('click', () => openSettingsModal((updated) => {
      this.userLang = updated.language;
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
      this.ensureInserted();
    }));
  }

  private async handleSummarizeVideo(button: HTMLButtonElement): Promise<void> {
    if (this.isProcessing) return;

    const videoSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>`;

    const videoId = getYouTubeVideoId();
    if (!videoId) {
      showToast(t('noVideoDetected', this.userLang));
      return;
    }

    const settings = await getSettings();
    this.userLang = settings.language;
    this.setButtonLoading(button, true, t('extractingSubtitles', this.userLang), videoSvg);

    try {
      const transcript = await getTranscript(videoId, settings.language);

      if (!transcript || transcript.length === 0) {
        showToast(t('noSubtitlesFound', this.userLang));
        this.setButtonLoading(button, false, t('summarizeVideo', this.userLang), videoSvg);
        return;
      }

      const prompt = buildVideoSummaryPrompt(transcript, settings.summaryType, settings.language, settings.adsPreference, settings.customSummaryPrompt);
      const { providerName, viaClipboard, copyOnly } = await openLLMProviderWithPrompt(prompt, settings);

      const toastKey = copyOnly ? 'promptCopiedOnly' : (viaClipboard ? 'promptSentClipboard' : 'promptSentQuery');
      showToast(t(toastKey, this.userLang, { provider: providerName }));
    } catch (err) {
      console.error('[SummaBar] Error summarizing video:', err);
      showToast(t('errorSummary', this.userLang));
    } finally {
      this.setButtonLoading(button, false, t('summarizeVideo', this.userLang), videoSvg);
    }
  }

  private async handleSummarizeComments(button: HTMLButtonElement): Promise<void> {
    if (this.isProcessing) return;

    const commentsSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

    const videoId = getYouTubeVideoId();
    if (!videoId) {
      showToast(t('noVideoDetected', this.userLang));
      return;
    }

    const settings = await getSettings();
    this.userLang = settings.language;
    this.setButtonLoading(button, true, t('extractingComments', this.userLang), commentsSvg);

    try {
      const comments = await fetchVideoComments(videoId, 40);

      if (!comments || comments.length === 0) {
        showToast(t('noCommentsFound', this.userLang));
        this.setButtonLoading(button, false, t('summarizeComments', this.userLang), commentsSvg);
        return;
      }

      const prompt = buildCommentSummaryPrompt(comments, settings.language);
      const { providerName, viaClipboard, copyOnly } = await openLLMProviderWithPrompt(prompt, settings);

      const toastKey = copyOnly ? 'promptCopiedOnly' : (viaClipboard ? 'promptSentClipboard' : 'promptSentQuery');
      showToast(t(toastKey, this.userLang, { provider: providerName }));
    } catch (err) {
      console.error('[SummaBar] Error summarizing comments:', err);
      showToast(t('errorComments', this.userLang));
    } finally {
      this.setButtonLoading(button, false, t('summarizeComments', this.userLang), commentsSvg);
    }
  }

  private setButtonLoading(button: HTMLButtonElement, loading: boolean, originalText: string, iconSvg: string): void {
    this.isProcessing = loading;
    if (loading) {
      button.disabled = true;
      button.innerHTML = `<div class="summabar-spinner"></div> <span>${originalText}</span>`;
    } else {
      button.disabled = false;
      button.innerHTML = `${iconSvg} <span>${originalText}</span>`;
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

