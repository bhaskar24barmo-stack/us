import { motion } from 'framer-motion';
import { Mic, Pause, Play, Send, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VoiceRecorderBarProps {
  onSend: (url: string, durationSec: number, blob?: Blob) => void;
  onCancel: () => void;
}

export default function VoiceRecorderBar({ onSend, onCancel }: VoiceRecorderBarProps) {
  const [status, setStatus] = useState<'requesting' | 'recording' | 'preview' | 'error'>('requesting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setStatus('error');
        setErrorMsg('Voice recording is not supported in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const preferredMime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(
          (m) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)
        );
        const rec = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
        recorderRef.current = rec;
        chunksRef.current = [];

        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setStatus('preview');
          stream.getTracks().forEach((t) => t.stop());
        };

        rec.start();
        setStatus('recording');
        timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Microphone permission denied.');
      }
    }

    void start();
    return () => {
      active = false;
      if (timer) clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }

  function handleDiscard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  function togglePlay() {
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

  function cycleSpeed() {
    const next: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (status === 'error') {
    return (
      <div className="glass-strong rounded-2xl p-3 flex items-center justify-between gap-3 border border-rose-500/30">
        <div className="flex items-center gap-2 text-xs text-rose-200">
          <Mic className="h-4 w-4 text-rose-glow shrink-0" />
          <span>{errorMsg}</span>
        </div>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-xl bg-white/10">
          Close
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl px-3.5 py-2.5 flex items-center gap-3 border border-rose-glow/30"
    >
      <button
        type="button"
        onClick={handleDiscard}
        aria-label="Delete voice note"
        className="h-9 w-9 rounded-full bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-white/70 hover:text-rose-300"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {status === 'recording' || status === 'requesting' ? (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-rose-glow animate-ping" />
          <div className="flex-1 flex items-center gap-1 h-6 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ height: ['20%', `${35 + ((i * 19) % 65)}%`, '25%'] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.05 }}
                className="w-1 rounded-full bg-love-gradient"
              />
            ))}
          </div>
          <span className="text-xs font-mono text-rose-soft">{fmt(seconds)}</span>
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Stop recording"
            className="h-9 w-9 rounded-full bg-rose-glow text-white flex items-center justify-center shadow-glow-pink"
          >
            <Square className="h-3.5 w-3.5 fill-white" />
          </button>
        </>
      ) : (
        <>
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          )}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <div className="flex-1 text-xs text-white/80">Voice note • {fmt(seconds)}</div>
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2 py-1 rounded-lg bg-white/10 text-[11px] font-mono text-white/80"
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={() => audioUrl && onSend(audioUrl, Math.max(1, seconds), recordedBlob || undefined)}
            aria-label="Send voice note"
            className="h-9 w-9 rounded-full bg-love-gradient text-white flex items-center justify-center shadow-glow-pink"
          >
            <Send className="h-4 w-4" />
          </button>
        </>
      )}
    </motion.div>
  );
}
