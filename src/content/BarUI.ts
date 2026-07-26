import { getSettings } from '../services/storage';
import { getYouTubeVideoId, getTranscript } from '../services/transcript';
import { fetchVideoComments } from '../services/comments';
import { buildVideoSummaryPrompt, buildCommentSummaryPrompt } from '../services/prompts';
import { openLLMProviderWithPrompt } from '../services/provider';
import { openSettingsModal } from './SettingsModal';

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

export class BarUI {
  private element: HTMLElement | null = null;
  private isProcessing: boolean = false;

  public render(): void {
    if (document.getElementById('summabar-root')) return;

    this.element = document.createElement('div');
    this.element.id = 'summabar-root';
    this.element.innerHTML = `
      <div class="summabar-container">
        <div class="summabar-brand">⚡ SummaBar</div>
        <button class="summabar-btn summabar-btn-primary" id="sb-btn-video">
          <span>✨ Riassumi Video</span>
        </button>
        <button class="summabar-btn" id="sb-btn-comments">
          <span>💬 Riassumi Commenti</span>
        </button>
        <button class="summabar-btn summabar-btn-icon-only" id="sb-btn-settings" title="Impostazioni SummaBar">
          <span>⚙️</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.element);
    this.attachEvents();
  }

  private attachEvents(): void {
    if (!this.element) return;

    const btnVideo = this.element.querySelector('#sb-btn-video') as HTMLButtonElement;
    const btnComments = this.element.querySelector('#sb-btn-comments') as HTMLButtonElement;
    const btnSettings = this.element.querySelector('#sb-btn-settings') as HTMLButtonElement;

    btnVideo?.addEventListener('click', () => this.handleSummarizeVideo(btnVideo));
    btnComments?.addEventListener('click', () => this.handleSummarizeComments(btnComments));
    btnSettings?.addEventListener('click', () => openSettingsModal());
  }

  private async handleSummarizeVideo(button: HTMLButtonElement): Promise<void> {
    if (this.isProcessing) return;

    const videoId = getYouTubeVideoId();
    if (!videoId) {
      showToast('⚠️ Nessun video di YouTube rilevato');
      return;
    }

    this.setButtonLoading(button, true, 'Estrazione sottotitoli...');

    try {
      const settings = await getSettings();
      const transcript = await getTranscript(videoId, settings.language);

      if (!transcript || transcript.length === 0) {
        showToast('❌ Nessun sottotitolo o trascrizione disponibile per questo video');
        this.setButtonLoading(button, false, '✨ Riassumi Video');
        return;
      }

      const prompt = buildVideoSummaryPrompt(transcript, settings.summaryType, settings.language, settings.adsPreference);
      const { providerName } = await openLLMProviderWithPrompt(prompt, settings);

      showToast(`🚀 Trascrizione inviata a ${providerName}! (Prompt copiato negli appunti)`);
    } catch (err) {
      console.error('[SummaBar] Error summarizing video:', err);
      showToast('❌ Errore durante l\'estrazione del riassunto');
    } finally {
      this.setButtonLoading(button, false, '✨ Riassumi Video');
    }
  }

  private async handleSummarizeComments(button: HTMLButtonElement): Promise<void> {
    if (this.isProcessing) return;

    const videoId = getYouTubeVideoId();
    if (!videoId) {
      showToast('⚠️ Nessun video di YouTube rilevato');
      return;
    }

    this.setButtonLoading(button, true, 'Estrazione commenti...');

    try {
      const settings = await getSettings();
      const comments = await fetchVideoComments(videoId, 40);

      if (!comments || comments.length === 0) {
        showToast('❌ Nessun commento trovato per questo video');
        this.setButtonLoading(button, false, '💬 Riassumi Commenti');
        return;
      }

      const prompt = buildCommentSummaryPrompt(comments, settings.language);
      const { providerName } = await openLLMProviderWithPrompt(prompt, settings);

      showToast(`🚀 ${comments.length} commenti inviati a ${providerName}! (Prompt copiato)`);
    } catch (err) {
      console.error('[SummaBar] Error summarizing comments:', err);
      showToast('❌ Errore durante l\'estrazione dei commenti');
    } finally {
      this.setButtonLoading(button, false, '💬 Riassumi Commenti');
    }
  }

  private setButtonLoading(button: HTMLButtonElement, loading: boolean, originalText: string): void {
    this.isProcessing = loading;
    if (loading) {
      button.disabled = true;
      button.innerHTML = `<div class="summabar-spinner"></div> <span>${originalText}</span>`;
    } else {
      button.disabled = false;
      button.innerHTML = `<span>${originalText}</span>`;
    }
  }

  public destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
