import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homeflix.app',
  appName: 'Homeflix',
  webDir: 'dist',
  backgroundColor: '#0F0F0F',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    preferredContentMode: 'mobile',
    contentInset: 'automatic',
    backgroundColor: '#0F0F0F',
    scheme: 'Homeflix',
    limitsNavigationsToAppBoundDomains: false,
    handleApplicationURL: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Filesystem: {},
    Network: {},
  },
};

export default config;
