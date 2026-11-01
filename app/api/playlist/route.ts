import { NextRequest, NextResponse } from 'next/server';
import ytpl from 'ytpl';

export const runtime = 'nodejs';

/**
 * Extracts and validates playlist identifier from various YouTube URL formats.
 */
function extractPlaylistId(url: string): string | null {
  try {
    if (ytpl.validateID(url)) {
      return url;
    }
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (err) {
    console.warn('Playlist ID parsing exception:', err);
  }
  return null;
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

    // Fetch playlist items (limit to 50 videos to prevent huge unbounded loads)
    const playlist = await ytpl(playlistId, { limit: 50 });

    if (!playlist || !playlist.items || playlist.items.length === 0) {
      return NextResponse.json(
        { error: 'Playlist is empty, unlisted, or private.' },
        { status: 404 }
      );
    }

    const videos = playlist.items.map((item, index) => ({
      index: index + 1,
      id: item.id,
      title: item.title,
      url: item.shortUrl || `https://www.youtube.com/watch?v=${item.id}`,
      duration: item.duration,
      thumbnails: item.thumbnails,
    }));

    return NextResponse.json({
      success: true,
      playlistId,
      playlistTitle: playlist.title,
      author: playlist.author?.name || 'Unknown Creator',
      totalVideos: videos.length,
      videos,
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

