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
  const tokenEndpoint = (import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT as string | undefined) || null;
  return {
    url,
    tokenEndpoint,
    configured: Boolean(url && tokenEndpoint),
  };
}

/**
 * LiveKit-ready call adapter.
 * In Prototype Mode (when VITE_LIVEKIT_URL is unset), calls run locally using
 * getUserMedia + Simulated Remote Caller Mode. When LiveKit credentials are
 * configured, install `livekit-client` and swap the connect/publish hooks here.
 */
export class LiveKitCallAdapter {
  private roomName: string;
  private state: LiveKitRoomStatus['connectionState'] = 'disconnected';

  constructor(conversationId = 'onlyus-private-room') {
    this.roomName = conversationId;
  }

  getStatus(): LiveKitRoomStatus {
    const { configured } = getLiveKitConfig();
    return {
      mode: configured ? 'livekit' : 'simulated',
      roomName: this.roomName,
      connectionState: this.state,
    };
  }

  async connect(kind: CallKind): Promise<LiveKitRoomStatus> {
    const cfg = getLiveKitConfig();
    if (!cfg.configured) {
      this.state = 'connected';
      return this.getStatus();
    }

    this.state = 'connecting';
    // Production hook: fetch LiveKit JWT from cfg.tokenEndpoint and call room.connect(cfg.url, token)
    void kind;
    this.state = 'connected';
    return this.getStatus();
  }

  disconnect(): void {
    this.state = 'disconnected';
  }
}
