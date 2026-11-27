import { Device } from '@capacitor/device';

export interface PartnerCareStatus {
  batteryPercent: number | null;
  isCharging: boolean;
  timeString: string;
}

export async function getDeviceCareStatus(): Promise<PartnerCareStatus> {
  let batteryPercent: number | null = null;
  let isCharging = false;

  try {
    const info = await Device.getBatteryInfo();
    if (info.batteryLevel !== undefined) {
      batteryPercent = Math.round(info.batteryLevel * 100);
      isCharging = Boolean(info.isCharging);
    }
  } catch {
    // Web fallback
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const b = await (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
        batteryPercent = Math.round(b.level * 100);
        isCharging = b.charging;
      } catch {
        // Ignore
      }
    }
  }

  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return { batteryPercent, isCharging, timeString };
}
