import { fetchCommentsFromYouTube } from 'tubezero';
import { VideoComment } from '../types';

function findValue(obj: any, path: string, defaultValue: any = undefined): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return defaultValue;
    }
    current = current[part];
  }
  return current;
}

export async function fetchVideoComments(videoId: string, maxCount: number = 40): Promise<VideoComment[]> {
  try {
    console.log(`[SummaBar] Fetching comments via tubezero for video ${videoId}...`);
    const commentsData = await fetchCommentsFromYouTube(videoId, maxCount);
    if (commentsData && commentsData.length > 0) {
      console.log(`[SummaBar] tubezero fetched ${commentsData.length} comments`);
      return commentsData.map((c: any) => ({
        author: c.author || 'Anonimo',
        text: c.text || '',
        publishedTime: c.publishedTime,
        likeCount: typeof c.likeCount === 'number' ? c.likeCount : 0
      }));
    }
  } catch (err) {
    console.warn('[SummaBar] tubezero fetchCommentsFromYouTube error:', err);
  }

  // Fallback
  const comments: VideoComment[] = [];
  try {
    let ytInitialData: any = (window as any).ytInitialData;

    if (!ytInitialData) {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const pageHtml = await pageRes.text();
      const match = pageHtml.match(/ytInitialData\s*=\s*({.+?});/);
      if (match && match[1]) {
        ytInitialData = JSON.parse(match[1]);
      }
    }

    if (!ytInitialData) {
      console.warn('[SummaBar] Could not find ytInitialData for comments');
      return [];
    }

    // Try finding initial continuation token for comments
    let continuationToken = findValue(
      ytInitialData, 
      'contents.twoColumnWatchNextResults.results.results.contents[2].itemSectionRenderer.contents[0].commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs[0].navigationEndpoint.continuationCommand.token'
    );

    if (!continuationToken) {
      // Alternative paths in ytInitialData
      const itemSections = findValue(ytInitialData, 'contents.twoColumnWatchNextResults.results.results.contents', []);
      for (const section of itemSections) {
        if (section.itemSectionRenderer?.sectionIdentifier === 'comment-item-section') {
          continuationToken = findValue(
            section, 
            'itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token'
          );
          if (continuationToken) break;
        }
      }
    }

    if (!continuationToken) {
      console.warn('[SummaBar] Continuation token for YouTube comments not found');
      return [];
    }

    // Fetch comment batch from Youtube InnerTube API endpoint
    const response = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240703.00.00"
          }
        },
        continuation: continuationToken
      })
    });

    const apiResponse = await response.json();
    const mutations = findValue(apiResponse, 'frameworkUpdates.entityBatchUpdate.mutations', []);

    for (const mutation of mutations) {
      const payload = findValue(mutation, 'payload.commentEntityPayload');
      if (payload) {
        const author = findValue(payload, 'authorText.simpleText', 'Anonimo');
        const text = findValue(payload, 'contentText.runs[0].text', '');
        const publishedTime = findValue(payload, 'publishedTimeText.simpleText');
        const rawLikes = findValue(payload, 'voteCount.simpleText');
        const likeCount = rawLikes ? parseInt(rawLikes.replace(/\D/g, ''), 10) || 0 : 0;

        if (text) {
          comments.push({ author, text, publishedTime, likeCount });
        }
      }
      if (comments.length >= maxCount) break;
    }

    return comments;
  } catch (err) {
    console.error('[SummaBar] Error fetching comments fallback:', err);
    return comments;
  }
}
