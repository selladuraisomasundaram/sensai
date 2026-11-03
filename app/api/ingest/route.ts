import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { supabase } from '@/lib/supabaseClient';
import { callGemini } from '@/lib/gemini';
import type { VideoDomain } from '@/types/course';

export const runtime = 'nodejs';

const VALID_DOMAINS: readonly VideoDomain[] = [
  'technical_coding',
  'podcast_debate',
  'academic_lecture',
  'diy_hardware',
  'software_walkthrough',
] as const;

/**
 * Extracts standard 11-character YouTube video ID from various URL formats.
 */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * Attempts to retrieve video title via YouTube oEmbed API without requiring a Google API key.
 */
async function fetchVideoMetadata(videoId: string): Promise<{ title: string }> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.title) {
        return { title: data.title };
      }
    }
  } catch (err) {
    console.warn('oEmbed title resolution failed, falling back to identifier:', err);
  }
  return { title: `YouTube Target [${videoId}]` };
}

/**
 * Extracts chapter markers/timestamps from creator video description if present.
 */
function extractChaptersFromDescription(description: string, totalDurationSeconds: number) {
  const lines = description.split('\n');
  const chapters: Array<{ title: string; start: string; startSec: number }> = [];
  const timeRegex = /(?:^|\s)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\s*[-–—|:]\s*|\s+)(.+)$/;

  for (const line of lines) {
    const match = line.trim().match(timeRegex);
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const startSec = hours * 3600 + minutes * 60 + seconds;
      const title = match[4].trim();
      if (title && (!totalDurationSeconds || startSec < totalDurationSeconds)) {
        chapters.push({
          title,
          start: `${hours > 0 ? hours + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          startSec,
        });
      }
    }
  }
  return chapters;
}

/**
 * Retrieves full video metadata, syllabus notes, and keywords via YouTube Innertube
 * player API when closed captions are unavailable.
 */
async function fetchVideoFallbackDetails(videoId: string) {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        videoId: videoId,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const details = data.videoDetails || {};

    const durationSec = parseInt(details.lengthSeconds || '0', 10);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return {
      title: details.title || `YouTube Target [${videoId}]`,
      author: details.author || 'YouTube Creator',
      durationSeconds: durationSec,
      durationFormatted,
      description: details.shortDescription || '',
      keywords: Array.isArray(details.keywords) ? details.keywords : [],
    };
  } catch (err) {
    console.warn('Fallback metadata extraction exception:', err);
    return null;
  }
}

/**
 * Classifier Node: Invokes user's LLM using BYOK from Authorization header.
 * Categorizes content into the 5 universal pillars of informative learning.
 */
async function classifyContentWithLLM(
  apiKey: string,
  title: string,
  transcriptSample: string
): Promise<VideoDomain> {
  const systemInstruction = `You are Sensai's universal classification node.
Analyze the video title and transcript excerpt to categorize the content into EXACTLY ONE domain from this strict 5-pillar enum:
- technical_coding    : Programming tutorials, software architecture, CLI guides, debugging, web development, coding.
- podcast_debate      : Multi-speaker dialogues, interviews, conversational panels, long-form discussion, debates.
- academic_lecture    : Theoretical mathematics, formal science, humanities, history, university lectures.
- diy_hardware        : Physical electronics, robotics, Arduino/Raspberry Pi, 3D printing, carpentry, mechanical repair.
- software_walkthrough : Productivity app workflows (Figma, Notion, Excel, Blender, Adobe), UI navigation, tool shortcuts.

Respond with ONLY the raw enum string without quotes, formatting, explanation, or punctuation.`;

  const userPrompt = `Title: ${title}\n\nTranscript Sample:\n${transcriptSample}`;

  let rawOutput = '';

  // Branch 1: Google Gemini API (AIza...)
  if (apiKey.startsWith('AIza')) {
    rawOutput = await callGemini(apiKey, systemInstruction, userPrompt, false);
  }
  // Branch 2: Anthropic API (sk-ant...)
  else if (apiKey.startsWith('sk-ant')) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 25,
        temperature: 0.1,
        system: systemInstruction,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Anthropic Classification failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    rawOutput = data.content?.[0]?.text || '';
  }
  // Branch 3: OpenAI & Compatible Providers (sk-...)
  else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 25,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`LLM Classification failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    rawOutput = data.choices?.[0]?.message?.content || '';
  }

  // Sanitize and match against strict 5-pillar enum
  const sanitized = rawOutput.trim().toLowerCase().replace(/[`"'\n\r]/g, '');
  const matched = VALID_DOMAINS.find((domain) => sanitized.includes(domain));

  return matched || 'technical_coding';
}

export async function POST(req: NextRequest) {
  let courseIdToFail: string | null = null;

  try {
    // 1. Enforce Zero-Trust BYOK via Authorization Header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Zero-Trust Protocol: Missing or malformed Authorization header. Supply LLM key as Bearer token.' },
        { status: 401 }
      );
    }
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Empty LLM API key supplied.' },
        { status: 401 }
      );
    }

    // 2. Parse payload
    const body = await req.json().catch(() => null);
    if (!body || !body.url || !body.courseId) {
      return NextResponse.json(
        { error: 'Invalid payload: "url" and "courseId" are strictly required.' },
        { status: 400 }
      );
    }

    const { url, courseId } = body;
    courseIdToFail = courseId;

    // 3. Extract and validate YouTube Target ID
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid target: Unable to parse YouTube video ID from URL.' },
        { status: 400 }
      );
    }

    // 4. Ingestion: Fetch Transcript or Fallback to Deep Metadata & Syllabus Synthesis
    let transcriptItems: Array<{ text: string; duration: number; offset: number }> = [];
    let fullTranscriptText = '';
    let isSynthesized = false;
    let videoTitle = `YouTube Target [${videoId}]`;

    // Step 4A: Attempt standard closed-captions extraction
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptItems && transcriptItems.length > 0) {
        fullTranscriptText = transcriptItems.map((item) => item.text).join(' ');
      }
    } catch (transcriptErr: any) {
      console.info(
        `Closed captions unavailable for [${videoId}]. Engaging Deep Metadata & Syllabus Synthesis Node.`
      );
    }

    // Step 4B: If captions disabled or empty, synthesize from deep Innertube metadata
    if (!fullTranscriptText || fullTranscriptText.trim().length === 0) {
      const fallbackDetails = await fetchVideoFallbackDetails(videoId);

      if (!fallbackDetails) {
        // Video is completely private, removed, or unavailable
        await supabase
          .from('courses')
          .update({ status: 'failed' })
          .eq('id', courseId);

        return NextResponse.json(
          {
            error: 'Target inaccessible: The video is private, removed, or unavailable on YouTube.',
            details: 'VIDEO_UNAVAILABLE',
          },
          { status: 422 }
        );
      }

      isSynthesized = true;
      videoTitle = fallbackDetails.title;

      // Check for timestamp chapters in description
      const chapters = extractChaptersFromDescription(
        fallbackDetails.description,
        fallbackDetails.durationSeconds
      );

      const chapterText =
        chapters.length > 0
          ? `Verified Timeline & Creator Chapters:\n` +
            chapters.map((c) => `- ${c.start} : ${c.title}`).join('\n')
          : `No explicit timeline in description. Evenly distribute modules across duration: 00:00 to ${fallbackDetails.durationFormatted}.`;

      fullTranscriptText = `=== TARGET BRIEFING (NO CLOSED CAPTIONS - SYLLABUS SYNTHESIS MODE) ===
Video Title: ${fallbackDetails.title}
Creator / Channel: ${fallbackDetails.author}
Total Runtime: ${fallbackDetails.durationFormatted} (${fallbackDetails.durationSeconds} seconds)
Target Tags: ${fallbackDetails.keywords.slice(0, 15).join(', ')}

${chapterText}

Creator Description & Detailed Syllabus Notes:
${fallbackDetails.description.slice(0, 4000)}
=== END BRIEFING ===`;

      transcriptItems = [
        { text: fallbackDetails.title, duration: fallbackDetails.durationSeconds, offset: 0 },
      ];
    } else {
      // 5. Metadata Resolution for captioned video
      const meta = await fetchVideoMetadata(videoId);
      videoTitle = meta.title;
    }

    // 6. The Classifier Node: Sample first 1000 words
    const sampleWords = fullTranscriptText.split(/\s+/).slice(0, 1000).join(' ');
    const classifiedDomain = await classifyContentWithLLM(apiKey, videoTitle, sampleWords);

    // 7. Database Update: Mutate course record with classification
    const { error: dbError } = await supabase
      .from('courses')
      .update({
        video_title: videoTitle,
        domain_type: classifiedDomain,
        status: 'processing',
      })
      .eq('id', courseId);

    if (dbError) {
      console.error('Supabase update failure:', dbError);
      return NextResponse.json(
        { error: `Database persistence error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 8. Return Ingestion & Classification Result
    return NextResponse.json({
      success: true,
      courseId,
      videoId,
      videoTitle,
      domainType: classifiedDomain,
      status: 'processing',
      isSynthesized,
      transcript: fullTranscriptText,
      transcriptItems: transcriptItems,
      transcriptWordCount: fullTranscriptText.split(/\s+/).length,
      intervalCount: transcriptItems.length,
    });
  } catch (err: any) {
    console.error('Ingestion pipeline exception:', err);

    if (courseIdToFail) {
      await supabase
        .from('courses')
        .update({ status: 'failed' })
        .eq('id', courseIdToFail);
    }

    return NextResponse.json(
      { error: err.message || 'Fatal error encountered during target ingestion.' },
      { status: 500 }
    );
  }
}
