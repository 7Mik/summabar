// Fix Chrome Extension "Illegal invocation" when third-party libraries call detached fetch
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof nativeFetch>) {
    return nativeFetch.apply(window, args);
  };
}

import { BarUI } from './BarUI';
import { getYouTubeVideoId } from '../services/transcript';

console.log('[SummaBar] Content script loaded on page:', window.location.href);

let barUIInstance: BarUI | null = null;

function initSummaBar(): void {
  const videoId = getYouTubeVideoId();
  console.log('[SummaBar] initSummaBar triggered. videoId:', videoId);
  if (videoId) {
    if (!barUIInstance) {
      barUIInstance = new BarUI();
    }
    barUIInstance.render();
  } else {
    if (barUIInstance) {
      barUIInstance.destroy();
      barUIInstance = null;
    }
  }
}

// Initial setup
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initSummaBar();
} else {
  window.addEventListener('DOMContentLoaded', initSummaBar);
}

// Listen to YouTube single-page-app (SPA) page transition events
window.addEventListener('yt-navigate-finish', initSummaBar);
window.addEventListener('yt-page-data-updated', initSummaBar);
window.addEventListener('popstate', initSummaBar);

// MutationObserver fallback to catch dynamic URL changes on YouTube
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    initSummaBar();
  }
});

function startUrlObserver(): void {
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }, { once: true });
  }
}

startUrlObserver();
