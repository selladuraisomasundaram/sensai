import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Extracts playlist identifier from various YouTube URL formats.
 */
function extractPlaylistId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{18,}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Fetches playlist metadata and videos directly via YouTube Innertube API without external dependencies.
 */
async function fetchYouTubePlaylist(playlistId: string, limit = 50) {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`YouTube responded with HTTP ${res.status}`);
  }

  const html = await res.text();
  const apiKeyMatch =
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
    html.match(/"innertubeApiKey":"([^"]+)"/);
  const clientVerMatch =
    html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/) ||
    html.match(/"clientVersion":"([^"]+)"/);

  const apiKey = apiKeyMatch ? apiKeyMatch[1] : 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const clientVer = clientVerMatch ? clientVerMatch[1] : '2.20240101.01.00';

  const browseRes = await fetch(
    `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`,
    {
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
            clientVersion: clientVer,
            hl: 'en',
            gl: 'US',
          },
        },
        browseId: `VL${playlistId}`,
      }),
    }
  );

  if (!browseRes.ok) {
    throw new Error(`Innertube browse endpoint failed with HTTP ${browseRes.status}`);
  }

  const data = await browseRes.json();

  // Extract playlist title and author
  const header =
    data.header?.playlistHeaderRenderer ||
    data.header?.carouselHeaderRenderer;
  const playlistTitle =
    header?.title?.simpleText ||
    header?.title?.runs?.[0]?.text ||
    'YouTube Playlist';

  const author =
    header?.ownerText?.runs?.[0]?.text ||
    header?.ownerText?.simpleText ||
    'YouTube Creator';

  // Recursive finder for target renderer objects
  function findObjects(obj: any, targetKey: string, results: any[] = []): any[] {
    if (!obj || typeof obj !== 'object') return results;
    if (obj[targetKey]) results.push(obj[targetKey]);
    for (const key of Object.keys(obj)) {
      findObjects(obj[key], targetKey, results);
    }
    return results;
  }

  const videos: Array<{
    index: number;
    id: string;
    title: string;
    url: string;
    duration?: string;
  }> = [];
  const seenIds = new Set<string>();

  // 1. Check modern lockupViewModel structure
  const lockups = findObjects(data, 'lockupViewModel');
  for (const lockup of lockups) {
    const id = lockup.contentId;
    if (id && typeof id === 'string' && id.length === 11 && !seenIds.has(id)) {
      seenIds.add(id);
      const title =
        lockup.metadata?.lockupMetadataViewModel?.title?.content ||
        'Untitled Lesson';
      videos.push({
        index: videos.length + 1,
        id,
        title,
        url: `https://www.youtube.com/watch?v=${id}`,
      });
      if (videos.length >= limit) break;
    }
  }

  // 2. Fallback to legacy playlistVideoRenderer structure if lockupViewModel was not present
  if (videos.length === 0) {
    const renderers = findObjects(data, 'playlistVideoRenderer');
    for (const r of renderers) {
      const id = r.videoId;
      if (id && typeof id === 'string' && id.length === 11 && !seenIds.has(id)) {
        seenIds.add(id);
        const title =
          r.title?.runs?.[0]?.text || r.title?.simpleText || 'Untitled Lesson';
        const duration = r.lengthText?.simpleText;
        videos.push({
          index: videos.length + 1,
          id,
          title,
          url: `https://www.youtube.com/watch?v=${id}`,
          duration,
        });
        if (videos.length >= limit) break;
      }
    }
  }

  return {
    playlistId,
    playlistTitle,
    author,
    totalVideos: videos.length,
    videos,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const url = body?.url?.trim();

    if (!url) {
      return NextResponse.json(
        { error: 'Missing playlist URL in request body.' },
        { status: 400 }
      );
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid playlist URL: Could not extract a legitimate playlist ID.' },
        { status: 400 }
      );
    }

    const playlist = await fetchYouTubePlaylist(playlistId, 50);

    if (!playlist || playlist.videos.length === 0) {
      return NextResponse.json(
        { error: 'Playlist is empty, unlisted, or private.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playlistId,
      playlistTitle: playlist.playlistTitle,
      author: playlist.author,
      totalVideos: playlist.totalVideos,
      videos: playlist.videos,
    });
  } catch (err: any) {
    console.error('Playlist infiltration exception:', err);
    return NextResponse.json(
      {
        error:
          err.message ||
          'Failed to infiltrate YouTube playlist. Verify the playlist is public and accessible.',
      },
      { status: 500 }
    );
  }
}
