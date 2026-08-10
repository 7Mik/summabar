import { getSettings } from '../services/storage';
import { getYouTubeVideoId, getTranscript, getVideoDetails } from '../services/transcript';
import { fetchVideoComments } from '../services/comments';
import { buildVideoSummaryPrompt, buildCommentSummaryPrompt } from '../services/prompts';
import { openLLMProviderWithPrompt } from '../services/provider';
import { openSettingsModal } from './SettingsModal';
import { t } from '../services/i18n';
import { setSanitizedHTML } from '../services/dom';

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
  private barPosition: 'sidebar' | 'inline_likes' | 'below_likes' = 'sidebar';

  public render(): void {
    this.destroyed = false;
    getSettings().then(s => {
      if (this.destroyed) return;
      this.userLang = s.language;
      this.barPosition = s.barPosition || 'sidebar';
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

  private isElementVisible(el: Element): boolean {
    if (!document.contains(el)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private isAttachedToPreferredContainer(existing: HTMLElement): boolean {
    if (this.barPosition === 'sidebar') {
      return existing.parentElement?.id === 'secondary-inner' || existing.closest('#secondary-inner') !== null;
    }
    if (this.barPosition === 'inline_likes') {
      return existing.parentElement?.id === 'top-level-buttons-computed' || existing.closest('#top-level-buttons-computed') !== null;
    }
    if (this.barPosition === 'below_likes') {
      return existing.previousElementSibling?.id === 'top-row' || existing.parentElement?.id === 'top-row';
    }
    return false;
  }

  private ensureInserted(): void {
    const existing = document.getElementById('summabar-root');

    // Fast path: If bar is already present, visible, and attached to its top preferred container, avoid unnecessary selector probing
    if (existing && this.isElementVisible(existing) && this.isAttachedToPreferredContainer(existing)) {
      applyThemeToBar(existing);
      return;
    }

    let activePosition: 'sidebar' | 'inline_likes' | 'below_likes' = this.barPosition;

    // List of candidate containers ordered by priority depending on the setting
    let selectors: string[];
    if (this.barPosition === 'inline_likes') {
      selectors = [
        'ytd-watch-metadata #top-level-buttons-computed',
        '#top-level-buttons-computed',
        'ytd-menu-renderer #top-level-buttons-computed',
        '#actions-inner',
        '#actions ytd-menu-renderer',
        '#actions'
      ];
    } else if (this.barPosition === 'below_likes') {
      selectors = [
        '#top-row',
        'ytd-watch-metadata',
        '#above-the-fold'
      ];
    } else {
      selectors = [
        '#secondary-inner',
        '#secondary',
        '#related #items',
        '#related',
        'ytd-watch-next-feed-renderer'
      ];
    }

    let targetContainer: Element | null = null;
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found && this.isElementVisible(found)) {
        targetContainer = found;
        break;
      }
    }

    // Fallback: If preferred container is hidden/not visible (e.g. mobile/narrow/half screen), fall back to below_likes
    if (!targetContainer && (this.barPosition === 'sidebar' || this.barPosition === 'inline_likes')) {
      const fallbackSelectors = [
        '#top-row',
        'ytd-watch-metadata',
        '#above-the-fold',
        '#actions'
      ];
      for (const selector of fallbackSelectors) {
        const found = document.querySelector(selector);
        if (found && this.isElementVisible(found)) {
          targetContainer = found;
          activePosition = 'below_likes';
          break;
        }
      }
    }

    if (!targetContainer) {
      return;
    }

    let insertTarget = targetContainer;
    if (activePosition === 'inline_likes') {
      const innerButtons = targetContainer.querySelector('#top-level-buttons-computed, #actions-inner');
      if (innerButtons) {
        insertTarget = innerButtons;
      }
    }

    // Check if element is already correctly placed at target container (either as child of insertTarget or adjacent sibling for top-row)
    const isAlreadyAttached = existing && (
      (targetContainer.id === 'top-row' && activePosition === 'below_likes')
        ? targetContainer.nextElementSibling === existing
        : existing.parentElement === insertTarget
    );

    if (isAlreadyAttached && this.isElementVisible(existing)) {
      applyThemeToBar(existing);
      return;
    }

    if (existing) {
      existing.remove();
    }

    if (!this.element || !document.contains(this.element)) {
      this.element = this.createBarElement();
      this.attachEvents();
    }

    this.element.setAttribute('data-position', activePosition);

    if (activePosition === 'below_likes') {
      if (targetContainer.id === 'top-row') {
        targetContainer.insertAdjacentElement('afterend', this.element);
      } else {
        const bottomRow = targetContainer.querySelector('#bottom-row');
        if (bottomRow) {
          targetContainer.insertBefore(this.element, bottomRow);
        } else {
          targetContainer.appendChild(this.element);
        }
      }
    } else {
      if (insertTarget.firstChild) {
        insertTarget.insertBefore(this.element, insertTarget.firstChild);
      } else {
        insertTarget.appendChild(this.element);
      }
    }

    console.log('[SummaBar] Attached bar to container:', targetContainer, 'effective position:', activePosition);
  }

  private createBarElement(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'summabar-root';
    el.setAttribute('data-position', this.barPosition);
    applyThemeToBar(el);
    setSanitizedHTML(el, `
      <div class="summabar-container">
        <div class="summabar-actions">
          <!-- 1) Pill 1: SummaBar Brand | Settings Gear Split Pill -->
          <div class="summabar-split-pill">
            <div class="summabar-brand-item" title="SummaBar">
              <svg class="summabar-lightning-icon" width="24" height="24" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="sb-lava-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ff0000">
                      <animate class="sb-lava-anim" attributeName="stop-color" values="#ff0000;#dc00c9;#0082ff;#ff006f;#008be4;#ff0000" dur="5s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="25%" stop-color="#ff006f">
                      <animate class="sb-lava-anim" attributeName="stop-color" values="#ff006f;#4a62ff;#008be4;#dc00c9;#ff0000;#ff006f" dur="5s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="50%" stop-color="#dc00c9">
                      <animate class="sb-lava-anim" attributeName="stop-color" values="#dc00c9;#0082ff;#ff0000;#4a62ff;#008be4;#dc00c9" dur="5s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="75%" stop-color="#4a62ff">
                      <animate class="sb-lava-anim" attributeName="stop-color" values="#4a62ff;#008be4;#ff006f;#0082ff;#ff0000;#4a62ff" dur="5s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" stop-color="#0082ff">
                      <animate class="sb-lava-anim" attributeName="stop-color" values="#0082ff;#ff0000;#dc00c9;#008be4;#ff006f;#0082ff" dur="5s" repeatCount="indefinite"/>
                    </stop>
                  </linearGradient>
                </defs>
                <path fill="url(#sb-lava-grad)" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span class="summabar-btn-text summabar-brand-text">SummaBar</span>
            </div>
            <div class="summabar-divider"></div>
            <button class="summabar-split-btn summabar-icon-only-btn" id="sb-btn-settings" title="${t('settingsTitle', this.userLang)}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>

          <!-- 2) Pill 2: Summarize Video | Summarize Comments Split Pill -->
          <div class="summabar-split-pill">
            <button class="summabar-split-btn" id="sb-btn-video" title="${t('summarizeVideo', this.userLang)}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>
              <span class="summabar-btn-text summabar-action-text summabar-video-text">${t('summarizeVideo', this.userLang)}</span>
            </button>
            <div class="summabar-divider"></div>
            <button class="summabar-split-btn" id="sb-btn-comments" title="${t('summarizeComments', this.userLang)}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="summabar-btn-text summabar-action-text summabar-comments-text">${t('summarizeComments', this.userLang)}</span>
            </button>
          </div>
        </div>
      </div>
    `);
    return el;
  }

  private attachEvents(): void {
    if (!this.element) return;

    const brandItem = this.element.querySelector('.summabar-brand-item');
    const anims = this.element.querySelectorAll('.sb-lava-anim');
    if (brandItem && anims.length > 0) {
      brandItem.addEventListener('mouseenter', () => {
        anims.forEach(a => a.setAttribute('dur', '1.0s'));
      });
      brandItem.addEventListener('mouseleave', () => {
        anims.forEach(a => a.setAttribute('dur', '5s'));
      });
    }

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

    const videoSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>`;

    const videoId = getYouTubeVideoId();
    if (!videoId) {
      showToast(t('noVideoDetected', this.userLang));
      return;
    }

    const settings = await getSettings();
    this.userLang = settings.language;
    this.setButtonLoading(button, true, t('extractingSubtitles', this.userLang), videoSvg);

    try {
      const [transcript, videoDetails] = await Promise.all([
        getTranscript(videoId, settings.language),
        getVideoDetails(videoId)
      ]);

      if (!transcript || transcript.length === 0) {
        showToast(t('noSubtitlesFound', this.userLang));
        this.setButtonLoading(button, false, t('summarizeVideo', this.userLang), videoSvg);
        return;
      }

      const prompt = buildVideoSummaryPrompt(
        transcript, 
        settings.summaryType, 
        settings.language, 
        settings.adsPreference, 
        settings.customSummaryPrompt,
        videoDetails
      );
      const { providerName, viaClipboard, copyOnly, isAutoInject } = await openLLMProviderWithPrompt(prompt, settings);

      const toastKey = copyOnly 
        ? 'promptCopiedOnly' 
        : (isAutoInject ? 'promptSentQuery' : (viaClipboard ? 'promptSentClipboard' : 'promptSentQuery'));
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

    const commentsSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

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
      const { providerName, viaClipboard, copyOnly, isAutoInject } = await openLLMProviderWithPrompt(prompt, settings);

      const toastKey = copyOnly 
        ? 'promptCopiedOnly' 
        : (isAutoInject ? 'promptSentQuery' : (viaClipboard ? 'promptSentClipboard' : 'promptSentQuery'));
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
    const existingSpan = button.querySelector('span');
    const labelClass = existingSpan?.className ?? 'summabar-btn-text summabar-action-text';
    if (loading) {
      button.disabled = true;
      setSanitizedHTML(button, `<div class="summabar-spinner"></div> <span class="${labelClass}">${originalText}</span>`);
    } else {
      button.disabled = false;
      setSanitizedHTML(button, `${iconSvg} <span class="${labelClass}">${originalText}</span>`);
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

