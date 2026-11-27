import { AnimatePresence, motion } from 'framer-motion';
import {
  Flame,
  Heart,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Moon,
  Phone,
  PhoneOff,
  RefreshCw,
  Sparkles,
  Sun,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Ambient3DOrb from '@/components/Ambient3DOrb';
import { playSoftChime, triggerHeartbeatHaptic } from '@/services/notifications';
import { LiveKitCallAdapter } from '@/services/livekit';
import { CallSessionController } from '@/services/webrtc';
import { useAppStore } from '@/stores/useAppStore';

type RomanticFilter = 'none' | 'candlelight' | 'moonlight' | 'rose';

export default function ActiveCallOverlay() {
  const { activeCall, currentUserRole, pairCode, profiles, acceptCall, declineCall, endCall, toggleMinimizeCall, addLoveLetter } =
    useAppStore();

  const role = currentUserRole ?? 'me';
  const me = profiles[role];
  const partner = profiles[role === 'me' ? 'partner' : 'me'];

  const ctrlRef = useRef<CallSessionController | null>(null);
  const lkRef = useRef<LiveKitCallAdapter | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteMediaRef = useRef<HTMLDivElement | null>(null);

  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [elapsed, setElapsed] = useState(0);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [lkConnected, setLkConnected] = useState(false);
  const [callHearts, setCallHearts] = useState<Array<{ id: number; x: number; emoji: string }>>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [romanticFilter, setRomanticFilter] = useState<RomanticFilter>('candlelight');
  const [showCallSummary, setShowCallSummary] = useState(false);
  const [summaryDuration, setSummaryDuration] = useState(0);

  // Play gentle romantic chime and haptics on incoming/outgoing ring
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing') return;
    playSoftChime('ring');
    triggerHeartbeatHaptic();
    const t = setInterval(() => {
      playSoftChime('ring');
      triggerHeartbeatHaptic();
    }, 3800);
    return () => clearInterval(t);
  }, [activeCall?.status]);

  useEffect(() => {
    if (!activeCall) {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
      lkRef.current?.disconnect();
      lkRef.current = null;
      const t = setTimeout(() => {
        setElapsed(0);
        setMuted(false);
        setCamOff(false);
        setMediaErr(null);
        setHasLocalVideo(false);
        setHasRemoteVideo(false);
        setLkConnected(false);
        setCallHearts([]);
        setMicLevel(0);
      }, 0);
      return () => clearTimeout(t);
    }

    const ctrl = new CallSessionController();
    const lk = new LiveKitCallAdapter(`onlyus-${pairCode}`);
    ctrlRef.current = ctrl;
    lkRef.current = lk;
    void lk
      .connect(activeCall.kind, `${role}-${me.display_name}`, (el) => {
        const container = remoteMediaRef.current;
        if (!container) return;
        container.innerHTML = '';
        if (el) {
          el.className = 'h-full w-full object-cover transition-all duration-500';
          container.appendChild(el);
          setHasRemoteVideo(true);
        } else {
          setHasRemoteVideo(false);
        }
      })
      .then((res) => {
        setLkConnected(res.mode === 'livekit' && res.connectionState === 'connected');
      });

    let rafId = 0;
    let audioCtx: AudioContext | null = null;

    void ctrl.startLocalMedia(activeCall.kind, facing).then(({ stream, error }) => {
      if (error) setMediaErr(error);
      const hasVid = Boolean(stream && stream.getVideoTracks().length > 0);
      setHasLocalVideo(hasVid);
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (stream && stream.getAudioTracks().length > 0 && typeof AudioContext !== 'undefined') {
        try {
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setMicLevel(Math.min(1, avg / 90));
            rafId = requestAnimationFrame(tick);
          };
          tick();
        } catch {
          // Ignore audio restrictions
        }
      }
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (audioCtx) void audioCtx.close().catch(() => {});
      ctrl.dispose();
      lk.disconnect();
    };
  }, [activeCall?.id, activeCall?.kind, facing]);

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'active' || !activeCall.startedAt) return;
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - activeCall.startedAt!) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [activeCall?.status, activeCall?.startedAt]);

  function handleEndCallWithSummary() {
    if (elapsed > 15) {
      setSummaryDuration(elapsed);
      setShowCallSummary(true);
    }
    endCall();
  }

  function handleSaveCallMemory() {
    const mins = Math.max(1, Math.round(summaryDuration / 60));
    addLoveLetter(
      `Call with ${partner.display_name}`,
      `We talked for ${mins} minutes. Every moment with you feels like home. ❤️`,
      'deep'
    );
    setShowCallSummary(false);
  }

  function sendHeartShower(clientX?: number) {
    playSoftChime('receive');
    triggerHeartbeatHaptic();
    const xPos = clientX ? (clientX / window.innerWidth) * 80 + 10 : Math.random() * 60 + 20;
    const emojis = ['💖', '✨', '🌹', '🥰', '🤍', '🌙'];
    const chosen = emojis[Math.floor(Math.random() * emojis.length)];
    setCallHearts((h) => [...h.slice(-12), { id: Date.now() + Math.random(), x: xPos, emoji: chosen }]);
  }

  function cycleRomanticFilter() {
    const next: Record<RomanticFilter, RomanticFilter> = {
      none: 'candlelight',
      candlelight: 'moonlight',
      moonlight: 'rose',
      rose: 'none',
    };
    setRomanticFilter(next[romanticFilter]);
  }

  function getFilterCss(f: RomanticFilter) {
    switch (f) {
      case 'candlelight':
        return 'sepia(0.2) saturate(1.2) brightness(1.05) contrast(0.98) hue-rotate(-8deg)';
      case 'moonlight':
        return 'saturate(0.9) brightness(1.08) hue-rotate(15deg) contrast(1.02)';
      case 'rose':
        return 'saturate(1.25) hue-rotate(-12deg) brightness(1.04)';
      default:
        return 'none';
    }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function handleMute() {
    const next = !muted;
    setMuted(next);
    ctrlRef.current?.setAudioMuted(next);
    lkRef.current?.setMicMuted(next);
  }

  function handleCamToggle() {
    const next = !camOff;
    setCamOff(next);
    ctrlRef.current?.setVideoEnabled(!next);
    lkRef.current?.setCamEnabled(!next);
  }

  function flipCamera() {
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  }

  // Floating summary modal after call ends
  if (showCallSummary) {
    const mins = Math.max(1, Math.round(summaryDuration / 60));
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm glass rounded-[32px] p-6 text-center space-y-4 shadow-glass border border-rose-glow/30"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-love-gradient-soft border border-rose-glow/40 flex items-center justify-center text-3xl shadow-glow-pink">
            💖
          </div>
          <h3 className="text-xl font-bold bg-love-gradient bg-clip-text text-transparent">
            {mins} Minutes Together
          </h3>
          <p className="text-xs text-white/75 leading-relaxed">
            Every minute with {partner.display_name} is cherished. Save this call to your shared love memories?
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowCallSummary(false)}
              className="flex-1 py-3 rounded-2xl glass text-xs text-white/70 hover:text-white"
            >
              Dismiss
            </button>
            <button
              onClick={handleSaveCallMemory}
              className="flex-1 py-3 rounded-2xl bg-love-gradient font-semibold text-xs text-white shadow-glow-pink"
            >
              Save to Journal ✨
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!activeCall) return null;

  // Minimized Floating PiP Bubble
  if (activeCall.minimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => toggleMinimizeCall(false)}
        className="fixed bottom-24 right-4 z-50 glass-strong rounded-2xl p-2.5 flex items-center gap-3 shadow-glow-pink border border-rose-glow/50 cursor-pointer"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div className="text-xs">
          <div className="font-semibold text-white">{partner.display_name}</div>
          <div className="text-[10px] text-white/70">
            {activeCall.status === 'active' ? fmt(elapsed) : 'Ringing…'}
          </div>
        </div>
        <Maximize2 className="h-4 w-4 text-white/80" />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed inset-0 z-50 bg-ink-950 bg-midnight-radial flex flex-col justify-between pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] px-5 select-none"
      >
        {/* Full-Screen Romantic Ringing Backdrop */}
        {activeCall.status === 'ringing' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
            <div
              className="absolute inset-0 scale-125 blur-3xl"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${partner.accent_color || '#ff4d8d'}, #05020a 75%)`,
              }}
            />
          </div>
        )}

        {/* Top Controls */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full glass text-[11px] border flex items-center gap-1.5 ${
                lkConnected
                  ? 'text-emerald-300 border-emerald-400/30'
                  : 'text-rose-soft border-rose-glow/30'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${lkConnected ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
              {lkConnected ? 'HD LiveKit Connected' : 'End-to-End Encrypted'}
            </span>

            {/* Romantic Lighting Filter Pill */}
            {activeCall.status === 'active' && activeCall.kind === 'video' && (
              <button
                type="button"
                onClick={cycleRomanticFilter}
                className="px-2.5 py-1 rounded-full glass border border-rose-glow/30 text-[10px] text-white/80 flex items-center gap-1 hover:border-rose-glow"
              >
                {romanticFilter === 'candlelight' ? (
                  <Flame className="h-3 w-3 text-amber-300" />
                ) : romanticFilter === 'moonlight' ? (
                  <Moon className="h-3 w-3 text-sky-300" />
                ) : romanticFilter === 'rose' ? (
                  <Heart className="h-3 w-3 text-rose-300 fill-rose-300" />
                ) : (
                  <Sun className="h-3 w-3 text-white/60" />
                )}
                <span className="capitalize">{romanticFilter}</span>
              </button>
            )}
          </div>

          <button
            onClick={() => toggleMinimizeCall(true)}
            aria-label="Minimize call"
            className="h-10 w-10 rounded-full glass flex items-center justify-center hover:border-white/30"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Video Stage / Remote Center */}
        <div
          onClick={(e) => {
            if (activeCall.status === 'active') sendHeartShower(e.clientX);
          }}
          className="relative flex-1 my-3 rounded-[32px] overflow-hidden glass border border-white/15 flex flex-col items-center justify-center text-center p-6 cursor-pointer"
        >
          {/* Remote Video Container */}
          <div
            ref={remoteMediaRef}
            className={`absolute inset-0 transition-opacity duration-300 ${
              hasRemoteVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ filter: getFilterCss(romanticFilter) }}
          />

          {/* Fallback / Avatar Display */}
          {!hasRemoteVideo && (
            <div className="relative mb-4 flex flex-col items-center">
              {/* Heartbeat ripple circles during ringing */}
              {activeCall.status === 'ringing' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="absolute h-36 w-36 rounded-full border border-rose-glow/40 animate-ping" />
                  <span className="absolute h-48 w-48 rounded-full border border-violet-glow/30 animate-pulse" />
                </div>
              )}
              <Ambient3DOrb
                size="lg"
                pulse={activeCall.status === 'ringing'}
                center={
                  partner.avatar_path ? (
                    <img
                      src={partner.avatar_path}
                      alt={partner.display_name}
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-3xl">{partner.avatar_emoji}</span>
                  )
                }
              />
            </div>
          )}

          <h2 className="text-2xl font-bold tracking-tight text-white">{partner.display_name}</h2>
          <p className="mt-1 text-sm text-white/75 font-medium">
            {activeCall.status === 'ringing'
              ? activeCall.direction === 'incoming'
                ? `Calling your heart with ${activeCall.kind}… ✨`
                : `Calling ${partner.display_name} with love… 💖`
              : `${activeCall.kind === 'video' ? 'HD Video' : 'Whisper Voice'} • ${fmt(elapsed)}`}
          </p>

          {activeCall.status === 'active' && activeCall.kind === 'voice' && (
            <div className="mt-5 flex items-center gap-1.5 h-8">
              {[0.4, 0.75, 1, 0.6, 0.9, 0.5, 0.8, 0.4].map((weight, i) => {
                const h = muted ? 4 : Math.max(6, Math.round((8 + micLevel * 24) * weight));
                return (
                  <motion.span
                    key={i}
                    animate={{ height: h }}
                    transition={{ duration: 0.1 }}
                    className="w-1.5 rounded-full bg-love-gradient"
                  />
                );
              })}
            </div>
          )}

          {activeCall.status === 'active' && (
            <span className="mt-3 text-[10px] text-white/50 tracking-wider">
              Tap screen to shower love 💖
            </span>
          )}

          {/* Floating Shower of Hearts */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {callHearts.map((item) => (
              <motion.div
                key={item.id}
                initial={{ y: 350, opacity: 1, scale: 0.7 }}
                animate={{ y: -260, opacity: 0, scale: 1.5 }}
                transition={{ duration: 2.2, ease: 'easeOut' }}
                style={{ left: `${item.x}%` }}
                className="absolute bottom-6 text-3xl"
              >
                {item.emoji}
              </motion.div>
            ))}
          </div>

          {mediaErr && (
            <p className="mt-3 text-xs text-rose-300 bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30">
              {mediaErr}
            </p>
          )}

          {/* Local Camera Tile with Double-Tap Flip */}
          {activeCall.kind === 'video' && (
            <div
              onDoubleClick={flipCamera}
              title="Double-tap to flip camera, tap to change filter"
              className="absolute bottom-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-glass bg-ink-900/90 flex flex-col items-center justify-center cursor-pointer"
            >
              {!camOff && hasLocalVideo && !mediaErr ? (
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
                    style={{ filter: getFilterCss(romanticFilter) }}
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[8px] text-white/90 flex items-center gap-1">
                    <Sparkles className="h-2 w-2 text-rose-glow" /> 2x tap flip
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                  <VideoOff className="h-5 w-5 text-white/50" />
                  <span className="text-[10px] text-white/50">{camOff ? 'Cam Off' : 'No Video'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="pb-3 flex items-center justify-center gap-4 z-10">
          {activeCall.direction === 'incoming' && activeCall.status === 'ringing' ? (
            <div className="w-full flex items-center justify-around px-8">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={declineCall}
                aria-label="Decline call"
                className="h-16 w-16 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-glow-pink ring-pulse-anim"
              >
                <PhoneOff className="h-7 w-7" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                aria-label="Accept call"
                className="h-18 w-18 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-pulse-anim p-4"
              >
                {activeCall.kind === 'video' ? <Video className="h-8 w-8" /> : <Phone className="h-8 w-8" />}
              </motion.button>
            </div>
          ) : (
            <>
              <button
                onClick={handleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                  muted ? 'bg-white text-ink-950 shadow-md' : 'glass text-white hover:border-white/30'
                }`}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {activeCall.kind === 'video' && (
                <>
                  <button
                    onClick={handleCamToggle}
                    aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}
                    className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                      camOff ? 'bg-white text-ink-950 shadow-md' : 'glass text-white hover:border-white/30'
                    }`}
                  >
                    {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={flipCamera}
                    aria-label="Switch camera"
                    className="h-12 w-12 rounded-full glass text-white flex items-center justify-center hover:border-white/30"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </>
              )}

              <button
                onClick={() => setSpeaker((s) => !s)}
                aria-label="Toggle speaker"
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                  speaker ? 'glass text-rose-glow border-rose-glow/40' : 'glass text-white/60'
                }`}
              >
                {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>

              {activeCall.status === 'active' && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => sendHeartShower()}
                  aria-label="Send heart kiss"
                  className="h-12 w-12 rounded-full glass text-rose-glow flex items-center justify-center hover:border-rose-glow shadow-glow-pink"
                >
                  <Heart className="h-5 w-5 fill-rose-glow" />
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleEndCallWithSummary}
                aria-label="End call"
                className="h-14 w-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-glow-pink"
              >
                <PhoneOff className="h-6 w-6" />
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
