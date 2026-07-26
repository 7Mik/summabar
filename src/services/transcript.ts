import { TranscriptSegment } from '../types';

/**
 * Extracts Youtube Video ID from standard YouTube watch URL or video ID string.
 */
export function getYouTubeVideoId(urlOrId?: string): string | null {
  const target = urlOrId || window.location.href;
  const match = target.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (match && match[1]) return match[1];
  if (target.length === 11 && !target.includes('/')) return target;
  return null;
}

/**
 * Helper to unescape XML HTML entities.
 */
function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Fallback Regex XML Parser for YouTube Subtitles.
 */
function parseXmlTranscript(xmlText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>(.*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = unescapeXml(match[3]);

    if (text && !isNaN(start)) {
      segments.push({ start, duration, text });
    }
  }
  return segments;
}

/**
 * Fallback Strategy: Extract caption tracks from window.ytInitialPlayerResponse or page fetch.
 */
async function fetchTranscriptFallback(videoId: string, language: string): Promise<TranscriptSegment[]> {
  try {
    let playerResponse: any = null;

    // 1. Try window globals if running inside YouTube page
    if (typeof window !== 'undefined') {
      playerResponse = (window as any).ytInitialPlayerResponse;
    }

    // 2. If not found in window, fetch YouTube watch HTML
    if (!playerResponse || !playerResponse.captions) {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999`, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const html = await response.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (match && match[1]) {
        playerResponse = JSON.parse(match[1]);
      }
    }

    if (!playerResponse || !playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      console.warn('[SummaBar] Fallback: No caption tracks found in playerResponse');
      return [];
    }

    const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks || [];
    if (captionTracks.length === 0) return [];

    let selectedTrack = captionTracks.find((t: any) => 
      t.languageCode?.toLowerCase() === language.toLowerCase() && t.kind !== 'asr'
    );
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((t: any) => t.languageCode?.toLowerCase() === language.toLowerCase());
    }
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((t: any) => t.languageCode?.toLowerCase().startsWith('en'));
    }
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    if (!selectedTrack || !selectedTrack.baseUrl) return [];

    const trackRes = await fetch(selectedTrack.baseUrl);
    const trackXml = await trackRes.text();
    return parseXmlTranscript(trackXml);
  } catch (err) {
    console.error('[SummaBar] Fallback transcript fetch failed:', err);
    return [];
  }
}

/**
 * Main Transcript Fetcher: Attempts `tubezero` first, then falls back to client-side page parser.
 */
export async function getTranscript(videoId: string, language: string = 'it'): Promise<TranscriptSegment[]> {
  // Strategy 1: Try tubezero package if available
  try {
    const tubezeroModule = await import('tubezero');
    // tubezero typically exports a fetch/getTranscript function or default export
    const fetchFn = (tubezeroModule as any).getTranscript || (tubezeroModule as any).default || tubezeroModule;
    if (typeof fetchFn === 'function') {
      console.log('[SummaBar] Attempting transcript fetch via tubezero...');
      const res = await fetchFn(videoId, { lang: language });
      if (Array.isArray(res) && res.length > 0) {
        console.log(`[SummaBar] tubezero succeeded with ${res.length} segments`);
        return res.map((item: any) => ({
          start: typeof item.start === 'number' ? item.start : parseFloat(item.start || 0),
          duration: typeof item.duration === 'number' ? item.duration : parseFloat(item.dur || item.duration || 0),
          text: item.text || item.content || ''
        }));
      }
    }
  } catch (e) {
    console.warn('[SummaBar] tubezero import or execution skipped/failed, using fallback:', e);
  }

  // Strategy 2: Fallback to YouTube playerResponse / XML caption track parsing
  console.log('[SummaBar] Fetching transcript via fallback playerResponse parser...');
  return await fetchTranscriptFallback(videoId, language);
}
