import { Room, RoomEvent, Track } from 'livekit-client';
import type { CallKind } from '@/types/models';

export interface LiveKitConfig {
  url: string | null;
  tokenEndpoint: string | null;
  configured: boolean;
}

export interface LiveKitRoomStatus {
  mode: 'simulated' | 'livekit';
  roomName: string;
  connectionState: 'disconnected' | 'connecting' | 'connected';
}

export function getLiveKitConfig(): LiveKitConfig {
  const url = (import.meta.env.VITE_LIVEKIT_URL as string | undefined) || null;
  const tokenEndpoint =
    (import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT as string | undefined) ||
    (url ? '/api/livekit-token' : null);
  return {
    url,
    tokenEndpoint,
    configured: Boolean(url && tokenEndpoint),
  };
}

/**
 * Real LiveKit HD calling adapter using `livekit-client` + `/api/livekit-token`.
 */
export class LiveKitCallAdapter {
  private roomName: string;
  private room: Room | null = null;
  private state: LiveKitRoomStatus['connectionState'] = 'disconnected';
  private attachedEls: HTMLMediaElement[] = [];

  constructor(roomName = 'onlyus-private-room') {
    this.roomName = roomName;
  }

  getStatus(): LiveKitRoomStatus {
    const { configured } = getLiveKitConfig();
    return {
      mode: configured ? 'livekit' : 'simulated',
      roomName: this.roomName,
      connectionState: this.state,
    };
  }

  async connect(
    kind: CallKind,
    identity: string,
    onRemoteVideo?: (el: HTMLMediaElement | null) => void
  ): Promise<LiveKitRoomStatus> {
    const cfg = getLiveKitConfig();
    if (!cfg.configured || !cfg.url || !cfg.tokenEndpoint) {
      this.state = 'connected';
      return this.getStatus();
    }

    this.state = 'connecting';
    try {
      const res = await fetch(
        `${cfg.tokenEndpoint}?room=${encodeURIComponent(this.roomName)}&identity=${encodeURIComponent(identity)}`
      );
      if (!res.ok) throw new Error('Token fetch failed');
      const data = (await res.json()) as { token?: string; url?: string };
      if (!data.token) throw new Error('Missing LiveKit token');

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        const el = track.attach();
        this.attachedEls.push(el);
        if (track.kind === Track.Kind.Video) {
          onRemoteVideo?.(el);
        } else if (track.kind === Track.Kind.Audio) {
          el.style.display = 'none';
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        if (track.kind === Track.Kind.Video) onRemoteVideo?.(null);
      });

      await room.connect(data.url || cfg.url, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      if (kind === 'video') {
        await room.localParticipant.setCameraEnabled(true);
      }
      this.state = 'connected';
    } catch {
      this.state = 'disconnected';
    }
    return this.getStatus();
  }

  setMicMuted(muted: boolean): void {
    void this.room?.localParticipant.setMicrophoneEnabled(!muted);
  }

  setCamEnabled(enabled: boolean): void {
    void this.room?.localParticipant.setCameraEnabled(enabled);
  }

  disconnect(): void {
    this.attachedEls.forEach((el) => el.remove());
    this.attachedEls = [];
    void this.room?.disconnect();
    this.room = null;
    this.state = 'disconnected';
  }
}
