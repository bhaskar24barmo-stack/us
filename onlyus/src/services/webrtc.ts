import { supabase } from '@/lib/supabase';

/**
 * WebRTC calling service with Supabase Realtime signaling & configurable STUN/TURN.
 * TURN credentials are read from environment variables (VITE_TURN_URL, VITE_TURN_USERNAME,
 * VITE_TURN_CREDENTIAL) and are never hardcoded.
 */

export interface SignalingAdapter {
  sendOffer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  sendAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  sendIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  sendHangup?: (reason?: string) => Promise<void>;
}

export function getIceConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUser = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (turnUrl && turnUser && turnCred) {
    iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return { iceServers };
}

export function createSupabaseSignaling(
  conversationId: string,
  userId: string,
  handlers: {
    onOffer: (sdp: RTCSessionDescriptionInit) => void;
    onAnswer: (sdp: RTCSessionDescriptionInit) => void;
    onIceCandidate: (candidate: RTCIceCandidateInit) => void;
    onHangup: (reason?: string) => void;
  }
): { adapter: SignalingAdapter; dispose: () => void } {
  const ch = supabase?.channel(`onlyus-webrtc-${conversationId}`) ?? null;

  if (ch) {
    ch.on('broadcast', { event: 'webrtc' }, ({ payload }) => {
      const p = payload as {
        senderId?: string;
        type?: 'offer' | 'answer' | 'ice' | 'hangup';
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
        reason?: string;
      };
      if (!p || p.senderId === userId) return;
      if (p.type === 'offer' && p.sdp) handlers.onOffer(p.sdp);
      else if (p.type === 'answer' && p.sdp) handlers.onAnswer(p.sdp);
      else if (p.type === 'ice' && p.candidate) handlers.onIceCandidate(p.candidate);
      else if (p.type === 'hangup') handlers.onHangup(p.reason);
    }).subscribe();
  }

  const send = async (body: Record<string, unknown>) => {
    if (!ch) return;
    await ch.send({ type: 'broadcast', event: 'webrtc', payload: { senderId: userId, ...body } });
  };

  return {
    adapter: {
      sendOffer: (sdp) => send({ type: 'offer', sdp }),
      sendAnswer: (sdp) => send({ type: 'answer', sdp }),
      sendIceCandidate: (candidate) => send({ type: 'ice', candidate }),
      sendHangup: (reason) => send({ type: 'hangup', reason }),
    },
    dispose: () => {
      if (ch && supabase) void supabase.removeChannel(ch);
    },
  };
}

export class CallSessionController {
  private pc: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;

  async startLocalMedia(
    kind: 'voice' | 'video',
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<{ stream: MediaStream | null; error: string | null }> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { stream: null, error: 'Media devices API is not supported in this browser.' };
    }
    try {
      this.stopLocalMedia();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video' ? { facingMode } : false,
      });
      this.localStream = stream;
      return { stream, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera or microphone permission denied.';
      return { stream: null, error: msg };
    }
  }

  createPeerConnection(
    signaling?: SignalingAdapter,
    onStateChange?: (state: RTCPeerConnectionState) => void
  ): RTCPeerConnection {
    this.pc = new RTCPeerConnection(getIceConfiguration());
    this.remoteStream = new MediaStream();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, this.localStream!);
      });
    }

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate && signaling) {
        void signaling.sendIceCandidate(event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      onStateChange?.(this.pc.connectionState);
      if (this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') {
        this.pc.restartIce();
      }
    };

    return this.pc;
  }

  setAudioMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  stopLocalMedia() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  dispose() {
    this.stopLocalMedia();
    this.pc?.close();
    this.pc = null;
    this.remoteStream = null;
  }
}
