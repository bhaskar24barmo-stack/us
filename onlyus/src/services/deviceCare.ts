import { Device } from '@capacitor/device';
import { supabase } from '@/lib/supabase';

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

export async function publishMyBatteryStatus(myUserId: string): Promise<void> {
  if (!supabase) return;
  try {
    const status = await getDeviceCareStatus();
    await supabase.from('user_presence').upsert(
      {
        user_id: myUserId,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        battery_level: status.batteryPercent,
        is_charging: status.isCharging,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('Failed to publish device care status:', err);
  }
}

export async function fetchPartnerBatteryStatus(
  partnerUserId: string
): Promise<{ battery: number | null; charging: boolean; online: boolean }> {
  if (!supabase) return { battery: null, charging: false, online: false };
  try {
    const { data } = await supabase
      .from('user_presence')
      .select('battery_level, is_charging, is_online')
      .eq('user_id', partnerUserId)
      .maybeSingle();

    if (data) {
      return {
        battery: data.battery_level ?? null,
        charging: Boolean(data.is_charging),
        online: Boolean(data.is_online),
      };
    }
  } catch (err) {
    console.warn('Failed to fetch partner care status:', err);
  }
  return { battery: null, charging: false, online: false };
}
