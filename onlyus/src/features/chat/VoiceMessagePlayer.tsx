import { Pause, Play } from 'lucide-react';
import { useRef, useState } from 'react';

export default function VoiceMessagePlayer({ url, durationSec = 4 }: { url: string; durationSec?: number }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.playbackRate = speed;
      void el.play();
      setPlaying(true);
    }
  }

  function nextSpeed() {
    const next: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 hover:bg-white/25 transition-colors"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-0.5 h-5">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            style={{ height: `${30 + ((i * 23) % 70)}%` }}
            className={`w-1 rounded-full transition-colors ${
              playing ? 'bg-white animate-pulse' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono text-white/75">{fmt(durationSec)}</span>
      <button
        type="button"
        onClick={nextSpeed}
        className="px-1.5 py-0.5 rounded-md bg-white/15 text-[10px] font-mono"
      >
        {speed}x
      </button>
    </div>
  );
}
