import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thelightcome.mathboxes',
  appName: 'Math Boxes',
  webDir: 'docs',
  server: {
    androidScheme: 'https',
    // The app is served from `https://<hostname>`, and that string is the web
    // origin everything inside the webview belongs to — including any service
    // worker registration.
    //
    // Builds before this one shipped the PWA's worker inside the APK. On the
    // default `localhost` it installed, precached the app and answered every
    // launch out of Cache Storage. Cache Storage is app data: installing a new
    // APK over the top keeps it, so those devices went on opening the build the
    // worker had cached no matter how current the package was, and only a full
    // uninstall cleared it.
    //
    // Moving the host moves the origin. A worker registered on
    // `https://localhost` has no authority over `https://mathboxes.local` and
    // cannot intercept a single request, so every poisoned install heals on its
    // next launch without anyone having to uninstall anything. Nothing is lost
    // with the old origin: the game keeps its records in Capacitor Preferences,
    // which is native storage, and uses no web storage at all.
    hostname: 'mathboxes.local'
  }
};

export default config;
