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

- **Local Storage Only**: Your extension settings (such as your chosen LLM provider, preferred summary language, summary style, and ad filter options) are stored locally on your device using `chrome.storage.sync` (or your browser's `localStorage`).
- **In-Memory Data Processing**: YouTube transcripts and comments are processed strictly in your browser's temporary local memory. Once formatted, the resulting text prompt is copied to your local system clipboard and sent directly to the LLM web interface (ChatGPT, Claude, Gemini, DeepSeek, Perplexity, or Custom Provider) via a standard web link opened in a new tab.

---

## 🔑 3. Extension Permissions Explained

SummaBar requests only the minimal permissions required for its functionality:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Used exclusively to save and remember your preferred settings locally (e.g., target LLM provider, output language). |
| `clipboardWrite` | Used to copy the formatted prompt payload to your local clipboard so you can easily paste it into your selected LLM interface. |
| `https://*.youtube.com/*` | Used to read transcript data and top comments directly from YouTube watch pages. |

---

## 🌐 4. Third-Party Web Services

When you click **Riassumi Video** or **Riassumi Commenti**, SummaBar opens your selected third-party LLM provider (e.g., ChatGPT by OpenAI, Claude by Anthropic, Gemini by Google, DeepSeek, or Perplexity) in a new browser tab. 

Your interactions on those third-party websites are governed by their respective privacy policies:
- [OpenAI ChatGPT Privacy Policy](https://openai.com/privacy/)
- [Anthropic Claude Privacy Policy](https://www.anthropic.com/privacy)
- [Google Gemini Privacy Policy](https://policies.google.com/privacy)
- [DeepSeek Privacy Policy](https://www.deepseek.com/privacy)
- [Perplexity Privacy Policy](https://www.perplexity.ai/privacy)

---

## 💬 5. Contact & Support

SummaBar is an open-source project. If you have any questions regarding this Privacy Policy or the security of SummaBar, feel free to inspect our code directly in the open-source repository.
