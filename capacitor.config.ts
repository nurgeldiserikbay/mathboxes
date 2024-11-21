import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thelightcome.mathshelf',
  appName: 'Math Shelf',
  webDir: 'docs',
  server: {
    androidScheme: 'https'
  }
};

export default config;
