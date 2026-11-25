import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Crop,
  Eraser,
  Grid3X3,
  Heart,
  ImagePlus,
  PenTool,
  RefreshCw,
  RotateCw,
  Send,
  Sparkles,
  Square,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

const FILTERS = [
  { name: 'Normal', css: 'none' },
  { name: 'Rose Glow', css: 'saturate(1.25) hue-rotate(-10deg) contrast(1.05)' },
  { name: 'Midnight Neon', css: 'contrast(1.18) saturate(1.35) hue-rotate(15deg)' },
  { name: 'Warm Love', css: 'sepia(0.28) saturate(1.3) brightness(1.04)' },
  { name: 'Vintage', css: 'sepia(0.45) contrast(0.95) brightness(0.95)' },
  { name: 'B&W', css: 'grayscale(1) contrast(1.15)' },
];

export default function CameraPage() {
  const navigate = useNavigate();
  const { sendMessage, addMemory } = useAppStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [camStatus, setCamStatus] = useState<'loading' | 'ready' | 'denied'>('loading');
  const [camError, setCamError] = useState<string | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState<1 | 1.5 | 2>(1);

  // Preview editor state
  const [preview, setPreview] = useState<{
    type: 'image' | 'video';
    url: string;
    isObjectUrl: boolean;
  } | null>(null);
  const [caption, setCaption] = useState('');
  const [filterIdx, setFilterIdx] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [squareCrop, setSquareCrop] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ff4d8d');
  const isDrawingRef = useRef(false);

  async function initCamera(mode: 'user' | 'environment') {
    setCamStatus('loading');
    setCamError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamStatus('denied');
      setCamError('Camera API is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamStatus('ready');
    } catch (err) {
      setCamStatus('denied');
      setCamError(
        err instanceof Error
          ? err.message
          : 'Camera access was denied. You can still upload a photo or video from your gallery.'
      );
    }
  }

  useEffect(() => {
    void initCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  async function toggleFlash() {
    const next = !flashOn;
    setFlashOn(next);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: next } as MediaTrackConstraintSet],
        });
      } catch {
        // Torch not supported on this device/browser
      }
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || camStatus !== 'ready') return;
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 180);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreview({ type: 'image', url, isObjectUrl: true });
    }, 'image/jpeg', 0.92);
  }

  function toggleVideoRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!streamRef.current || typeof MediaRecorder === 'undefined') return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreview({ type: 'video', url, isObjectUrl: true });
      setRecSeconds(0);
    };
    rec.start();
    setRecording(true);
  }

  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({
      type: file.type.startsWith('video/') ? 'video' : 'image',
      url,
      isObjectUrl: true,
    });
    e.target.value = '';
  }

  function clearPreview() {
    if (preview?.isObjectUrl) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setCaption('');
    setFilterIdx(0);
    setRotation(0);
    setSquareCrop(false);
    setDrawMode(false);
  }

  // Drawing handlers
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawMode) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawMode || !isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
    ctx.stroke();
  }

  function endDraw() {
    isDrawingRef.current = false;
  }

  function clearDrawing() {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleSendSnap(saveToMemories = false) {
    if (!preview) return;
    sendMessage({
      kind: preview.type,
      body: caption.trim() || null,
      media: {
        id: `snap-${Date.now()}`,
        type: preview.type,
        url: preview.url,
        caption: caption.trim() || undefined,
        filter: FILTERS[filterIdx].name,
        isObjectUrl: preview.isObjectUrl,
      },
    });
    if (saveToMemories && preview.type === 'image') {
      addMemory({
        title: caption.trim() || 'Captured Moment',
        date: new Date().toISOString().slice(0, 10),
        note: caption.trim() || 'Shot with ONLYUS Camera',
        image_url: preview.url,
        favorite: true,
      });
    }
    setPreview(null);
    setCaption('');
    navigate('/chats');
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleGalleryUpload}
        className="hidden"
      />

      {!preview ? (
        <>
          {/* Live Camera Viewfinder */}
          <div className="relative flex-1 overflow-hidden rounded-b-[32px] bg-ink-950">
            {camStatus === 'ready' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover transition-transform duration-200"
                style={{
                  filter: FILTERS[filterIdx].css,
                  transform: `${facingMode === 'user' ? 'scaleX(-1) ' : ''}scale(${zoom})`,
                }}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-midnight-radial">
                <div className="h-16 w-16 rounded-2xl glass flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-rose-glow" />
                </div>
                <h2 className="text-lg font-semibold">
                  {camStatus === 'loading' ? 'Starting Camera…' : 'Camera Unavailable'}
                </h2>
                <p className="mt-2 text-xs text-white/65 max-w-xs">
                  {camError || 'Allow camera and microphone access to capture snaps and videos.'}
                </p>
                {camStatus === 'denied' && (
                  <div className="mt-5 flex gap-2.5">
                    <button
                      onClick={() => initCamera(facingMode)}
                      className="px-4 py-2.5 rounded-2xl glass text-xs font-medium flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center gap-1.5 shadow-glow-pink"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Upload from Gallery
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rule-of-Thirds Grid Overlay */}
            {showGrid && camStatus === 'ready' && (
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="border border-white/15" />
                ))}
              </div>
            )}

            {/* Shutter Flash */}
            <AnimatePresence>
              {shutterFlash && (
                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-white pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Top Controls */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <button
                onClick={() => navigate('/chats')}
                aria-label="Back to chats"
                className="h-10 w-10 rounded-full glass-strong flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>

              {recording && (
                <div className="px-3 py-1 rounded-full bg-rose-600/90 text-xs font-mono flex items-center gap-1.5 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  0:{String(recSeconds).padStart(2, '0')}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setZoom((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1))}
                  aria-label="Cycle camera zoom"
                  className="h-10 px-2.5 rounded-full glass-strong flex items-center justify-center text-xs font-semibold text-white/90"
                >
                  {zoom}x
                </button>
                <button
                  onClick={() => setShowGrid((g) => !g)}
                  aria-label="Toggle grid overlay"
                  className={`h-10 w-10 rounded-full glass-strong flex items-center justify-center ${
                    showGrid ? 'text-rose-glow border-rose-glow/50' : 'text-white/80'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleFlash}
                  aria-label="Toggle flash"
                  className={`h-10 w-10 rounded-full glass-strong flex items-center justify-center ${
                    flashOn ? 'text-amber-300 border-amber-300/50' : 'text-white/80'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                  aria-label="Switch camera"
                  className="h-10 w-10 rounded-full glass-strong flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bottom Filter Strip & Shutter */}
            <div className="absolute bottom-6 inset-x-0 px-4 space-y-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar justify-start sm:justify-center px-1">
                {FILTERS.map((f, idx) => (
                  <button
                    key={f.name}
                    onClick={() => setFilterIdx(idx)}
                    className={`shrink-0 px-3 py-1 rounded-full text-[11px] backdrop-blur-md transition-all ${
                      filterIdx === idx
                        ? 'bg-love-gradient text-white shadow-glow-pink'
                        : 'bg-black/45 text-white/75 border border-white/15'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-around">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Gallery upload"
                  className="h-12 w-12 rounded-2xl glass-strong flex items-center justify-center"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={capturePhoto}
                  disabled={camStatus !== 'ready' || recording}
                  aria-label="Take photo"
                  className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center bg-white/15 disabled:opacity-40 shadow-glow-pink"
                >
                  <div className="h-14 w-14 rounded-full bg-love-gradient" />
                </motion.button>

                <button
                  onClick={toggleVideoRecording}
                  disabled={camStatus !== 'ready'}
                  aria-label={recording ? 'Stop video recording' : 'Record video'}
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center disabled:opacity-40 ${
                    recording ? 'bg-rose-600 text-white shadow-glow-pink' : 'glass-strong text-white'
                  }`}
                >
                  {recording ? <Square className="h-5 w-5 fill-white" /> : <Video className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Preview & Creative Editor */
        <div className="relative flex-1 flex flex-col bg-ink-950">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden p-3">
            <div
              className={`relative overflow-hidden rounded-3xl border border-white/15 ${
                squareCrop ? 'aspect-square w-full max-w-sm' : 'h-full w-full max-w-md'
              }`}
            >
              {preview.type === 'image' ? (
                <img
                  src={preview.url}
                  alt="Preview"
                  className="h-full w-full object-cover transition-transform"
                  style={{
                    filter: FILTERS[filterIdx].css,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />
              ) : (
                <video
                  src={preview.url}
                  controls
                  autoPlay
                  loop
                  className="h-full w-full object-cover"
                  style={{
                    filter: FILTERS[filterIdx].css,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />
              )}

              {/* Drawing Canvas Overlay */}
              <canvas
                ref={drawCanvasRef}
                width={400}
                height={600}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className={`absolute inset-0 h-full w-full touch-none ${
                  drawMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
                }`}
              />
            </div>

            {/* Editor Top Bar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between">
              <button
                onClick={clearPreview}
                aria-label="Discard"
                className="h-10 w-10 rounded-full glass-strong flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Rotate"
                  className="h-10 w-10 rounded-full glass-strong flex items-center justify-center"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSquareCrop((c) => !c)}
                  aria-label="Toggle crop"
                  className={`h-10 w-10 rounded-full glass-strong flex items-center justify-center ${
                    squareCrop ? 'text-rose-glow' : ''
                  }`}
                >
                  <Crop className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDrawMode((d) => !d)}
                  aria-label="Toggle drawing"
                  className={`h-10 w-10 rounded-full glass-strong flex items-center justify-center ${
                    drawMode ? 'bg-rose-glow text-white' : ''
                  }`}
                >
                  <PenTool className="h-4 w-4" />
                </button>
                {drawMode && (
                  <button
                    onClick={clearDrawing}
                    aria-label="Clear drawing"
                    className="h-10 w-10 rounded-full glass-strong flex items-center justify-center"
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Drawing Colors + Caption + Send */}
          <div className="p-3 space-y-2.5 glass-strong border-t border-white/10">
            {drawMode && (
              <div className="flex items-center gap-2 justify-center">
                {['#ff4d8d', '#8b5cf6', '#ffffff', '#fbbf24', '#34d399'].map((col) => (
                  <button
                    key={col}
                    onClick={() => setDrawColor(col)}
                    style={{ backgroundColor: col }}
                    className={`h-6 w-6 rounded-full border-2 ${
                      drawColor === col ? 'border-white scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map((f, idx) => (
                <button
                  key={f.name}
                  onClick={() => setFilterIdx(idx)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] ${
                    filterIdx === idx ? 'bg-love-gradient text-white' : 'glass text-white/70'
                  }`}
                >
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  {f.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption…"
                className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm outline-none focus:border-rose-glow"
              />
              {preview.type === 'image' && (
                <button
                  onClick={() => handleSendSnap(true)}
                  aria-label="Send and save to memories"
                  title="Send & Save to Memories"
                  className="h-11 px-3 rounded-2xl glass flex items-center gap-1.5 text-xs text-rose-soft"
                >
                  <Heart className="h-4 w-4 fill-rose-glow text-rose-glow" /> Save
                </button>
              )}
              <button
                onClick={() => handleSendSnap(false)}
                className="h-11 px-4 rounded-2xl bg-love-gradient text-white font-semibold text-sm flex items-center gap-1.5 shadow-glow-pink"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
