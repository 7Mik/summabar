import { UserSettings, SUPPORTED_LANGUAGES, LLMProvider, SummaryType, AdsPreference } from '../types';
import { getSettings, saveSettings } from '../services/storage';
import { t } from '../services/i18n';
import { setSanitizedHTML } from '../services/dom';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function openSettingsModal(onSave?: (settings: UserSettings) => void): void {
  // Check if modal is already open
  if (document.getElementById('summabar-modal-overlay')) return;

  getSettings().then(currentSettings => {
    const lang = currentSettings.language;
    const overlay = document.createElement('div');
    overlay.id = 'summabar-modal-overlay';
    overlay.className = 'summabar-modal-overlay';

    setSanitizedHTML(overlay, `
      <div class="summabar-modal">
        <div class="summabar-modal-header">
          <div class="summabar-modal-title">${t('settingsTitle', lang)}</div>
          <button class="summabar-modal-close" id="sb-modal-close">&times;</button>
        </div>
        
        <div class="summabar-form-group">
          <label class="summabar-label">${t('targetProvider', lang)}</label>
          <select id="sb-provider-select" class="summabar-select">
            <option value="chatgpt" ${currentSettings.provider === 'chatgpt' ? 'selected' : ''}>ChatGPT (chatgpt.com)</option>
            <option value="claude" ${currentSettings.provider === 'claude' ? 'selected' : ''}>Claude (claude.ai)</option>
            <option value="gemini" ${currentSettings.provider === 'gemini' ? 'selected' : ''}>Gemini (gemini.google.com)</option>
            <option value="aistudio" ${currentSettings.provider === 'aistudio' ? 'selected' : ''}>Google AI Studio (aistudio.google.com)</option>
            <option value="mistral" ${currentSettings.provider === 'mistral' ? 'selected' : ''}>Mistral AI (chat.mistral.ai)</option>
            <option value="grok" ${currentSettings.provider === 'grok' ? 'selected' : ''}>Grok (grok.com)</option>
            <option value="deepseek" ${currentSettings.provider === 'deepseek' ? 'selected' : ''}>DeepSeek (chat.deepseek.com)</option>
            <option value="perplexity" ${currentSettings.provider === 'perplexity' ? 'selected' : ''}>Perplexity (perplexity.ai)</option>
            <option value="clipboard" ${currentSettings.provider === 'clipboard' ? 'selected' : ''}>${t('copyClipboardOption', lang)}</option>
            <option value="custom" ${currentSettings.provider === 'custom' ? 'selected' : ''}>Custom URL...</option>
          </select>
        </div>

        <div class="summabar-form-group" id="sb-custom-url-group" style="display: ${currentSettings.provider === 'custom' ? 'block' : 'none'};">
          <label class="summabar-label">${t('customUrlLabel', lang)}</label>
          <input type="text" id="sb-custom-url" class="summabar-input" placeholder="https://my-llm.com/chat?text={prompt}" value="${currentSettings.customUrl || ''}" />
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">${t('summaryLanguage', lang)}</label>
          <select id="sb-language-select" class="summabar-select">
            ${SUPPORTED_LANGUAGES.map(l => `<option value="${l.code}" ${currentSettings.language === l.code ? 'selected' : ''}>${l.name}</option>`).join('')}
          </select>
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">${t('summaryStyle', lang)}</label>
          <select id="sb-style-select" class="summabar-select">
            <option value="medium" ${currentSettings.summaryType === 'medium' ? 'selected' : ''}>${t('styleBalanced', lang)}</option>
            <option value="concise" ${currentSettings.summaryType === 'concise' ? 'selected' : ''}>${t('styleConcise', lang)}</option>
            <option value="extended" ${currentSettings.summaryType === 'extended' ? 'selected' : ''}>${t('styleExtended', lang)}</option>
            <option value="nested_bullet_points" ${currentSettings.summaryType === 'nested_bullet_points' ? 'selected' : ''}>${t('styleBullets', lang)}</option>
            <option value="timestamps" ${currentSettings.summaryType === 'timestamps' ? 'selected' : ''}>${t('styleTimestamps', lang)}</option>
            <option value="custom" ${currentSettings.summaryType === 'custom' ? 'selected' : ''}>${t('styleCustom', lang)}</option>
          </select>
        </div>

        <div class="summabar-form-group" id="sb-custom-prompt-group" style="display: ${currentSettings.summaryType === 'custom' ? 'block' : 'none'};">
          <label class="summabar-label">${t('customPromptLabel', lang)}</label>
          <textarea id="sb-custom-prompt" class="summabar-input" style="min-height: 75px; resize: vertical;" placeholder="${escapeHtml(t('customPromptPlaceholder', lang))}">${escapeHtml(currentSettings.customSummaryPrompt || '')}</textarea>
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">${t('sponsorshipLabel', lang)}</label>
          <select id="sb-ads-select" class="summabar-select">
            <option value="erase" ${currentSettings.adsPreference === 'erase' ? 'selected' : ''}>${t('eraseSponsors', lang)}</option>
            <option value="section" ${currentSettings.adsPreference === 'section' ? 'selected' : ''}>${t('isolateSponsors', lang)}</option>
            <option value="keep" ${currentSettings.adsPreference === 'keep' ? 'selected' : ''}>${t('keepSponsors', lang)}</option>
          </select>
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">${t('barPositionLabel', lang)}</label>
          <select id="sb-position-select" class="summabar-select">
            <option value="sidebar" ${currentSettings.barPosition === 'sidebar' || !currentSettings.barPosition ? 'selected' : ''}>${t('barPositionSidebar', lang)}</option>
            <option value="inline_likes" ${currentSettings.barPosition === 'inline_likes' ? 'selected' : ''}>${t('barPositionInline', lang)}</option>
            <option value="below_likes" ${currentSettings.barPosition === 'below_likes' ? 'selected' : ''}>${t('barPositionBelow', lang)}</option>
          </select>
        </div>

        <div class="summabar-form-group" style="margin-top: 12px;">
          <label class="summabar-checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
            <input type="checkbox" id="sb-copy-clipboard" ${currentSettings.copyToClipboard ? 'checked' : ''} />
            <span>${t('copyToClipboardLabel', lang)}</span>
          </label>
          <div style="font-size: 11px; opacity: 0.7; margin-top: 4px; margin-left: 22px;">${t('copyToClipboardSubtext', lang)}</div>
        </div>

        <div class="summabar-modal-footer">
          <button class="summabar-btn" id="sb-modal-cancel">${t('cancel', lang)}</button>
          <button class="summabar-btn summabar-btn-primary" id="sb-modal-save">${t('saveSettings', lang)}</button>
        </div>
      </div>
    `);

    document.body.appendChild(overlay);

    const providerSelect = document.getElementById('sb-provider-select') as HTMLSelectElement;
    const customUrlGroup = document.getElementById('sb-custom-url-group') as HTMLElement;
    const customUrlInput = document.getElementById('sb-custom-url') as HTMLInputElement;
    const languageSelect = document.getElementById('sb-language-select') as HTMLSelectElement;
    const styleSelect = document.getElementById('sb-style-select') as HTMLSelectElement;
    const customPromptGroup = document.getElementById('sb-custom-prompt-group') as HTMLElement;
    const customPromptInput = document.getElementById('sb-custom-prompt') as HTMLTextAreaElement;
    const adsSelect = document.getElementById('sb-ads-select') as HTMLSelectElement;
    const positionSelect = document.getElementById('sb-position-select') as HTMLSelectElement;
    const copyClipboardCheck = document.getElementById('sb-copy-clipboard') as HTMLInputElement;
    const closeBtn = document.getElementById('sb-modal-close') as HTMLElement;
    const cancelBtn = document.getElementById('sb-modal-cancel') as HTMLElement;
    const saveBtn = document.getElementById('sb-modal-save') as HTMLElement;

    providerSelect.addEventListener('change', () => {
      customUrlGroup.style.display = providerSelect.value === 'custom' ? 'block' : 'none';
    });

    styleSelect.addEventListener('change', () => {
      customPromptGroup.style.display = styleSelect.value === 'custom' ? 'block' : 'none';
    });

    const closeModal = () => {
      overlay.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    saveBtn.addEventListener('click', async () => {
      const updatedSettings: UserSettings = {
        ...currentSettings,
        provider: providerSelect.value as LLMProvider,
        customUrl: customUrlInput.value.trim(),
        language: languageSelect.value,
        summaryType: styleSelect.value as SummaryType,
        customSummaryPrompt: customPromptInput.value.trim(),
        adsPreference: adsSelect.value as AdsPreference,
        barPosition: positionSelect.value as 'sidebar' | 'inline_likes' | 'below_likes',
        copyToClipboard: copyClipboardCheck?.checked ?? false
      };

      await saveSettings(updatedSettings);
      closeModal();
      if (onSave) onSave(updatedSettings);
    });
  });
}
