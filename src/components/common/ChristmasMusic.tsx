// src/components/common/ChristmasMusic.tsx
import React, { useState, useRef, useEffect } from "react";

// 1) 로컬 mp3 (public) 우선 사용
// 2) 외부 백업 소스 (FMA)
const CHRISTMAS_MUSIC_SOURCES = [
  "/04.We%20Wish%20You%20A%20Merry%20Christmas.mp3",
  "/05.Jingle%20Bell(Flute).mp3",
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Scott_Holmes_Music/Happy_Music/Scott_Holmes_Music_-_Christmas_Spirit.mp3",
] as const;

const ChristmasMusic: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showVolume, setShowVolume] = useState(false);
  const [sourceIdx, setSourceIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 저장된 설정 불러오기
    const savedVolume = localStorage.getItem("xmas_music_volume");
    const savedPlaying = localStorage.getItem("xmas_music_playing");
    
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
    }
    if (savedPlaying === "true") {
      setIsPlaying(true);
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      localStorage.setItem("xmas_music_volume", volume.toString());
    }
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("xmas_music_playing", isPlaying.toString());

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          // 자동 재생 차단됨 - 사용자 인터랙션 필요
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [sourceIdx, isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className="relative"
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
      >
        {/* 볼륨 슬라이더 */}
        {showVolume && (
          <div className="absolute bottom-full right-0 mb-2 p-3 bg-slate-800/95 rounded-xl border border-emerald-500/30 shadow-lg backdrop-blur-sm">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-2 bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-emerald-200 mt-1 text-center">{Math.round(volume * 100)}%</p>
          </div>
        )}
        
        {/* 재생 버튼 */}
        <button
          onClick={togglePlay}
          className={`
            flex items-center justify-center w-14 h-14 rounded-full 
            shadow-lg transition-all duration-300 transform hover:scale-110
            ${isPlaying 
              ? "bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400/50 animate-pulse" 
              : "bg-gradient-to-br from-emerald-600 to-emerald-800 border-2 border-emerald-400/50"
            }
          `}
          title={isPlaying ? "음악 끄기" : "크리스마스 캐롤 재생"}
        >
          {isPlaying ? (
            <span className="text-2xl">🔔</span>
          ) : (
            <span className="text-2xl">🎵</span>
          )}
        </button>
        
        {/* 재생 중 표시 */}
        {isPlaying && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
        )}
      </div>
      
      {/* 오디오 요소 */}
      <audio
        ref={audioRef}
        src={CHRISTMAS_MUSIC_SOURCES[sourceIdx]}
        loop
        preload="auto"
        onError={() => {
          setSourceIdx((idx) => {
            const next = idx + 1;
            if (next < CHRISTMAS_MUSIC_SOURCES.length) {
              return next;
            }
            setIsPlaying(false);
            return idx;
          });
        }}
      />
    </div>
  );
};

export default ChristmasMusic;
