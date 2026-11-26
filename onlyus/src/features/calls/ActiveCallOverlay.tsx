import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  RefreshCw,
  Sparkles,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Ambient3DOrb from '@/components/Ambient3DOrb';
import { LiveKitCallAdapter } from '@/services/livekit';
import { CallSessionController } from '@/services/webrtc';
import { useAppStore } from '@/stores/useAppStore';

export default function ActiveCallOverlay() {
  const { activeCall, currentUserRole, pairCode, profiles, acceptCall, declineCall, endCall, toggleMinimizeCall } =
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
  const [callHearts, setCallHearts] = useState<number[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [pipFilter, setPipFilter] = useState<'none' | 'rose' | 'soft'>('none');

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
          el.className = 'h-full w-full object-cover';
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

      // Live Web Audio API mic level meter
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
          // Ignore audio context restriction
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

  if (!activeCall) return null;

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

  if (activeCall.minimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => toggleMinimizeCall(false)}
        className="fixed bottom-24 right-4 z-50 glass-strong rounded-2xl px-3.5 py-2.5 flex items-center gap-3 shadow-glow-pink border border-rose-glow/40 cursor-pointer"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div className="text-xs">
          <div className="font-semibold">{partner.display_name}</div>
          <div className="text-[10px] text-white/65">
            {activeCall.status === 'active' ? fmt(elapsed) : 'Ringing…'}
          </div>
        </div>
        <Maximize2 className="h-4 w-4 text-white/70" />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed inset-0 z-50 bg-ink-950 bg-midnight-radial flex flex-col justify-between p-6"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between z-10">
          <span
            className={`px-3 py-1 rounded-full glass text-[11px] border ${
              lkConnected
                ? 'text-emerald-300 border-emerald-400/30'
                : 'text-rose-soft border-rose-glow/30'
            }`}
          >
            {lkConnected ? 'LiveKit HD Connected' : 'End-to-End Encrypted Ring'}
          </span>
          <button
            onClick={() => toggleMinimizeCall(true)}
            aria-label="Minimize call"
            className="h-10 w-10 rounded-full glass flex items-center justify-center"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Center / Remote Video */}
        <div className="relative flex-1 my-4 rounded-[32px] overflow-hidden glass border border-white/15 flex flex-col items-center justify-center text-center p-6">
          <div
            ref={remoteMediaRef}
            className={`absolute inset-0 ${hasRemoteVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          />
          {!hasRemoteVideo && (
            <div className="mb-4">
              <Ambient3DOrb
                size="lg"
                pulse={activeCall.status === 'ringing'}
                center={
                  partner.avatar_path ? (
                    <img src={partner.avatar_path} alt={partner.display_name} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <span>{partner.avatar_emoji}</span>
                  )
                }
              />
            </div>
          )}

          <h2 className="text-2xl font-bold">{partner.display_name}</h2>
          <p className="mt-1.5 text-sm text-white/70">
            {activeCall.status === 'ringing'
              ? activeCall.direction === 'incoming'
                ? `Incoming ${activeCall.kind} call…`
                : 'Calling…'
              : `${activeCall.kind === 'video' ? 'Video' : 'Voice'} • ${fmt(elapsed)}`}
          </p>

          {activeCall.status === 'active' && (
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] text-emerald-300">
              HD Audio • LiveKit-Ready
            </div>
          )}

          {activeCall.status === 'active' && activeCall.kind === 'voice' && (
            <div className="mt-5 flex items-center gap-1.5 h-7">
              {[0.5, 0.85, 1, 0.7, 0.95, 0.6, 0.45].map((weight, i) => {
                const h = muted ? 4 : Math.max(6, Math.round((8 + micLevel * 22) * weight));
                return (
                  <motion.span
                    key={i}
                    animate={{ height: h }}
                    transition={{ duration: 0.12 }}
                    className="w-1.5 rounded-full bg-love-gradient"
                  />
                );
              })}
            </div>
          )}

          {activeCall.status === 'active' && activeCall.kind === 'video' && (
            <span className="mt-3 px-3 py-1 rounded-full glass text-[11px] text-white/60">
              Remote video awaits LiveKit room connection
            </span>
          )}

          {/* Floating In-Call Hearts */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {callHearts.map((id) => (
              <motion.div
                key={id}
                initial={{ y: 260, opacity: 0.95, scale: 0.7 }}
                animate={{ y: -220, opacity: 0, scale: 1.35 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 text-3xl"
              >
                💖
              </motion.div>
            ))}
          </div>

          {mediaErr && (
            <p className="mt-3 text-xs text-rose-300 bg-rose-500/15 px-3 py-1.5 rounded-xl border border-rose-500/30">
              {mediaErr}
            </p>
          )}

          {/* Local Camera Preview PiP for Video Call */}
          {activeCall.kind === 'video' && (
            <div
              onClick={() => setPipFilter((f) => (f === 'none' ? 'rose' : f === 'rose' ? 'soft' : 'none'))}
              title="Tap to cycle video filter"
              className="absolute bottom-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/25 shadow-glass bg-ink-900/90 flex flex-col items-center justify-center cursor-pointer"
            >
              {!camOff && hasLocalVideo && !mediaErr ? (
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
                    style={{
                      filter:
                        pipFilter === 'rose'
                          ? 'saturate(1.25) hue-rotate(-10deg)'
                          : pipFilter === 'soft'
                          ? 'brightness(1.08) contrast(0.95)'
                          : 'none',
                    }}
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/55 text-[9px] text-white/90 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> {pipFilter}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                  <VideoOff className="h-5 w-5 text-white/55" />
                  <span className="text-[10px] text-white/55 leading-tight">
                    {camOff ? 'Camera off' : 'No local cam'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="pb-4 flex items-center justify-center gap-5 z-10">
          {activeCall.direction === 'incoming' && activeCall.status === 'ringing' ? (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={declineCall}
                aria-label="Decline call"
                className="h-16 w-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-glow-pink ring-pulse-anim"
              >
                <PhoneOff className="h-7 w-7" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                aria-label="Accept call"
                className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-pulse-anim"
              >
                {activeCall.kind === 'video' ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
              </motion.button>
            </>
          ) : (
            <>
              <button
                onClick={handleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  muted ? 'bg-white text-ink-950' : 'glass text-white'
                }`}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {activeCall.kind === 'video' && (
                <>
                  <button
                    onClick={handleCamToggle}
                    aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      camOff ? 'bg-white text-ink-950' : 'glass text-white'
                    }`}
                  >
                    {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                    aria-label="Switch camera"
                    className="h-12 w-12 rounded-full glass text-white flex items-center justify-center"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </>
              )}

              <button
                onClick={() => setSpeaker((s) => !s)}
                aria-label="Toggle speaker"
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  speaker ? 'glass text-rose-glow' : 'glass text-white/60'
                }`}
              >
                {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>

              {activeCall.status === 'active' && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setCallHearts((h) => [...h.slice(-8), Date.now()])}
                  aria-label="Send call heart"
                  className="h-12 w-12 rounded-full glass text-rose-glow flex items-center justify-center"
                >
                  <Heart className="h-5 w-5 fill-rose-glow" />
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
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
