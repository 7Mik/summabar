# Technical Writeup: SummaBar

SummaBar is a 100% client-side, zero-backend browser extension (Manifest V3) engineered to extract YouTube video transcripts and user comments in real-time, format them into structured, highly optimized prompts, and seamlessly deep-link users to their preferred LLM web interface (ChatGPT, Claude, Gemini, DeepSeek, Perplexity, or Custom Provider).

---

## 🎯 Architecture Overview

Unlike traditional summarization extensions that rely on central proxy servers, paid API gateways, or remote backend infrastructure, SummaBar operates entirely within the user's browser environment. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                        YouTube Watch Page Browser                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         [SummaBar Content Script]
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
 [Extract Transcript]                                 [Extract Comments]
   1. Primary: tubezero NPM package                     Client fetch via YouTube
   2. Fallback: ytInitialPlayerResponse                 InnerTube /v1/next API
         │                                                     │
         └──────────────────────────┬──────────────────────────┘
                                    │
                       [Prompt Templates Generator]
                         - Formats text in target lang
                         - Filters/Isolates Ads & Sponsors
                         - Applies structural rules
                                    │
                        [Provider Deep-Linker]
                         - Writes full payload to Clipboard
                         - Deep-links to ChatGPT/Claude/Gemini/etc.
                                    │
                                    ▼
                      ┌──────────────────────────┐
                      │    New LLM Chat Tab      │
                      └──────────────────────────┘
```

---

## 🛠️ Deep Dive into Core Subsystems

### 1. Transcript Extraction Pipeline (`src/services/transcript.ts`)
SummaBar implements a resilient two-stage strategy for transcript retrieval:
- **Primary Stage (`tubezero`)**: Loads the zero-dependency `tubezero` package to query video caption tracks programmatically.
- **Fallback Stage (`ytInitialPlayerResponse`)**: If `tubezero` is unavailable or returns an empty array (e.g. for specific auto-generated ASR tracks or region restrictions), SummaBar inspects the YouTube page window globals (`window.ytInitialPlayerResponse`) or fetches `https://www.youtube.com/watch?v={videoId}`, parses the player JSON response, extracts `captionTracks`, downloads the raw XML track, and parses timestamped segments via regex.

### 2. Comment Extraction Subsystem (`src/services/comments.ts`)
YouTube comments are dynamically rendered on demand. SummaBar extracts comments directly on the client by:
- Locating the initial comment continuation token within `ytInitialData`.
- Executing a client POST request to YouTube's public InnerTube endpoint (`https://www.youtube.com/youtubei/v1/next`).
- Iterating through entity batch mutations (`commentEntityPayload`) to parse author handles, comment body text, like counts, and timestamps.

### 3. Prompt Synthesis & Ad Filtering (`src/services/prompts.ts`)
The prompt generator combines the raw transcript or comment dataset with curated system instructions ported from the Summa project:
- **Multilingual Support**: Supports Italian, English, Spanish, French, German, and Portuguese.
- **Summary Styles**:
  - *Concise*: Short TLDR + core learnings.
  - *Medium/Extended*: Paragraph-based comprehensive breakdown.
  - *Nested Bullet Points*: Hierarchical outline.
  - *Timestamps*: `[HH:MM:SS] :: Topic` format.
- **Ad & Sponsor Filtering**: Option to completely erase promotional content or isolate sponsorships into a dedicated collapsible markdown section.

### 4. Provider Deep-Linking & Clipboard Handshake (`src/services/provider.ts`)
Different LLM web services handle long prompts differently:
- Services like **ChatGPT**, **Perplexity**, and **Gemini** support URL query parameters (`?q=...`), allowing immediate execution.
- Services like **Claude** and **DeepSeek** enforce strict URL length restrictions.
- **Solution**: SummaBar writes the complete prompt payload to `navigator.clipboard` immediately before triggering `window.open()`. This ensures that even if a web UI truncates query strings, the user can instantly paste (`Ctrl+V`) the complete payload into the prompt box.

### 5. Settings Persistence (`src/services/storage.ts`)
User preferences (chosen provider, custom URL, target language, summary style, ad preferences) are stored using `chrome.storage.sync` with an automatic fallback to `localStorage` when running in un-sandboxed contexts.

---

## ⚡ Build Pipeline

The project uses **Vite** and **TypeScript** with custom Rollup bundling rules:
- `inlineDynamicImports: true`: Inlines all dependencies (including `tubezero`) into a single self-contained `content.js` bundle (81 kB unminified, 23 kB gzipped).
- Custom build hooks automatically copy `manifest.json`, `styles.css`, and `icon.png` into the `dist/` production folder.
