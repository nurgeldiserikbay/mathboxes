import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thelightcome.mathpuzzle',
  appName: 'Math Puzzle',
  webDir: 'docs',
  server: {
    androidScheme: 'https'
  }
};

export default config;
