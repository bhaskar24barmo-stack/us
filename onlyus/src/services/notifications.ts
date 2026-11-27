import { Haptics, ImpactStyle } from '@capacitor/haptics';

let sharedNotifCtx: AudioContext | null = null;

function getNotifAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedNotifCtx) sharedNotifCtx = new AudioCtx();
  if (sharedNotifCtx.state === 'suspended') void sharedNotifCtx.resume().catch(() => {});
  return sharedNotifCtx;
}

export type ChimeKind = 'send' | 'receive' | 'ring' | 'heartbeat' | 'harp' | 'musicbox' | 'whisper';

export function playSoftChime(type: ChimeKind = 'receive') {
  try {
    const ctx = getNotifAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'send') {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'receive' || type === 'harp') {
      // Warm 432Hz romantic harp chime
      osc.frequency.setValueAtTime(432, now);
      osc.frequency.setValueAtTime(648, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(864, now + 0.18);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'musicbox') {
      // High sweet music box harmonic
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.07);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'heartbeat') {
      // Deep double-thump pulse (70Hz -> 55Hz)
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      osc.frequency.setValueAtTime(70, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      gain.gain.setValueAtTime(0.1, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'whisper') {
      // Gentle soft droplet
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Ring
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.14);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  } catch {
    // Ignore audio restrictions
  }
}

export async function triggerHeartbeatHaptic() {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
    setTimeout(async () => {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Fallback
      }
    }, 140);
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 100, 60]);
    }
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function triggerBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      tag: 'onlyus-local-notif',
    });
  } catch {
    // Fallback for mobile browsers requiring service worker registration
  }
}
