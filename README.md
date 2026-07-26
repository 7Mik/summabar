# ⚡ SummaBar — Instant YouTube LLM Summarizer

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

**SummaBar** is a lightweight, privacy-focused browser extension that seamlessly embeds a native-styled action bar into YouTube watch pages. It extracts video transcripts or top comments with a single click and automatically pre-fills ready-to-run summary prompts into your favorite LLM provider (ChatGPT, Claude, Google Gemini, Google AI Studio, Mistral AI, Grok, DeepSeek, Perplexity, or custom endpoints).

---

## ✨ Features

- 🎨 **1:1 Native YouTube Action Bar UI**: Built matching YouTube's exact split-pill action bar design system. Automatically adapts to YouTube's **Dark Mode** and **Light Mode** in real-time.
- 📜 **Instant Subtitle & Transcript Extraction**: Extracts official and auto-generated YouTube subtitles across multiple languages (`it`, `en`, `es`, `fr`, `de`, `pt`).
- 💬 **Top Comments Summarization**: Fetches top video comments with author details and like counts for instant sentiment analysis and community highlights.
- 🚀 **Multi-LLM Provider Support**:
  - **ChatGPT** (`chatgpt.com`)
  - **Claude** (`claude.ai`)
  - **Google Gemini** (`gemini.google.com`)
  - **Google AI Studio** (`aistudio.google.com`)
  - **Mistral AI** (`chat.mistral.ai`)
  - **Grok / xAI** (`grok.com`)
  - **DeepSeek** (`chat.deepseek.com`)
  - **Perplexity** (`perplexity.ai`)
  - **Clipboard-Only** (copies formatted prompt without opening new tabs)
  - **Custom Provider URL**
- 🤖 **Auto-Inject Technology**: Automatically detects chat input boxes on target LLM websites (Gemini, AI Studio, Claude, Mistral, Grok, DeepSeek) and auto-populates the summary prompt upon tab load.
- ⚙️ **Customizable Summary Styles**:
  - Concise (Quick key takeaways)
  - Medium (Balanced executive summary)
  - Extended (Comprehensive breakdown)
  - Nested Bullet Points
  - Timestamps / Chapter markers
  - Custom User Prompts (`SummaryType = 'custom'`)
- 🔒 **100% Private & Client-Side**: No backend servers, no analytics, no tracking. Everything operates locally within your browser.

---

## 🛠️ Installation Guide

### Chrome / Brave / Edge / Opera

1. Clone or download this repository:
   ```bash
   git clone https://github.com/7Mik/summabar.git
   cd summabar
   ```
2. Install dependencies and build the extension:
   ```bash
   npm install
   npm run build
   ```
3. Open your browser and navigate to `chrome://extensions/`.
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the `dist/` folder inside the project directory.

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/manifest.json` inside the built project directory.

---

## 💻 Development & Build Commands

- **Install Dependencies**:
  ```bash
  npm install
  ```
- **Development Watch Mode**:
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
  Generates production-ready bundles in `dist/`:
  - `dist/content.js` (YouTube Action Bar content script)
  - `dist/injector.js` (LLM Auto-injector script)
  - `dist/styles.css` (YouTube action bar CSS)
  - `dist/manifest.json`

---

## 📁 Project Architecture

```
summabar/
├── src/
│   ├── content/          # YouTube embedded action bar UI & Settings modal
│   │   ├── BarUI.ts
│   │   ├── SettingsModal.ts
│   │   └── styles.css
│   ├── injector/         # Auto-injector for Gemini, AI Studio, Claude, Mistral, Grok, DeepSeek
│   │   └── index.ts
│   ├── services/         # Transcript extraction, comments, prompts & i18n
│   │   ├── comments.ts
│   │   ├── i18n.ts
│   │   ├── prompts.ts
│   │   ├── provider.ts
│   │   ├── storage.ts
│   │   └── transcript.ts
│   └── types/            # TypeScript data models & provider configurations
│       └── index.ts
├── PRIVACY_POLICY.md     # Official Privacy Policy
├── manifest.json         # Extension Manifest V3 configuration
├── vite.config.ts        # Vite bundling configuration
└── package.json
```

---

## 🔒 Privacy & Data Policy

SummaBar operates with **zero server backend**. All transcript fetching, prompt building, and storage settings occur strictly inside your browser. For full details, see [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## 📄 License

Distributed under the GNU Affero General Public License v3.0 (`AGPL-3.0-only`). See [LICENSE](LICENSE) for details.
