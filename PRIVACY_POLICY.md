# Privacy Policy for SummaBar

**Last Updated**: July 26, 2026

SummaBar ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our browser extension operates with complete user privacy and data security.

---

## 🔒 1. Zero Data Collection & Zero Server Policy

- **No Remote Servers**: SummaBar operates **100% client-side**. We do not own, operate, or maintain any backend servers, analytics services, or tracking databases.
- **No Personal Data Collection**: SummaBar does **not** collect, store, transmit, or log any personal information, browsing history, user identifiers, IP addresses, or telemetry data.
- **No Analytics / Trackers**: SummaBar contains zero third-party analytics libraries, tracking scripts, or telemetry code.

---

## 📁 2. Data Storage & Usage

- **Local Storage Only**: Your extension settings (such as your chosen LLM provider, preferred summary language, summary style, custom prompts, and ad filter options) are stored locally on your device using `chrome.storage.local`.
- **In-Memory & Temporary Pending Prompts**: YouTube transcripts and comments are processed strictly in your browser's temporary local memory. When transferring prompts to web interfaces like Gemini, Claude, or DeepSeek, a temporary payload is stored locally in `chrome.storage.local`. It is automatically cleared immediately upon being read by the target tab, or falls back to a time-based deletion.
- **System Clipboard**: When requested, formatted summary prompts are copied directly to your local system clipboard.

---

## 🔑 3. Extension Permissions Explained

SummaBar requests only the minimal permissions required for its functionality:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Used exclusively to save your preferred settings locally and temporarily hold pending prompts for auto-filling into target LLM interfaces. |
| `clipboardWrite` | Used to copy the formatted prompt payload to your local system clipboard. |
| `https://*.youtube.com/*` | Used to read transcript data, video metadata, and top comments directly from YouTube watch pages. |
| `https://*.googlevideo.com/*` | Used to fetch YouTube subtitle transcript streams. |
| `https://gemini.google.com/*` | Used to automatically populate the prompt into Google Gemini's chat input area upon opening. |
| `https://aistudio.google.com/*` | Used to automatically populate the prompt into Google AI Studio's chat input area upon opening. |
| `https://claude.ai/*` | Used to automatically populate the prompt into Anthropic Claude's chat input area upon opening. |
| `https://chat.mistral.ai/*` | Used to automatically populate the prompt into Mistral AI's chat input area upon opening. |
| `https://grok.com/*` | Used to automatically populate the prompt into Grok's chat input area upon opening. |
| `https://x.ai/*` | Alternate domain used for Grok integration. |
| `https://chat.deepseek.com/*` | Used to automatically populate the prompt into DeepSeek's chat input area upon opening. |

---

## 🌐 4. Third-Party Web Services

When you click **Riassumi Video** or **Riassumi Commenti**, SummaBar opens your selected third-party LLM provider (e.g., ChatGPT, Claude, Gemini, AI Studio, Mistral, Grok, DeepSeek, or Perplexity) in a new browser tab. 

Your interactions on those third-party websites are governed by their respective privacy policies:
- [OpenAI ChatGPT Privacy Policy](https://openai.com/privacy/)
- [Anthropic Claude Privacy Policy](https://www.anthropic.com/privacy)
- [Google Gemini / AI Studio Privacy Policy](https://policies.google.com/privacy)
- [Mistral AI Privacy Policy](https://mistral.ai/terms/#privacy-policy)
- [xAI Grok Privacy Policy](https://x.ai/privacy)
- [DeepSeek Privacy Policy](https://www.deepseek.com/privacy)
- [Perplexity Privacy Policy](https://www.perplexity.ai/privacy)

---

## 💬 5. Contact & Support

SummaBar is an open-source project. If you have any questions regarding this Privacy Policy or the security of SummaBar, feel free to inspect our code directly in the open-source repository.
