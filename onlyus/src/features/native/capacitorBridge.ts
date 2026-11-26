import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { realtimeManager } from '@/services/realtimeManager';

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export interface AppVersionInfo {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string;
  mandatory?: boolean;
}

export async function initNativeShell(onBackNavigate?: () => boolean): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b0614' });
  } catch {
    // Ignore on unsupported devices
  }

  const stateHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void realtimeManager.resyncAndGapFill();
    }
  });

  const backHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
    if (onBackNavigate?.()) return;
    if (canGoBack) {
      window.history.back();
    } else {
      void CapApp.minimizeApp();
    }
  });

  return () => {
    void stateHandle.remove();
    void backHandle.remove();
  };
}

export async function registerAndroidFcmPush(
  onToken: (token: string) => void
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return false;

  await PushNotifications.addListener('registration', (token) => {
    onToken(token.value);
  });
  await PushNotifications.register();
  return true;
}

export async function checkForAppUpdate(
  currentVersionCode: number,
  versionUrl = '/version.json'
): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(versionUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const info = (await res.json()) as AppVersionInfo;
    if (info.versionCode > currentVersionCode) return info;
    return null;
  } catch {
    return null;
  }
}
