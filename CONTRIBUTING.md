# Contributing to SummaBar

Thank you for your interest in contributing to **SummaBar**! 🚀

SummaBar is designed to be a lightweight, ultra-fast, client-only browser extension that helps users instantly summarize YouTube videos and comments using their favorite LLM provider.

---

## 🛠️ Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)
- Google Chrome, Microsoft Edge, or any Chromium-based browser

### Getting Started

1. **Clone the repository & navigate to `summabar`**:
   ```bash
   cd summabar
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Mode (Watch Mode)**:
   ```bash
   npm run dev
   ```

4. **Build Production Assets**:
   ```bash
   npm run build
   ```

5. **Load Unpacked Extension in Browser**:
   - Open Chrome or Edge and navigate to `chrome://extensions`.
   - Enable **Developer mode** in the top-right corner.
   - Click **Load unpacked** and select the `summabar/dist` directory.

---

## 📐 Key Design Principles

When adding features or modifying code in `summabar`, please adhere to the following principles:

1. **100% Client-Side**: SummaBar must remain fully operational on the client without requiring backend servers, API keys, or cloud infrastructure.
2. **Minimal Footprint**: Keep external dependencies to an absolute minimum. All dependencies must compile cleanly into the single `content.js` script.
3. **Resilient Fallbacks**: Always provide fallbacks for YouTube DOM/API changes (e.g. `tubezero` + `ytInitialPlayerResponse` fallback cascade).
4. **Clean UI/UX**: Maintain the sleek glassmorphism aesthetic in `src/content/styles.css`. Keep floating controls non-intrusive on YouTube watch pages.

---

## 📁 Codebase Layout

```
summabar/
├── manifest.json            # Manifest V3 extension configuration
├── vite.config.ts           # Vite build pipeline setup
├── src/
│   ├── types/               # TypeScript interfaces & default constants
│   ├── services/
│   │   ├── transcript.ts    # YouTube transcript fetcher (tubezero + fallbacks)
│   │   ├── comments.ts      # YouTube comment parser
│   │   ├── prompts.ts       # Structured prompt builders
│   │   ├── provider.ts      # LLM provider deep-linker & clipboard writer
│   │   └── storage.ts       # Settings storage manager
│   └── content/
│       ├── index.ts         # Main content script entry point & SPA observer
│       ├── BarUI.ts         # Injected floating bar UI component
│       ├── SettingsModal.ts # User settings modal overlay
│       └── styles.css       # Design system & CSS styles
```

---

## 🧪 Pull Request Guidelines

1. Ensure TypeScript builds without warnings: `npm run build`.
2. Verify that the extension loads cleanly in Chrome/Edge.
3. Test transcript and comment summarization on multiple YouTube videos (with and without captions).
4. Submit a clear Pull Request describing your changes and rationale.
