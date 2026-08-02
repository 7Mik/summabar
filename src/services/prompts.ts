import { SummaryType, AdsPreference, TranscriptSegment, VideoComment, VideoDetails, SUPPORTED_LANGUAGES } from '../types';

function getLanguageName(langCode: string): string {
  const found = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
  return found ? found.name : 'Italiano';
}

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `[${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
  }
  return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
}

function formatTranscript(transcript: TranscriptSegment[], includeTimestamps: boolean): string {
  if (includeTimestamps) {
    return transcript
      .map(s => `${formatTimestamp(s.start)} ${s.text}`)
      .join('\n');
  }
  return transcript.map(s => s.text).join(' ');
}

export function buildVideoSummaryPrompt(
  transcript: TranscriptSegment[],
  summaryType: SummaryType,
  languageCode: string,
  adsPreference: AdsPreference,
  customPromptText?: string,
  videoDetails?: VideoDetails
): string {
  const includeTimestamps = summaryType === 'timestamps' || (summaryType === 'custom' && !!customPromptText?.toLowerCase().includes('timestamp'));
  const fullTranscriptText = formatTranscript(transcript, includeTimestamps);
  const targetLanguageName = getLanguageName(languageCode);

  const videoTitle = videoDetails?.title || 'Unknown Title';
  const videoChannel = videoDetails?.channel || 'Unknown Channel';

  let adsSponsorPromptSection = "";
  if (adsPreference === "section") {
    adsSponsorPromptSection = `
---
<!-- BEGIN_ADS_SECTION -->
## 📺 Potential Ads & Sponsorships
*(This section lists items that appear to be advertisements, sponsorships, or promotions for paid products/services mentioned by the speaker. If no such content is identified, omit this entire section.)*
[Identify and list any content that appears to be promotions of paid products, sponsorships, or affiliate marketing. Use bullet points.]
<!-- END_ADS_SECTION -->`;
  }

  const mandatoryHeaderInstruction = `
### MANDATORY OUTPUT HEADER ###
Video Title: "${videoTitle}"
Channel Name: "${videoChannel}"

Your response MUST ALWAYS begin with an H1 heading formatted exactly as follows at the very top of your output (do NOT add any introductory text like "Here is a summary"):
# Summary: "${videoTitle}" (${videoChannel})
(Translate the word "Summary" into **${targetLanguageName}**, e.g. "Riassunto", "Resumen", "Résumé", "Zusammenfassung", etc.)
`;

  const commonInstructions = `
${mandatoryHeaderInstruction}

You are given a transcript from a YouTube video.
The user wants the summary in **${targetLanguageName}**.
${adsPreference === "erase" ? "**IMPORTANT: Do NOT include any advertisements, sponsorships, or promotional content in your summary. Focus exclusively on the informational and educational content of the video.**" : ""}

Transcript:
---
${fullTranscriptText}
---
`;

  const commonFormattingRules = `
Formatting rules:
- Use **bold** for important terms, key concepts, company names, people, and framework titles.
- Use *italic* for emphasis or non-English terms.
- Use > for notable direct quotes from the transcript that encapsulate a key point.
- Use \`code\` for technical terms, metrics, or specific software names.
- Be direct and ensure the entire summary is in **${targetLanguageName}**. Do not use introductory phrases like "Here's a summary..." or "This video is about...".`;

  let promptBody = "";

  switch (summaryType) {
    case "custom":
      if (customPromptText && customPromptText.trim()) {
        let userPrompt = customPromptText.trim();
        if (userPrompt.includes('{transcript}')) {
          userPrompt = userPrompt.replaceAll('{transcript}', fullTranscriptText);
        } else {
          userPrompt += `\n\nProvide the response in **${targetLanguageName}**.\n\nTranscript:\n---\n${fullTranscriptText}\n---`;
        }
        promptBody = `${mandatoryHeaderInstruction}\n\n${userPrompt}`;
      } else {
        // Fallback if custom prompt text is empty
        promptBody = `${mandatoryHeaderInstruction}\n\n${commonInstructions}\n# Summary\n[Summarize the key points in ${targetLanguageName}.]\n${commonFormattingRules}`;
      }
      break;

    case "concise":
      promptBody = `
${commonInstructions}
Required format:

# TLDR
[A concise 1-2 sentence overview summarizing the video's main purpose and key takeaway.]

# Key Learnings
[Provide a **brief summary** of the main content in a few short paragraphs or a bulleted list covering core messages.]

---
# Actionable Insights & Calls to Action
[Identify and list any specific tasks, actionable advice, or direct non-promotional calls to action for the viewer.]

${commonFormattingRules}
${adsSponsorPromptSection}
`;
      break;

    case "nested_bullet_points":
      promptBody = `
${commonInstructions}
Required format:

# TLDR
[A concise 2-3 sentence overview summarizing the video's main purpose and key takeaways.]

# Detailed Outline
[Provide a detailed summary of the main content structured as a **hierarchical, nested list of bullet points**.]

---
# Actionable Insights & Calls to Action
[Identify and list any specific tasks, assignments, or non-promotional calls to action.]

${commonFormattingRules}
${adsSponsorPromptSection}
`;
      break;

    case "timestamps":
      promptBody = `
${commonInstructions}
Required format:

# TLDR
[A concise 2-3 sentence overview summarizing the video's main purpose.]

# Key Learnings & Timestamps
[Under this section, list chronological entries in format '[TIMESTAMP] :: Description'. Example: '[01:23] :: Main concept discussed.']

---
# Actionable Insights & Calls to Action
[Identify key actionable advice.]

${commonFormattingRules}
${adsSponsorPromptSection}
`;
      break;

    case "extended":
    case "medium":
    default:
      promptBody = `
${commonInstructions}
Required format:

# TLDR
[A concise 2-3 sentence overview summarizing the video's main purpose, core topics, and key takeaways.]

# Key Learnings
[Provide a **balanced summary** structured into clear, well-written paragraphs capturing main arguments and key examples.]

---
# Actionable Insights & Calls to Action
[Identify and list any specific non-promotional actionable insights or recommendations.]

${commonFormattingRules}
${adsSponsorPromptSection}
`;
      break;
  }

  return promptBody.trim();
}

export function buildCommentSummaryPrompt(
  comments: VideoComment[],
  languageCode: string
): string {
  const targetLanguageName = getLanguageName(languageCode);

  let formattedComments = "";
  if (comments.length === 0) {
    formattedComments = "No comments available for analysis.";
  } else {
    comments.forEach((comment, index) => {
      formattedComments += `\n--- Comment ${index + 1} ---\n`;
      formattedComments += `Author: @${comment.author}\n`;
      formattedComments += `Likes: ${comment.likeCount || 0}\n`;
      formattedComments += `Text: ${comment.text}\n`;
    });
  }

  return `
You are provided with a selection of YouTube video comments. Your task is to analyze these comments in depth and provide a comprehensive summary.
**The entire summary, including all quotes and summaries, MUST be in ${targetLanguageName}.**

Please structure your summary as follows:

# Comments Overview
[Provide a brief, 1-2 sentence general sentiment of the comments. Overall tone and common reactions.]

# Key Discussion Themes
[Identify 3-5 main themes or topics frequently discussed. Use bullet points.]

# Notable Debates & Opinions
[Highlight significant debates or insightful opinions. Mention usernames (e.g. **@username**) and direct quotes using blockquotes (>).]

# Actionable Feedback or Questions
[List key questions to the content creator or constructive suggestions.]

Formatting Guidelines:
- Use Markdown.
- Use **bold** for usernames and key terms.
- Be objective, detailed, and concise.

Here are the selected comments:
---
${formattedComments}
---
`.trim();
}
