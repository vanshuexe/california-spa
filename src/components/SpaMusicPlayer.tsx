import React, { useState, useRef, useEffect } from 'react';

export const SpaMusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthOscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const audio = new Audio('/assets/audio/website-background-music_main.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      audio.pause();
      if (synthOscillatorRef.current) {
        try {
          synthOscillatorRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthOscillatorRef.current) {
        try {
          synthOscillatorRef.current.stop();
          synthOscillatorRef.current = null;
        } catch {
          // ignore
        }
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Fallback to soothing ambient harmonic chord using Web Audio API
            try {
              const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              const ctx = new AudioCtx();
              audioCtxRef.current = ctx;

              // Gentle 432Hz ambient chord (healing meditative frequency)
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(432, ctx.currentTime);
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              synthOscillatorRef.current = osc;
              setIsPlaying(true);
            } catch (err) {
              console.warn('Audio playback error:', err);
            }
          });
      }
    }
  };

  return (
    <div className="spa-music" id="spaBgMusic">
      <button
        id="spaBgMusicBtn"
        type="button"
        className={`spa-music-btn ${isPlaying ? 'is-playing' : ''}`}
        aria-label="Play background music"
        aria-pressed={isPlaying}
        onClick={togglePlay}
        title={isPlaying ? 'Pause soothing music' : 'Play soothing spa music'}
      >
        <span className="spa-music-icon flex items-center justify-center">
          {isPlaying ? (
            <svg
              className="w-5 h-5 text-[#b30af3]"
              fill="none"
              stroke="#b30af3"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="2" width="20" height="20" rx="3.5" stroke="#b30af3" />
              <rect x="8" y="7" width="3" height="10" fill="#b30af3" />
              <rect x="13" y="7" width="3" height="10" fill="#b30af3" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-[#b30af3]"
              fill="none"
              stroke="#b30af3"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="2" width="20" height="20" rx="3.5" stroke="#b30af3" />
              <polygon points="9,7 17,12 9,17" fill="#b30af3" />
            </svg>
          )}
        </span>
        <span className="spa-music-label">
          {isPlaying ? 'Playing Music' : 'Music'}
        </span>
      </button>
    </div>
  );
};
