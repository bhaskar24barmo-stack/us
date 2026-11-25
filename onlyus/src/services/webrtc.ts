/**
 * WebRTC-ready calling service.
 * Provides real local MediaStream acquisition (camera + microphone) and an
 * RTCPeerConnection scaffold ready to be wired to Supabase Realtime signaling.
 * In prototype mode without a remote peer, calls clearly run in Simulated Remote Caller mode.
 */

export interface SignalingAdapter {
  sendOffer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  sendAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  sendIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export class CallSessionController {
  private pc: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;

  async startLocalMedia(kind: 'voice' | 'video', facingMode: 'user' | 'environment' = 'user'): Promise<{
    stream: MediaStream | null;
    error: string | null;
  }> {
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

  createPeerConnection(signaling?: SignalingAdapter): RTCPeerConnection {
    this.pc = new RTCPeerConnection(ICE_SERVERS);
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
