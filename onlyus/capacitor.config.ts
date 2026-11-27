import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onlyus.app',
  appName: 'ONLYUS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#0b0614',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0614',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_round',
      iconColor: '#ff4d8d',
      sound: 'default',
    },
  },
};

export default config;
