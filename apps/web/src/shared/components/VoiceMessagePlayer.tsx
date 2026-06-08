import { useEffect, useRef, useState } from 'react';

type VoiceMessagePlayerProps = {
  voiceUrl: string;
  duration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
};

export const VoiceMessagePlayer = ({
  voiceUrl,
  duration,
  isPlaying,
  onPlay,
  onPause,
  onEnded
}: VoiceMessagePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.src = voiceUrl;
    audioRef.current.onloadedmetadata = () => setAudioReady(true);
    audioRef.current.onended = () => {
      setCurrentTime(0);
      onEnded();
    };
    audioRef.current.onerror = () => {
      console.error('Audio error');
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [voiceUrl, onEnded]);

  useEffect(() => {
    if (!audioRef.current || !audioReady) return;

    if (isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioReady]);

  useEffect(() => {
    if (!audioRef.current) return;

    const updateTime = () => setCurrentTime(audioRef.current?.currentTime || 0);
    audioRef.current.addEventListener('timeupdate', updateTime);
    return () => audioRef.current?.removeEventListener('timeupdate', updateTime);
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 group">
      {/* Play/Pause Button */}
      <button
        onClick={() => isPlaying ? onPause() : onPlay()}
        className={`
          relative
          w-12 
          h-12 
          rounded-full 
          flex 
          items-center 
          justify-center 
          flex-shrink-0
          transition-all 
          duration-300
          shadow-lg
          hover:shadow-xl
          transform
          hover:scale-105
          active:scale-95
          ${isPlaying 
            ? 'bg-gradient-to-br from-[#3390ec] to-[#2874c6] text-white' 
            : 'bg-gradient-to-br from-[#8ecae6] to-[#6fb3d9] text-white hover:from-[#7bb8d6] hover:to-[#5ea8d0]'
          }
        `}
        title={`Голосовое сообщение: ${formatTime(duration)}`}
      >
        {/* Pulse animation when playing */}
        {isPlaying && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[#3390ec]/30" />
        )}
        
        {/* Icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          {isPlaying ? (
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-4 bg-white rounded animate-pulse" />
              <div className="w-1.5 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '0.15s' }} />
            </div>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <polygon points="7,4 15,10 7,16" />
            </svg>
          )}
        </div>
      </button>

      {/* Progress & Time */}
      <div className="flex-1 min-w-0">
        {/* Wave animation when playing */}
        {isPlaying && (
          <div className="flex items-center gap-0.5 h-4 mb-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-[#3390ec] rounded-full animate-pulse"
                style={{
                  height: `${8 + ((i + Date.now() % 3) * 4)}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div 
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden group-hover:bg-gray-300 transition-colors"
          onClick={handleProgressClick}
        >
          {/* Background wave pattern */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path 
                d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" 
                stroke="#3390ec" 
                strokeWidth="1" 
                fill="none"
              />
            </svg>
          </div>
          
          {/* Progress fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#3390ec] to-[#5ba3f0] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          
          {/* Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[#3390ec] font-medium">
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
