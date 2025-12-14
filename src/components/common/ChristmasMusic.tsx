// src/components/common/ChristmasMusic.tsx
import React, { useState, useRef, useEffect } from "react";

// 무료 크리스마스 캐롤 URL (로열티 프리)
const CHRISTMAS_MUSIC_URL = "https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3";

const ChristmasMusic: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showVolume, setShowVolume] = useState(false);
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
        src={CHRISTMAS_MUSIC_URL}
        loop
        preload="auto"
      />
    </div>
  );
};

export default ChristmasMusic;
