import { fetchSubtitlesFromYouTube, Client } from 'tubezero';
import { TranscriptSegment, VideoDetails } from '../types';

const safeFetch = (...args: Parameters<typeof fetch>) => window.fetch(...args);
const tubeClient = new Client({ fetch: safeFetch });

export function normalizeMetadataString(str?: string): string | undefined {
  if (!str) return undefined;
  const cleaned = str
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
}

/**
 * Extracts Video Details (Title, Channel Name) from DOM, window globals, or TubeZero.
 */
export async function getVideoDetails(videoId?: string): Promise<VideoDetails> {
  let title: string | undefined;
  let channel: string | undefined;

  // 1. Try DOM elements on YouTube watch page
  if (typeof document !== 'undefined') {
    const titleEl = document.querySelector('ytd-watch-metadata #title h1, h1.ytd-watch-metadata, #title h1');
    if (titleEl && titleEl.textContent) {
      title = normalizeMetadataString(titleEl.textContent);
    }
    const channelEl = document.querySelector('#owner #channel-name a, ytd-channel-name a, #channel-name a');
    if (channelEl && channelEl.textContent) {
      channel = normalizeMetadataString(channelEl.textContent);
    }
  }

  // 2. Try window ytInitialPlayerResponse
  if ((!title || !channel) && typeof window !== 'undefined') {
    const playerResponse = (window as any).ytInitialPlayerResponse;
    if (playerResponse?.videoDetails) {
      if (!title && playerResponse.videoDetails.title) {
        title = normalizeMetadataString(playerResponse.videoDetails.title);
      }
      if (!channel && playerResponse.videoDetails.author) {
        channel = normalizeMetadataString(playerResponse.videoDetails.author);
      }
    }
  }

  // 3. Document title fallback
  if (!title && typeof document !== 'undefined' && document.title) {
    const docTitle = document.title.replace(/ - YouTube$/, '');
    if (docTitle && docTitle.trim() !== 'YouTube') {
      title = normalizeMetadataString(docTitle);
    }
  }

  // 4. TubeZero API fallback
  const targetId = videoId || getYouTubeVideoId();
  if ((!title || !channel) && targetId) {
    try {
      const videoInfo = await tubeClient.getVideo(targetId);
      if (videoInfo) {
        if (!title && videoInfo.title) title = normalizeMetadataString(videoInfo.title);
        if (!channel && videoInfo.channel?.name) channel = normalizeMetadataString(videoInfo.channel.name);
      }
    } catch (e) {
      console.warn('[SummaBar] tubezero getVideo error:', e);
    }
  }

  return { title, channel };
}

/**
 * Extracts Youtube Video ID from standard YouTube watch URL or video ID string.
 */
export function getYouTubeVideoId(urlOrId?: string): string | null {
  const target = urlOrId || window.location.href;
  const match = target.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
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
 * Robust XML Parser for YouTube Subtitles using DOMParser.
 */
function parseXmlTranscript(xmlText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  if (!xmlText) return segments;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const textNodes = doc.getElementsByTagName('text');

    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const startAttr = node.getAttribute('start');
      const durAttr = node.getAttribute('dur');
      const text = (node.textContent || '').replace(/[\r\n\t]+/g, ' ').trim();

      if (startAttr && text) {
        const start = parseFloat(startAttr);
        const duration = durAttr ? parseFloat(durAttr) : 0;
        if (!isNaN(start)) {
          segments.push({ start, duration, text });
        }
      }
    }

    if (segments.length > 0) {
      return segments;
    }
  } catch (e) {
    console.warn('[SummaBar] DOMParser XML parsing failed, using fallback regex:', e);
  }

  // Fallback regex with independent attribute matching
  const regex = /<text\b[^>]*\bstart="([^"]+)"[^>]*>(.*?)<\/text>/gi;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]);
    const durMatch = match[0].match(/\bdur="([^"]+)"/i);
    const duration = durMatch ? parseFloat(durMatch[1]) : 0;
    const text = unescapeXml(match[2]);

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
      const response = await safeFetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999`, {
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

    const trackRes = await safeFetch(selectedTrack.baseUrl);
    const trackXml = await trackRes.text();
    return parseXmlTranscript(trackXml);
  } catch (err) {
    console.error('[SummaBar] Fallback transcript fetch failed:', err);
    return [];
  }
}

/**
 * Main Transcript Fetcher: Uses tubezero `fetchSubtitlesFromYouTube`, falling back if needed.
 */
export async function getTranscript(videoId: string, language: string = 'it'): Promise<TranscriptSegment[]> {
  try {
    console.log(`[SummaBar] Fetching transcript via tubezero for video ${videoId} (language: ${language})...`);
    const segments = await fetchSubtitlesFromYouTube(videoId, language, tubeClient);
    if (segments && segments.length > 0) {
      console.log(`[SummaBar] tubezero fetched ${segments.length} transcript segments`);
      return segments.map((item: any) => ({
        start: typeof item.start === 'number' ? item.start : parseFloat(item.start || 0),
        duration: typeof item.duration === 'number' ? item.duration : parseFloat(item.duration || item.dur || 0),
        text: item.text || ''
      }));
    }
  } catch (e) {
    console.warn('[SummaBar] tubezero fetchSubtitlesFromYouTube error:', e);
  }

  console.log('[SummaBar] Fetching transcript via fallback playerResponse parser...');
  return await fetchTranscriptFallback(videoId, language);
}
