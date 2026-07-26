import { UserSettings, SUPPORTED_LANGUAGES, PROVIDER_INFO, LLMProvider, SummaryType, AdsPreference } from '../types';
import { getSettings, saveSettings } from '../services/storage';

export function openSettingsModal(onSave?: (settings: UserSettings) => void): void {
  // Check if modal is already open
  if (document.getElementById('summabar-modal-overlay')) return;

  getSettings().then(currentSettings => {
    const overlay = document.createElement('div');
    overlay.id = 'summabar-modal-overlay';
    overlay.className = 'summabar-modal-overlay';

    overlay.innerHTML = `
      <div class="summabar-modal">
        <div class="summabar-modal-header">
          <div class="summabar-modal-title">⚙️ Impostazioni SummaBar</div>
          <button class="summabar-modal-close" id="sb-modal-close">&times;</button>
        </div>
        
        <div class="summabar-form-group">
          <label class="summabar-label">Provider LLM Destinazione</label>
          <select id="sb-provider-select" class="summabar-select">
            <option value="chatgpt" ${currentSettings.provider === 'chatgpt' ? 'selected' : ''}>🤖 ChatGPT (chatgpt.com)</option>
            <option value="claude" ${currentSettings.provider === 'claude' ? 'selected' : ''}>🧠 Claude (claude.ai)</option>
            <option value="gemini" ${currentSettings.provider === 'gemini' ? 'selected' : ''}>✨ Gemini (gemini.google.com)</option>
            <option value="deepseek" ${currentSettings.provider === 'deepseek' ? 'selected' : ''}>🐋 DeepSeek (chat.deepseek.com)</option>
            <option value="perplexity" ${currentSettings.provider === 'perplexity' ? 'selected' : ''}>🔍 Perplexity (perplexity.ai)</option>
            <option value="custom" ${currentSettings.provider === 'custom' ? 'selected' : ''}>⚙️ URL Personalizzato...</option>
          </select>
        </div>

        <div class="summabar-form-group" id="sb-custom-url-group" style="display: ${currentSettings.provider === 'custom' ? 'block' : 'none'};">
          <label class="summabar-label">URL Custom (Usa {prompt} come valore del prompt)</label>
          <input type="text" id="sb-custom-url" class="summabar-input" placeholder="https://my-llm.com/chat?text={prompt}" value="${currentSettings.customUrl || ''}" />
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">Lingua del Riassunto</label>
          <select id="sb-language-select" class="summabar-select">
            ${SUPPORTED_LANGUAGES.map(l => `<option value="${l.code}" ${currentSettings.language === l.code ? 'selected' : ''}>${l.name}</option>`).join('')}
          </select>
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">Stile del Riassunto</label>
          <select id="sb-style-select" class="summabar-select">
            <option value="medium" ${currentSettings.summaryType === 'medium' ? 'selected' : ''}>📄 Bilanciato (Standard)</option>
            <option value="concise" ${currentSettings.summaryType === 'concise' ? 'selected' : ''}>⚡ Sintetico & Veloce</option>
            <option value="extended" ${currentSettings.summaryType === 'extended' ? 'selected' : ''}>📚 Approfondito & Dettagliato</option>
            <option value="nested_bullet_points" ${currentSettings.summaryType === 'nested_bullet_points' ? 'selected' : ''}>📌 Bullet Points Strutturati</option>
            <option value="timestamps" ${currentSettings.summaryType === 'timestamps' ? 'selected' : ''}>⏱️ Marcatori Temporali (Timestamps)</option>
          </select>
        </div>

        <div class="summabar-form-group">
          <label class="summabar-label">Gestione Sponsor & Pubblicità</label>
          <select id="sb-ads-select" class="summabar-select">
            <option value="erase" ${currentSettings.adsPreference === 'erase' ? 'selected' : ''}>🚫 Rimuovi completamente Sponsor & ADS</option>
            <option value="section" ${currentSettings.adsPreference === 'section' ? 'selected' : ''}>📺 Isola gli Sponsor in una sezione dedicata</option>
            <option value="keep" ${currentSettings.adsPreference === 'keep' ? 'selected' : ''}>Mantiati tutto invariato</option>
          </select>
        </div>

        <div class="summabar-modal-footer">
          <button class="summabar-btn" id="sb-modal-cancel">Annulla</button>
          <button class="summabar-btn summabar-btn-primary" id="sb-modal-save">Salva Impostazioni</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const providerSelect = document.getElementById('sb-provider-select') as HTMLSelectElement;
    const customUrlGroup = document.getElementById('sb-custom-url-group') as HTMLElement;
    const customUrlInput = document.getElementById('sb-custom-url') as HTMLInputElement;
    const languageSelect = document.getElementById('sb-language-select') as HTMLSelectElement;
    const styleSelect = document.getElementById('sb-style-select') as HTMLSelectElement;
    const adsSelect = document.getElementById('sb-ads-select') as HTMLSelectElement;
    const closeBtn = document.getElementById('sb-modal-close') as HTMLElement;
    const cancelBtn = document.getElementById('sb-modal-cancel') as HTMLElement;
    const saveBtn = document.getElementById('sb-modal-save') as HTMLElement;

    providerSelect.addEventListener('change', () => {
      customUrlGroup.style.display = providerSelect.value === 'custom' ? 'block' : 'none';
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
        adsPreference: adsSelect.value as AdsPreference
      };

      await saveSettings(updatedSettings);
      closeModal();
      if (onSave) onSave(updatedSettings);
    });
  });
}
