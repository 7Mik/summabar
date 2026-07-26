import { BarUI } from './BarUI';
import { getYouTubeVideoId } from '../services/transcript';

let barUIInstance: BarUI | null = null;

function initSummaBar(): void {
  const videoId = getYouTubeVideoId();
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

observer.observe(document.body, { childList: true, subtree: true });
