import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Subtitles,
  Settings,
  ArrowLeft,
  FastForward,
  Check,
  Tv,
} from 'lucide-react';
import Hls from 'hls.js';
import { api, type MediaFile } from '../lib/api';

export interface VideoPlayerProps {
  mediaItemId: string;
  episodeId?: string;
  title: string;
  subtitle?: string; // e.g. "S1:E1 Pilot"
  file: MediaFile;
  initialTime?: number;
  onClose: () => void;
  nextEpisode?: {
    episodeId: string;
    title: string;
    file: MediaFile;
  };
  onPlayNext?: () => void;
}

export function VideoPlayer({
  mediaItemId,
  episodeId,
  title,
  subtitle,
  file,
  initialTime = 0,
  onClose,
  nextEpisode,
  onPlayNext,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Quality & tracks
  const [streamType, setStreamType] = useState<'direct' | '1080p' | '720p' | '480p'>('direct');
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null); // stream index or null
  const [subtitleSize, setSubtitleSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);

  // Next Episode Countdown
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(10);
  const [nextCancelled, setNextCancelled] = useState(false);

  // Mobile double-tap seek indicators
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);

  // ─── Stream URL Builder ───
  const getStreamUrl = useCallback(
    (type: string) => {
      if (type === 'direct') {
        return `/api/v1/stream/${file.id}/direct`;
      }
      return `/api/v1/stream/${file.id}/hls/variant/${type}/index.m3u8`;
    },
    [file.id],
  );

  // ─── Initialize Video Source (Direct Play or HLS) ───
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = getStreamUrl(streamType);

    if (streamType === 'direct') {
      video.src = streamUrl;
      video.currentTime = initialTime;
      video.play().catch(() => {});
    } else {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.currentTime = initialTime;
          video.play().catch(() => {});
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.currentTime = initialTime;
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamType, file.id, getStreamUrl, initialTime]);

  // ─── Watch Progress Heartbeat (every 5 seconds) ───
  useEffect(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.duration > 0) {
        api.updateProgress({
          mediaItemId,
          episodeId,
          currentTime: video.currentTime,
          duration: video.duration,
        }).catch(() => {});
      }
    }, 5000);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [mediaItemId, episodeId]);

  // ─── Controls Auto-Hide ───
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettingsMenu(false);
        setShowSubtitlesMenu(false);
      }
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (!isFullscreen) {
            onClose();
          }
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ─── Playback Actions ───
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const adjustVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  // ─── Time Update Handler & Next Episode Check ───
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    // Check if > 92% and next episode exists
    if (
      nextEpisode &&
      !nextCancelled &&
      video.duration > 60 &&
      video.currentTime / video.duration > 0.92
    ) {
      if (!showNextPrompt) {
        setShowNextPrompt(true);
      }
    }
  };

  // Next episode countdown tick
  useEffect(() => {
    if (!showNextPrompt || nextCancelled) return;
    const interval = setInterval(() => {
      setNextCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showNextPrompt, nextCancelled, onPlayNext]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* ─── Video Element ─── */}
      <video
        ref={videoRef}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      >
        {/* Render subtitle track if selected */}
        {activeSubtitle !== null && (
          <track
            kind="subtitles"
            src={`/api/v1/stream/${file.id}/subtitles/${activeSubtitle}.vtt`}
            srcLang={file.subtitleStreams?.[activeSubtitle]?.language || 'en'}
            label={file.subtitleStreams?.[activeSubtitle]?.title || 'Subtitles'}
            default
          />
        )}
      </video>

      {/* ─── Mobile Double-Tap Seek Indicators ─── */}
      {doubleTapFeedback === 'left' && (
        <div className="absolute left-16 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-black/60 rounded-full w-24 h-24 pointer-events-none animate-pulse">
          <RotateCcw className="w-10 h-10 text-white" />
          <span className="text-xs font-bold text-white mt-1">-10s</span>
        </div>
      )}
      {doubleTapFeedback === 'right' && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-black/60 rounded-full w-24 h-24 pointer-events-none animate-pulse">
          <RotateCw className="w-10 h-10 text-white" />
          <span className="text-xs font-bold text-white mt-1">+10s</span>
        </div>
      )}

      {/* ─── Top Overlay Bar ─── */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Back to Omflix"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white drop-shadow">{title}</h2>
            {subtitle && <p className="text-sm text-neutral-400">{subtitle}</p>}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          {streamType === 'direct' ? (
            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Direct Play
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              NVENC Transcode ({streamType})
            </span>
          )}
        </div>
      </div>

      {/* ─── Next Episode Countdown Prompt ─── */}
      {showNextPrompt && nextEpisode && !nextCancelled && (
        <div className="absolute bottom-28 right-8 z-30 bg-neutral-900/90 border border-white/20 rounded-xl p-5 shadow-2xl backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Up Next in {nextCountdown}s
          </p>
          <h4 className="text-base font-bold text-white truncate mb-3">{nextEpisode.title}</h4>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPlayNext?.()}
              className="flex-1 py-2 px-4 rounded-lg bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
            >
              <FastForward className="w-4 h-4 fill-current" />
              Play Now
            </button>
            <button
              onClick={() => setNextCancelled(true)}
              className="py-2 px-4 rounded-lg bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Bottom Controls Overlay ─── */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="relative group mb-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#E50914] focus:outline-none transition-all group-hover:h-2.5"
          />
          <div
            className="absolute left-0 top-0 h-1.5 bg-[#E50914] rounded-lg pointer-events-none group-hover:h-2.5 transition-all"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center justify-between">
          {/* Left: Play/Pause, Seek, Volume, Timers */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-2 text-white hover:text-[#E50914] transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current" />}
            </button>

            <button
              onClick={() => seekBy(-10)}
              className="p-2 text-white/80 hover:text-white transition-colors"
              title="Seek -10s (Left Arrow)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => seekBy(10)}
              className="p-2 text-white/80 hover:text-white transition-colors"
              title="Seek +10s (Right Arrow)"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group">
              <button
                onClick={toggleMute}
                className="p-2 text-white/80 hover:text-white transition-colors"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-6 h-6 text-red-400" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                  }
                  setIsMuted(val === 0);
                }}
                className="w-0 group-hover:w-20 transition-all duration-200 h-1 bg-white/30 accent-white rounded cursor-pointer"
              />
            </div>

            {/* Time Indicator */}
            <span className="text-sm font-medium text-neutral-300 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Subtitles, Settings, PIP, Fullscreen */}
          <div className="flex items-center gap-3 relative">
            {/* Subtitles Button & Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSubtitlesMenu(!showSubtitlesMenu);
                  setShowSettingsMenu(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  activeSubtitle !== null
                    ? 'text-[#E50914] bg-white/10'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Subtitles (C)"
              >
                <Subtitles className="w-6 h-6" />
              </button>

              {showSubtitlesMenu && (
                <div className="absolute bottom-12 right-0 bg-neutral-950/95 border border-white/20 rounded-xl p-3 shadow-2xl backdrop-blur-lg w-64 z-40 animate-in fade-in">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 px-2">
                    Subtitles & Audio
                  </h4>

                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    <button
                      onClick={() => {
                        setActiveSubtitle(null);
                        setShowSubtitlesMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                        activeSubtitle === null
                          ? 'bg-white/20 text-white font-bold'
                          : 'text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      Off
                      {activeSubtitle === null && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {(file.subtitleStreams || []).map((sub) => (
                      <button
                        key={sub.index}
                        onClick={() => {
                          setActiveSubtitle(sub.index);
                          setShowSubtitlesMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                          activeSubtitle === sub.index
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">
                          {sub.language?.toUpperCase() || 'Track'} - {sub.title || sub.codec}
                        </span>
                        {activeSubtitle === sub.index && (
                          <Check className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Subtitle Size */}
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between px-2">
                    <span className="text-xs text-neutral-400">Size</span>
                    <div className="flex gap-1">
                      {(['sm', 'base', 'lg'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSubtitleSize(s)}
                          className={`px-2 py-0.5 text-xs rounded ${
                            subtitleSize === s ? 'bg-white text-black font-bold' : 'text-neutral-400'
                          }`}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quality & Speed Settings */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowSubtitlesMenu(false);
                }}
                className="p-2 text-white/80 hover:text-white transition-colors"
                title="Playback Settings"
              >
                <Settings className="w-6 h-6" />
              </button>

              {showSettingsMenu && (
                <div className="absolute bottom-12 right-0 bg-neutral-950/95 border border-white/20 rounded-xl p-3 shadow-2xl backdrop-blur-lg w-60 z-40 animate-in fade-in">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 px-2">
                    Quality
                  </h4>
                  <div className="space-y-1 mb-3">
                    {[
                      { key: 'direct', label: 'Original (Direct Play)' },
                      { key: '1080p', label: '1080p (Transcode)' },
                      { key: '720p', label: '720p (Transcode)' },
                      { key: '480p', label: '480p (Transcode)' },
                    ].map((q) => (
                      <button
                        key={q.key}
                        onClick={() => {
                          setStreamType(q.key as any);
                          setShowSettingsMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center justify-between ${
                          streamType === q.key
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        {q.label}
                        {streamType === q.key && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 px-2">
                    Speed
                  </h4>
                  <div className="grid grid-cols-4 gap-1 px-1">
                    {[0.75, 1, 1.25, 1.5].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`py-1 rounded text-xs text-center font-medium ${
                          playbackSpeed === s
                            ? 'bg-white text-black font-bold'
                            : 'text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Picture-in-Picture */}
            <button
              onClick={() => {
                if (document.pictureInPictureElement) {
                  document.exitPictureInPicture().catch(() => {});
                } else if (videoRef.current) {
                  videoRef.current.requestPictureInPicture().catch(() => {});
                }
              }}
              className="p-2 text-white/80 hover:text-white transition-colors"
              title="Picture-in-Picture"
            >
              <Tv className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
