'use client';

import React, { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer as YTPlayerInstance } from 'react-youtube';

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onReadyInstance?: (player: YTPlayerInstance) => void;
}

export default function YouTubePlayer({
  videoId,
  onTimeUpdate,
  onReadyInstance,
}: YouTubePlayerProps) {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const res = playerRef.current.getCurrentTime();
          if (res && typeof res.then === 'function') {
            res.then((time: number) => onTimeUpdate(Number(time) || 0));
          } else if (typeof res === 'number') {
            onTimeUpdate(res);
          }
        } catch (err) {
          console.warn('Polling error getting current time:', err);
        }
      }
    }, 500);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    if (onReadyInstance) {
      onReadyInstance(event.target);
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
    if (event.data === 1) {
      startPolling();
    } else {
      stopPolling();
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const res = playerRef.current.getCurrentTime();
          if (res && typeof res.then === 'function') {
            res.then((time: number) => onTimeUpdate(Number(time) || 0));
          } else if (typeof res === 'number') {
            onTimeUpdate(res);
          }
        } catch (err) {
          console.warn('Failed to get current time on state change:', err);
        }
      }
    }
  };

  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      iv_load_policy: 3,
    },
  };

  return (
    <div className="w-full relative aspect-video bg-black border border-zinc-900 shadow-2xl overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onPlayerReady}
        onStateChange={onPlayerStateChange}
        className="w-full h-full absolute inset-0"
        iframeClassName="w-full h-full"
      />
    </div>
  );
}

